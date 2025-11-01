-- =====================================================
-- POS SYSTEM DATA RESET
-- For Your Pets Only - Pet Store
-- =====================================================
-- 
-- This script RESETS all transactional data but KEEPS:
-- ✅ Products (menu_items)
-- ✅ Categories
-- ✅ Staff
-- ✅ Suppliers
-- ✅ Site Settings
-- ✅ Payment Methods
--
-- This DELETES (resets):
-- ❌ All orders
-- ❌ All payments
-- ❌ All customers
-- ❌ All stock movements
-- ❌ Cash drawer sessions
-- ❌ Loyalty transactions
-- ❌ Resets inventory to 100 units
--
-- USE THIS TO: Start fresh with clean data
-- =====================================================

BEGIN;

-- IMPORTANT: Delete in correct order due to foreign key constraints!

-- Step 1: Delete dependent data first (to avoid foreign key errors)
DELETE FROM stock_movements;        -- References orders, must delete first
DELETE FROM loyalty_transactions;   -- References customers and orders
DELETE FROM order_items;            -- References orders
DELETE FROM payments;               -- References orders

-- Step 2: Delete cash drawer sessions
DELETE FROM cash_drawer_sessions;

-- Step 3: Now safe to delete orders (no more references)
DELETE FROM orders;

-- Step 4: Delete customers (after loyalty_transactions deleted)
DELETE FROM customers;

-- Step 5: Delete purchase orders (if you have test data)
DELETE FROM purchase_order_items;
DELETE FROM purchase_orders;

-- Step 6: Delete expenses (if you have test data)
DELETE FROM expenses;

-- Step 7: Reset inventory to starting values
UPDATE inventory 
SET 
  current_stock = 100,
  minimum_stock = 10,
  is_low_stock = false,
  is_out_of_stock = false,
  last_stock_update = NOW(),
  last_restock_date = NOW()
WHERE is_tracked = true;

-- Step 8: Reset staff statistics
UPDATE staff
SET 
  total_sales = 0,
  total_transactions = 0;

-- Step 9: Reset supplier statistics
UPDATE suppliers
SET 
  total_purchases = 0,
  total_orders = 0;

COMMIT;

-- Verify reset
SELECT 'Orders' as table_name, COUNT(*) as record_count FROM orders
UNION ALL
SELECT 'Customers', COUNT(*) FROM customers
UNION ALL
SELECT 'Payments', COUNT(*) FROM payments
UNION ALL
SELECT 'Inventory Items', COUNT(*) FROM inventory
UNION ALL
SELECT 'Staff', COUNT(*) FROM staff
UNION ALL
SELECT 'Products', COUNT(*) FROM menu_items;

-- Check inventory reset
SELECT 
  'Inventory Check' as test,
  COUNT(*) as total_items,
  SUM(current_stock) as total_stock,
  AVG(current_stock) as average_stock
FROM inventory;

-- Success message
SELECT '✅ POS DATA RESET COMPLETE!' as status,
       'All transactional data cleared.' as message,
       'Inventory reset to 100 units per item.' as inventory_status,
       'Products and settings preserved.' as preserved_data;

