/*
  # Advanced POS Features and Analytics
  
  This migration adds:
  1. Sales Analytics Functions
  2. Inventory Alerts
  3. Performance Metrics
  4. Automated Reports
  5. Product Performance Analysis
*/

-- =====================================================
-- ANALYTICS FUNCTIONS
-- =====================================================

-- Get sales by date range
CREATE OR REPLACE FUNCTION get_sales_by_date_range(
  start_date date,
  end_date date
)
RETURNS TABLE (
  total_orders bigint,
  total_sales numeric,
  total_paid numeric,
  average_order_value numeric,
  total_customers bigint,
  total_items_sold bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT o.id)::bigint as total_orders,
    SUM(o.total_amount) as total_sales,
    SUM(CASE WHEN o.payment_status = 'paid' THEN o.total_amount ELSE 0 END) as total_paid,
    AVG(o.total_amount) as average_order_value,
    COUNT(DISTINCT o.customer_id)::bigint as total_customers,
    SUM(oi.quantity)::bigint as total_items_sold
  FROM orders o
  LEFT JOIN order_items oi ON o.id = oi.order_id
  WHERE o.order_date::date BETWEEN start_date AND end_date
    AND o.order_status != 'cancelled';
END;
$$ LANGUAGE plpgsql;

-- Get hourly sales distribution
CREATE OR REPLACE FUNCTION get_hourly_sales()
RETURNS TABLE (
  hour_of_day integer,
  total_orders bigint,
  total_sales numeric,
  average_order_value numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    EXTRACT(HOUR FROM order_date)::integer as hour_of_day,
    COUNT(*)::bigint as total_orders,
    SUM(total_amount) as total_sales,
    AVG(total_amount) as average_order_value
  FROM orders
  WHERE order_status != 'cancelled'
    AND order_date >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY EXTRACT(HOUR FROM order_date)
  ORDER BY hour_of_day;
END;
$$ LANGUAGE plpgsql;

-- Get product performance
CREATE OR REPLACE FUNCTION get_product_performance(days_back integer DEFAULT 30)
RETURNS TABLE (
  menu_item_id uuid,
  product_name text,
  times_ordered bigint,
  total_quantity bigint,
  total_revenue numeric,
  average_price numeric,
  profit_margin numeric,
  stock_turnover_rate numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    oi.menu_item_id,
    oi.item_name as product_name,
    COUNT(DISTINCT oi.order_id)::bigint as times_ordered,
    SUM(oi.quantity)::bigint as total_quantity,
    SUM(oi.total_price) as total_revenue,
    AVG(oi.unit_price) as average_price,
    CASE 
      WHEN i.average_cost IS NOT NULL AND i.average_cost > 0
      THEN ((AVG(oi.unit_price) - i.average_cost) / AVG(oi.unit_price) * 100)
      ELSE NULL
    END as profit_margin,
    CASE 
      WHEN i.current_stock > 0 
      THEN (SUM(oi.quantity)::numeric / i.current_stock::numeric)
      ELSE NULL
    END as stock_turnover_rate
  FROM order_items oi
  JOIN orders o ON oi.order_id = o.id
  LEFT JOIN inventory i ON oi.menu_item_id = i.menu_item_id
  WHERE o.order_date >= CURRENT_DATE - days_back
    AND o.order_status != 'cancelled'
  GROUP BY oi.menu_item_id, oi.item_name, i.average_cost, i.current_stock
  ORDER BY total_revenue DESC;
END;
$$ LANGUAGE plpgsql;

-- Get customer analytics
CREATE OR REPLACE FUNCTION get_customer_analytics()
RETURNS TABLE (
  total_customers bigint,
  active_customers bigint,
  new_customers_this_month bigint,
  average_customer_value numeric,
  total_loyalty_points bigint,
  customers_with_pets bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::bigint as total_customers,
    COUNT(CASE WHEN is_active = true THEN 1 END)::bigint as active_customers,
    COUNT(CASE WHEN created_at >= DATE_TRUNC('month', CURRENT_DATE) THEN 1 END)::bigint as new_customers_this_month,
    AVG(total_spent) as average_customer_value,
    SUM(loyalty_points)::bigint as total_loyalty_points,
    COUNT(CASE WHEN pet_name IS NOT NULL THEN 1 END)::bigint as customers_with_pets
  FROM customers;
END;
$$ LANGUAGE plpgsql;

-- Get inventory valuation
CREATE OR REPLACE FUNCTION get_inventory_valuation()
RETURNS TABLE (
  total_items bigint,
  total_stock bigint,
  total_value numeric,
  low_stock_items bigint,
  out_of_stock_items bigint,
  average_item_cost numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::bigint as total_items,
    SUM(current_stock)::bigint as total_stock,
    SUM(current_stock * COALESCE(average_cost, unit_cost, 0)) as total_value,
    COUNT(CASE WHEN is_low_stock = true THEN 1 END)::bigint as low_stock_items,
    COUNT(CASE WHEN is_out_of_stock = true THEN 1 END)::bigint as out_of_stock_items,
    AVG(COALESCE(average_cost, unit_cost, 0)) as average_item_cost
  FROM inventory
  WHERE is_tracked = true;
END;
$$ LANGUAGE plpgsql;

-- Get payment method breakdown
CREATE OR REPLACE FUNCTION get_payment_method_breakdown(days_back integer DEFAULT 30)
RETURNS TABLE (
  payment_method text,
  transaction_count bigint,
  total_amount numeric,
  percentage numeric
) AS $$
BEGIN
  RETURN QUERY
  WITH payment_totals AS (
    SELECT SUM(p.amount) as grand_total
    FROM payments p
    WHERE p.payment_date >= CURRENT_DATE - days_back
  )
  SELECT 
    p.payment_method,
    COUNT(*)::bigint as transaction_count,
    SUM(p.amount) as total_amount,
    CASE 
      WHEN (SELECT grand_total FROM payment_totals) > 0 
      THEN (SUM(p.amount) / (SELECT grand_total FROM payment_totals) * 100)
      ELSE 0
    END as percentage
  FROM payments p
  WHERE p.payment_date >= CURRENT_DATE - days_back
  GROUP BY p.payment_method
  ORDER BY total_amount DESC;
END;
$$ LANGUAGE plpgsql;

-- Get staff performance
CREATE OR REPLACE FUNCTION get_staff_performance(days_back integer DEFAULT 30)
RETURNS TABLE (
  staff_id uuid,
  staff_name text,
  total_orders bigint,
  total_sales numeric,
  average_order_value numeric,
  orders_per_day numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id as staff_id,
    s.name as staff_name,
    COUNT(o.id)::bigint as total_orders,
    SUM(o.total_amount) as total_sales,
    AVG(o.total_amount) as average_order_value,
    (COUNT(o.id)::numeric / GREATEST(days_back, 1)::numeric) as orders_per_day
  FROM staff s
  LEFT JOIN orders o ON s.id = o.staff_id 
    AND o.order_date >= CURRENT_DATE - days_back
    AND o.order_status != 'cancelled'
  WHERE s.employment_status = 'active'
  GROUP BY s.id, s.name
  ORDER BY total_sales DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- INVENTORY MANAGEMENT FUNCTIONS
-- =====================================================

-- Function to add stock
CREATE OR REPLACE FUNCTION add_stock(
  p_menu_item_id uuid,
  p_quantity integer,
  p_unit_cost decimal DEFAULT NULL,
  p_supplier_id uuid DEFAULT NULL,
  p_staff_id uuid DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_inventory_id uuid;
  v_stock_before integer;
  v_stock_after integer;
  v_movement_id uuid;
BEGIN
  -- Get inventory record
  SELECT id, current_stock INTO v_inventory_id, v_stock_before
  FROM inventory
  WHERE menu_item_id = p_menu_item_id;
  
  IF v_inventory_id IS NULL THEN
    RAISE EXCEPTION 'Inventory record not found for menu item %', p_menu_item_id;
  END IF;
  
  v_stock_after := v_stock_before + p_quantity;
  
  -- Update inventory
  UPDATE inventory
  SET 
    current_stock = v_stock_after,
    last_stock_update = NOW(),
    last_restock_date = NOW(),
    last_purchase_price = COALESCE(p_unit_cost, last_purchase_price),
    average_cost = CASE 
      WHEN p_unit_cost IS NOT NULL 
      THEN ((average_cost * v_stock_before) + (p_unit_cost * p_quantity)) / v_stock_after
      ELSE average_cost
    END,
    is_low_stock = v_stock_after <= minimum_stock,
    is_out_of_stock = false
  WHERE id = v_inventory_id;
  
  -- Create stock movement record
  INSERT INTO stock_movements (
    reference_number,
    inventory_id,
    menu_item_id,
    movement_type,
    quantity,
    unit_cost,
    total_cost,
    stock_before,
    stock_after,
    supplier_id,
    staff_id,
    reason,
    notes
  )
  VALUES (
    'SM-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD((SELECT COUNT(*) + 1 FROM stock_movements)::text, 4, '0'),
    v_inventory_id,
    p_menu_item_id,
    'in',
    p_quantity,
    p_unit_cost,
    COALESCE(p_unit_cost * p_quantity, 0),
    v_stock_before,
    v_stock_after,
    p_supplier_id,
    p_staff_id,
    'Stock Addition',
    p_notes
  )
  RETURNING id INTO v_movement_id;
  
  RETURN v_movement_id;
END;
$$ LANGUAGE plpgsql;

-- Function to adjust stock (for corrections)
CREATE OR REPLACE FUNCTION adjust_stock(
  p_menu_item_id uuid,
  p_new_quantity integer,
  p_staff_id uuid DEFAULT NULL,
  p_reason text DEFAULT 'Stock Adjustment',
  p_notes text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_inventory_id uuid;
  v_stock_before integer;
  v_adjustment integer;
  v_movement_id uuid;
BEGIN
  SELECT id, current_stock INTO v_inventory_id, v_stock_before
  FROM inventory
  WHERE menu_item_id = p_menu_item_id;
  
  IF v_inventory_id IS NULL THEN
    RAISE EXCEPTION 'Inventory record not found for menu item %', p_menu_item_id;
  END IF;
  
  v_adjustment := p_new_quantity - v_stock_before;
  
  -- Update inventory
  UPDATE inventory
  SET 
    current_stock = p_new_quantity,
    last_stock_update = NOW(),
    is_low_stock = p_new_quantity <= minimum_stock,
    is_out_of_stock = p_new_quantity <= 0
  WHERE id = v_inventory_id;
  
  -- Create stock movement record
  INSERT INTO stock_movements (
    reference_number,
    inventory_id,
    menu_item_id,
    movement_type,
    quantity,
    stock_before,
    stock_after,
    staff_id,
    reason,
    notes
  )
  VALUES (
    'SM-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD((SELECT COUNT(*) + 1 FROM stock_movements)::text, 4, '0'),
    v_inventory_id,
    p_menu_item_id,
    'adjustment',
    ABS(v_adjustment),
    v_stock_before,
    p_new_quantity,
    p_staff_id,
    p_reason,
    p_notes
  )
  RETURNING id INTO v_movement_id;
  
  RETURN v_movement_id;
END;
$$ LANGUAGE plpgsql;

-- Function to record wastage
CREATE OR REPLACE FUNCTION record_wastage(
  p_menu_item_id uuid,
  p_quantity integer,
  p_staff_id uuid DEFAULT NULL,
  p_reason text DEFAULT 'Wastage',
  p_notes text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_inventory_id uuid;
  v_stock_before integer;
  v_stock_after integer;
  v_movement_id uuid;
BEGIN
  SELECT id, current_stock INTO v_inventory_id, v_stock_before
  FROM inventory
  WHERE menu_item_id = p_menu_item_id;
  
  IF v_inventory_id IS NULL THEN
    RAISE EXCEPTION 'Inventory record not found for menu item %', p_menu_item_id;
  END IF;
  
  v_stock_after := v_stock_before - p_quantity;
  
  IF v_stock_after < 0 THEN
    RAISE EXCEPTION 'Insufficient stock. Current: %, Requested: %', v_stock_before, p_quantity;
  END IF;
  
  -- Update inventory
  UPDATE inventory
  SET 
    current_stock = v_stock_after,
    last_stock_update = NOW(),
    is_low_stock = v_stock_after <= minimum_stock,
    is_out_of_stock = v_stock_after <= 0
  WHERE id = v_inventory_id;
  
  -- Create stock movement record
  INSERT INTO stock_movements (
    reference_number,
    inventory_id,
    menu_item_id,
    movement_type,
    quantity,
    stock_before,
    stock_after,
    staff_id,
    reason,
    notes
  )
  VALUES (
    'SM-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD((SELECT COUNT(*) + 1 FROM stock_movements)::text, 4, '0'),
    v_inventory_id,
    p_menu_item_id,
    'wastage',
    p_quantity,
    v_stock_before,
    v_stock_after,
    p_staff_id,
    p_reason,
    p_notes
  )
  RETURNING id INTO v_movement_id;
  
  RETURN v_movement_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- AUTOMATED NOTIFICATIONS/ALERTS
-- =====================================================

-- View for items needing reorder
CREATE OR REPLACE VIEW items_need_reorder AS
SELECT 
  i.id,
  mi.name,
  i.current_stock,
  i.minimum_stock,
  i.reorder_quantity,
  i.sku,
  s.name as supplier_name,
  s.phone as supplier_phone,
  i.last_restock_date
FROM inventory i
JOIN menu_items mi ON i.menu_item_id = mi.id
LEFT JOIN suppliers s ON i.supplier_id = s.id
WHERE i.is_tracked = true
  AND (i.is_low_stock = true OR i.is_out_of_stock = true)
ORDER BY i.current_stock ASC;

-- View for expired/expiring loyalty points
CREATE OR REPLACE VIEW expiring_loyalty_points AS
SELECT 
  c.id as customer_id,
  c.name as customer_name,
  c.phone,
  c.email,
  SUM(lt.points) as points_expiring,
  MIN(lt.expires_at) as earliest_expiry
FROM loyalty_transactions lt
JOIN customers c ON lt.customer_id = c.id
WHERE lt.expires_at IS NOT NULL
  AND lt.expires_at BETWEEN NOW() AND NOW() + INTERVAL '30 days'
  AND lt.transaction_type = 'earn'
GROUP BY c.id, c.name, c.phone, c.email
HAVING SUM(lt.points) > 0
ORDER BY earliest_expiry ASC;

-- =====================================================
-- ADDITIONAL VIEWS
-- =====================================================

-- Revenue by category
CREATE OR REPLACE VIEW revenue_by_category AS
SELECT 
  mi.category,
  COUNT(DISTINCT oi.order_id) as total_orders,
  SUM(oi.quantity) as total_quantity_sold,
  SUM(oi.total_price) as total_revenue,
  AVG(oi.unit_price) as average_price
FROM order_items oi
JOIN menu_items mi ON oi.menu_item_id = mi.id
JOIN orders o ON oi.order_id = o.id
WHERE o.order_status != 'cancelled'
  AND o.order_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY mi.category
ORDER BY total_revenue DESC;

-- Order status overview
CREATE OR REPLACE VIEW order_status_overview AS
SELECT 
  order_status,
  payment_status,
  COUNT(*) as count,
  SUM(total_amount) as total_value
FROM orders
WHERE order_date::date = CURRENT_DATE
GROUP BY order_status, payment_status
ORDER BY order_status, payment_status;

-- Monthly comparison
CREATE OR REPLACE VIEW monthly_comparison AS
SELECT 
  TO_CHAR(order_date, 'YYYY-MM') as month,
  COUNT(*) as total_orders,
  SUM(total_amount) as total_sales,
  AVG(total_amount) as average_order_value,
  COUNT(DISTINCT customer_id) as unique_customers
FROM orders
WHERE order_status != 'cancelled'
  AND order_date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '12 months')
GROUP BY TO_CHAR(order_date, 'YYYY-MM')
ORDER BY month DESC;

COMMENT ON FUNCTION get_sales_by_date_range IS 'Get comprehensive sales statistics for a date range';
COMMENT ON FUNCTION get_product_performance IS 'Analyze product performance including profit margins and stock turnover';
COMMENT ON FUNCTION add_stock IS 'Add stock to inventory with proper tracking';
COMMENT ON FUNCTION adjust_stock IS 'Adjust stock levels for corrections or physical counts';
COMMENT ON FUNCTION record_wastage IS 'Record product wastage or damage';

