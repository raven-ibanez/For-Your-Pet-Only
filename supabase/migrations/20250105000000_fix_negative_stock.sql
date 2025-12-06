-- =====================================================
-- FIX NEGATIVE STOCK ISSUE
-- =====================================================
-- This migration fixes the issue where inventory stock
-- can go negative, causing display issues in the UI.
-- =====================================================

-- Step 1: Fix existing negative stock values (set to 0)
UPDATE inventory
SET 
  current_stock = 0,
  is_out_of_stock = true,
  is_low_stock = true,
  last_stock_update = NOW()
WHERE current_stock < 0;

-- Step 2: Update the trigger function to prevent negative stock
CREATE OR REPLACE FUNCTION update_inventory_on_order()
RETURNS trigger AS $$
DECLARE
  inv_record RECORD;
  v_current_stock integer;
  v_new_stock integer;
BEGIN
  -- Only process if order is completed and not already processed
  IF NEW.order_status = 'completed' AND (OLD.order_status IS NULL OR OLD.order_status != 'completed') THEN
    
    -- Update inventory for each order item
    FOR inv_record IN 
      SELECT oi.menu_item_id, oi.quantity
      FROM order_items oi
      WHERE oi.order_id = NEW.id AND oi.affects_inventory = true
    LOOP
      -- Get current stock first
      SELECT current_stock INTO v_current_stock
      FROM inventory
      WHERE menu_item_id = inv_record.menu_item_id;
      
      -- Calculate new stock (prevent negative)
      v_new_stock := GREATEST(0, v_current_stock - inv_record.quantity);
      
      -- Update inventory stock (with negative protection)
      UPDATE inventory
      SET 
        current_stock = v_new_stock,
        last_stock_update = NOW(),
        is_low_stock = v_new_stock <= minimum_stock,
        is_out_of_stock = v_new_stock <= 0
      WHERE menu_item_id = inv_record.menu_item_id;
      
      -- Create stock movement record (only if stock was actually available)
      IF v_current_stock > 0 THEN
        INSERT INTO stock_movements (
          reference_number,
          inventory_id,
          menu_item_id,
          movement_type,
          quantity,
          stock_before,
          stock_after,
          order_id,
          staff_id,
          reason
        )
        SELECT 
          'SM-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD((SELECT COUNT(*) + 1 FROM stock_movements)::text, 4, '0'),
          i.id,
          inv_record.menu_item_id,
          'out',
          LEAST(inv_record.quantity, v_current_stock), -- Only record what was actually available
          v_current_stock,
          v_new_stock,
          NEW.id,
          NEW.staff_id,
          CASE 
            WHEN v_current_stock < inv_record.quantity THEN 
              'Order Sale (Partial - Insufficient Stock)'
            ELSE 
              'Order Sale'
          END
        FROM inventory i
        WHERE i.menu_item_id = inv_record.menu_item_id;
      END IF;
      
      -- Log warning if trying to sell more than available
      IF v_current_stock < inv_record.quantity THEN
        RAISE WARNING 'Insufficient stock for menu_item_id %. Requested: %, Available: %', 
          inv_record.menu_item_id, inv_record.quantity, v_current_stock;
      END IF;
      
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Add a check constraint to prevent negative stock at database level
-- (PostgreSQL doesn't support CHECK constraints that reference other rows,
-- so we'll rely on the trigger, but we can add a simple constraint)
ALTER TABLE inventory 
DROP CONSTRAINT IF EXISTS check_current_stock_non_negative;

ALTER TABLE inventory 
ADD CONSTRAINT check_current_stock_non_negative 
CHECK (current_stock >= 0);

-- Step 4: Create a function to fix negative stock (can be called manually)
CREATE OR REPLACE FUNCTION fix_negative_stock()
RETURNS TABLE(
  fixed_count integer,
  total_negative_found integer
) AS $$
DECLARE
  v_fixed_count integer;
  v_total_negative integer;
BEGIN
  -- Count how many negative stock records exist
  SELECT COUNT(*) INTO v_total_negative
  FROM inventory
  WHERE current_stock < 0;
  
  -- Fix negative stock by setting to 0
  UPDATE inventory
  SET 
    current_stock = 0,
    is_out_of_stock = true,
    is_low_stock = true,
    last_stock_update = NOW()
  WHERE current_stock < 0;
  
  GET DIAGNOSTICS v_fixed_count = ROW_COUNT;
  
  RETURN QUERY SELECT v_fixed_count, v_total_negative;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create a helpful view to see items with issues
CREATE OR REPLACE VIEW inventory_issues AS
SELECT 
  i.id,
  mi.name as product_name,
  i.current_stock,
  i.minimum_stock,
  i.is_tracked,
  i.is_out_of_stock,
  i.is_low_stock,
  CASE 
    WHEN i.current_stock < 0 THEN 'NEGATIVE_STOCK'
    WHEN i.current_stock = 0 AND NOT i.is_out_of_stock THEN 'MISMATCH_OUT_OF_STOCK'
    WHEN i.current_stock <= i.minimum_stock AND NOT i.is_low_stock THEN 'MISMATCH_LOW_STOCK'
    ELSE 'OK'
  END as issue_type,
  i.last_stock_update
FROM inventory i
JOIN menu_items mi ON i.menu_item_id = mi.id
WHERE 
  i.current_stock < 0 OR
  (i.current_stock = 0 AND NOT i.is_out_of_stock) OR
  (i.current_stock <= i.minimum_stock AND NOT i.is_low_stock);

COMMENT ON VIEW inventory_issues IS 'Shows inventory records with potential issues (negative stock, status mismatches)';
COMMENT ON FUNCTION fix_negative_stock() IS 'Fixes all negative stock values by setting them to 0. Returns count of fixed records.';

