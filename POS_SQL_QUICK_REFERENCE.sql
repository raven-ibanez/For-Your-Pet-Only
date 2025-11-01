-- =====================================================
-- POS SYSTEM - QUICK REFERENCE SQL QUERIES
-- For Your Pets Only Pet Store
-- =====================================================

-- =====================================================
-- DAILY OPERATIONS
-- =====================================================

-- 1. OPEN CASH DRAWER SESSION
-- Run this at the start of each shift
INSERT INTO cash_drawer_sessions (
  session_number,
  staff_id,
  opening_cash,
  status
)
VALUES (
  'SESS-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MI'),
  '00000000-0000-0000-0000-000000000000'::uuid,  -- Replace with actual staff_id
  5000.00,  -- Opening cash amount
  'open'
);

-- 2. CREATE NEW SALE (SIMPLE)
-- Step 1: Create order
WITH new_order AS (
  INSERT INTO orders (
    order_number,
    staff_id,
    order_type,
    customer_name,
    customer_phone,
    subtotal,
    total_amount,
    payment_status,
    order_status
  )
  VALUES (
    generate_order_number(),
    '00000000-0000-0000-0000-000000000000'::uuid,  -- Replace with staff_id
    'in-store',
    'Walk-in Customer',
    '09123456789',
    500.00,
    500.00,
    'paid',
    'completed'
  )
  RETURNING id
)
-- Step 2: Add order item
INSERT INTO order_items (
  order_id,
  menu_item_id,
  item_name,
  unit_price,
  quantity,
  total_price
)
SELECT 
  id,
  '00000000-0000-0000-0000-000000000000'::uuid,  -- Replace with menu_item_id
  'Dog Food Premium 5kg',
  500.00,
  1,
  500.00
FROM new_order;

-- 3. PROCESS PAYMENT
INSERT INTO payments (
  payment_number,
  order_id,
  payment_method,
  amount,
  payment_status
)
VALUES (
  generate_payment_number(),
  '00000000-0000-0000-0000-000000000000'::uuid,  -- Replace with order_id
  'cash',  -- or 'card', 'gcash', 'maya'
  500.00,
  'completed'
);

-- 4. CLOSE CASH DRAWER SESSION
UPDATE cash_drawer_sessions
SET 
  status = 'closed',
  closed_at = NOW(),
  closing_cash = 15000.00,  -- Actual cash counted
  expected_cash = (opening_cash + total_cash_sales),
  cash_difference = (15000.00 - (opening_cash + total_cash_sales))
WHERE status = 'open'
  AND staff_id = '00000000-0000-0000-0000-000000000000'::uuid  -- Replace with staff_id
  AND opened_at::date = CURRENT_DATE;

-- =====================================================
-- CUSTOMER MANAGEMENT
-- =====================================================

-- 5. REGISTER NEW CUSTOMER
INSERT INTO customers (
  customer_code,
  name,
  phone,
  email,
  address,
  pet_name,
  pet_type,
  pet_breed,
  pet_age
)
VALUES (
  generate_customer_code(),
  'Maria Santos',
  '09987654321',
  'maria@email.com',
  '456 Pet St, Quezon City',
  'Max',
  'dog',
  'Shih Tzu',
  3
);

-- 6. FIND CUSTOMER BY PHONE
SELECT 
  id,
  customer_code,
  name,
  phone,
  pet_name,
  pet_type,
  total_orders,
  total_spent,
  loyalty_points
FROM customers
WHERE phone LIKE '%123456789%'
  AND is_active = true;

-- 7. VIEW CUSTOMER PURCHASE HISTORY
SELECT 
  o.order_number,
  o.order_date,
  o.total_amount,
  o.payment_status,
  COUNT(oi.id) as items_count
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
WHERE o.customer_id = '00000000-0000-0000-0000-000000000000'::uuid  -- Replace
GROUP BY o.id, o.order_number, o.order_date, o.total_amount, o.payment_status
ORDER BY o.order_date DESC;

-- 8. REDEEM LOYALTY POINTS
-- Check available points
SELECT loyalty_points FROM customers 
WHERE id = '00000000-0000-0000-0000-000000000000'::uuid;

-- Redeem points (100 points = 100 pesos discount)
UPDATE customers
SET loyalty_points = loyalty_points - 100
WHERE id = '00000000-0000-0000-0000-000000000000'::uuid
  AND loyalty_points >= 100;

-- Record redemption
INSERT INTO loyalty_transactions (
  customer_id,
  transaction_type,
  points,
  description
)
VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid,
  'redeem',
  -100,
  'Redeemed for discount'
);

-- =====================================================
-- INVENTORY MANAGEMENT
-- =====================================================

-- 9. CHECK CURRENT STOCK
SELECT 
  mi.name,
  i.current_stock,
  i.minimum_stock,
  i.sku,
  i.is_low_stock,
  i.is_out_of_stock
FROM inventory i
JOIN menu_items mi ON i.menu_item_id = mi.id
WHERE i.is_tracked = true
ORDER BY mi.name;

-- 10. VIEW LOW STOCK ITEMS
SELECT * FROM low_stock_items;

-- 11. ADD STOCK (Receiving Delivery)
SELECT add_stock(
  '00000000-0000-0000-0000-000000000000'::uuid,  -- menu_item_id
  50,                                             -- quantity
  120.00,                                         -- unit_cost
  '00000000-0000-0000-0000-000000000000'::uuid,  -- supplier_id
  '00000000-0000-0000-0000-000000000000'::uuid,  -- staff_id
  'Received from Supplier ABC'
);

-- 12. ADJUST STOCK (Physical Count)
SELECT adjust_stock(
  '00000000-0000-0000-0000-000000000000'::uuid,  -- menu_item_id
  85,                                             -- new_quantity
  '00000000-0000-0000-0000-000000000000'::uuid,  -- staff_id
  'Physical inventory count',
  'Weekly stock check'
);

-- 13. RECORD WASTAGE
SELECT record_wastage(
  '00000000-0000-0000-0000-000000000000'::uuid,  -- menu_item_id
  3,                                              -- quantity
  '00000000-0000-0000-0000-000000000000'::uuid,  -- staff_id
  'Damaged items',
  'Packaging damaged during transport'
);

-- 14. VIEW STOCK MOVEMENTS (Last 7 days)
SELECT 
  sm.reference_number,
  mi.name as product_name,
  sm.movement_type,
  sm.quantity,
  sm.stock_before,
  sm.stock_after,
  sm.reason,
  s.name as staff_name,
  sm.movement_date
FROM stock_movements sm
JOIN menu_items mi ON sm.menu_item_id = mi.id
LEFT JOIN staff s ON sm.staff_id = s.id
WHERE sm.movement_date >= CURRENT_DATE - 7
ORDER BY sm.movement_date DESC;

-- =====================================================
-- SALES REPORTS
-- =====================================================

-- 15. TODAY'S SALES SUMMARY
SELECT * FROM get_sales_by_date_range(CURRENT_DATE, CURRENT_DATE);

-- 16. THIS WEEK'S SALES
SELECT * FROM get_sales_by_date_range(
  DATE_TRUNC('week', CURRENT_DATE)::date,
  CURRENT_DATE
);

-- 17. THIS MONTH'S SALES
SELECT * FROM get_sales_by_date_range(
  DATE_TRUNC('month', CURRENT_DATE)::date,
  CURRENT_DATE
);

-- 18. TOP 10 SELLING PRODUCTS (Last 30 days)
SELECT * FROM get_product_performance(30)
LIMIT 10;

-- 19. SALES BY HOUR (Peak Hours)
SELECT * FROM get_hourly_sales();

-- 20. PAYMENT METHOD BREAKDOWN
SELECT * FROM get_payment_method_breakdown(30);

-- 21. DAILY SALES TREND (Last 30 days)
SELECT * FROM daily_sales_summary
WHERE sale_date >= CURRENT_DATE - 30
ORDER BY sale_date;

-- 22. REVENUE BY CATEGORY
SELECT * FROM revenue_by_category;

-- =====================================================
-- STAFF PERFORMANCE
-- =====================================================

-- 23. STAFF PERFORMANCE (Last 30 days)
SELECT * FROM get_staff_performance(30);

-- 24. TODAY'S SALES BY STAFF
SELECT 
  s.name as staff_name,
  COUNT(o.id) as orders_today,
  SUM(o.total_amount) as sales_today
FROM staff s
LEFT JOIN orders o ON s.id = o.staff_id 
  AND o.order_date::date = CURRENT_DATE
  AND o.order_status != 'cancelled'
GROUP BY s.id, s.name
ORDER BY sales_today DESC NULLS LAST;

-- =====================================================
-- FINANCIAL REPORTS
-- =====================================================

-- 25. TODAY'S CASH FLOW
SELECT 
  -- Sales Revenue
  (SELECT COALESCE(SUM(total_amount), 0) 
   FROM orders 
   WHERE order_date::date = CURRENT_DATE 
   AND payment_status = 'paid'
   AND order_status != 'cancelled') as total_revenue,
  
  -- Expenses
  (SELECT COALESCE(SUM(amount), 0)
   FROM expenses
   WHERE expense_date = CURRENT_DATE
   AND payment_status = 'paid') as total_expenses,
  
  -- Net Cash Flow
  (SELECT COALESCE(SUM(total_amount), 0) 
   FROM orders 
   WHERE order_date::date = CURRENT_DATE 
   AND payment_status = 'paid'
   AND order_status != 'cancelled') -
  (SELECT COALESCE(SUM(amount), 0)
   FROM expenses
   WHERE expense_date = CURRENT_DATE
   AND payment_status = 'paid') as net_cash_flow;

-- 26. INVENTORY VALUATION
SELECT * FROM get_inventory_valuation();

-- 27. PROFIT BY PRODUCT (with cost tracking)
SELECT 
  mi.name,
  SUM(oi.quantity) as quantity_sold,
  SUM(oi.total_price) as revenue,
  i.average_cost * SUM(oi.quantity) as total_cost,
  SUM(oi.total_price) - (i.average_cost * SUM(oi.quantity)) as profit,
  ((SUM(oi.total_price) - (i.average_cost * SUM(oi.quantity))) / SUM(oi.total_price) * 100) as profit_margin_percent
FROM order_items oi
JOIN menu_items mi ON oi.menu_item_id = mi.id
JOIN orders o ON oi.order_id = o.id
LEFT JOIN inventory i ON oi.menu_item_id = i.menu_item_id
WHERE o.order_date >= CURRENT_DATE - 30
  AND o.order_status != 'cancelled'
  AND i.average_cost IS NOT NULL
GROUP BY mi.name, i.average_cost
ORDER BY profit DESC;

-- =====================================================
-- CUSTOMER ANALYTICS
-- =====================================================

-- 28. CUSTOMER LIFETIME VALUE (Top 20)
SELECT * FROM customer_lifetime_value
LIMIT 20;

-- 29. NEW CUSTOMERS THIS MONTH
SELECT 
  COUNT(*) as new_customers,
  SUM(total_spent) as total_spent_by_new_customers
FROM customers
WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE);

-- 30. CUSTOMERS BY PET TYPE
SELECT 
  pet_type,
  COUNT(*) as customer_count,
  SUM(total_spent) as total_revenue,
  AVG(total_spent) as average_lifetime_value
FROM customers
WHERE pet_type IS NOT NULL
  AND is_active = true
GROUP BY pet_type
ORDER BY customer_count DESC;

-- =====================================================
-- SUPPLIER & PURCHASE ORDERS
-- =====================================================

-- 31. CREATE PURCHASE ORDER
INSERT INTO purchase_orders (
  po_number,
  supplier_id,
  staff_id,
  expected_delivery_date,
  subtotal,
  total_amount,
  status
)
VALUES (
  'PO-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-001',
  '00000000-0000-0000-0000-000000000000'::uuid,  -- supplier_id
  '00000000-0000-0000-0000-000000000000'::uuid,  -- staff_id
  CURRENT_DATE + 7,                               -- delivery in 7 days
  10000.00,
  10000.00,
  'sent'
);

-- 32. VIEW PENDING PURCHASE ORDERS
SELECT 
  po.po_number,
  s.name as supplier_name,
  po.order_date,
  po.expected_delivery_date,
  po.total_amount,
  po.status
FROM purchase_orders po
JOIN suppliers s ON po.supplier_id = s.id
WHERE po.status IN ('sent', 'confirmed')
ORDER BY po.expected_delivery_date;

-- =====================================================
-- ALERTS & NOTIFICATIONS
-- =====================================================

-- 33. ITEMS NEEDING REORDER
SELECT * FROM items_need_reorder;

-- 34. OUT OF STOCK ITEMS
SELECT 
  mi.name,
  i.sku,
  i.current_stock,
  i.last_restock_date
FROM inventory i
JOIN menu_items mi ON i.menu_item_id = mi.id
WHERE i.is_out_of_stock = true
ORDER BY i.last_restock_date;

-- 35. EXPIRING LOYALTY POINTS (Next 30 days)
SELECT * FROM expiring_loyalty_points;

-- =====================================================
-- AUDIT & COMPLIANCE
-- =====================================================

-- 36. CASH DRAWER DISCREPANCIES
SELECT 
  session_number,
  s.name as cashier_name,
  opened_at,
  closed_at,
  expected_cash,
  closing_cash,
  cash_difference,
  CASE 
    WHEN ABS(cash_difference) > 100 THEN 'ALERT'
    WHEN ABS(cash_difference) > 50 THEN 'WARNING'
    ELSE 'OK'
  END as status
FROM cash_drawer_sessions cds
JOIN staff s ON cds.staff_id = s.id
WHERE status = 'closed'
  AND opened_at >= CURRENT_DATE - 30
ORDER BY opened_at DESC;

-- 37. CANCELLED ORDERS (Last 7 days)
SELECT 
  order_number,
  customer_name,
  total_amount,
  cancellation_reason,
  cancelled_at,
  s.name as cancelled_by
FROM orders o
LEFT JOIN staff s ON o.staff_id = s.id
WHERE order_status = 'cancelled'
  AND cancelled_at >= CURRENT_DATE - 7
ORDER BY cancelled_at DESC;

-- 38. REFUNDED PAYMENTS
SELECT 
  p.payment_number,
  o.order_number,
  p.amount,
  p.payment_method,
  p.payment_date,
  p.notes
FROM payments p
JOIN orders o ON p.order_id = o.id
WHERE p.payment_status = 'refunded'
  AND p.payment_date >= CURRENT_DATE - 30
ORDER BY p.payment_date DESC;

-- =====================================================
-- UTILITY QUERIES
-- =====================================================

-- 39. RESET DEMO DATA (BE CAREFUL!)
-- This deletes all transactional data but keeps master data
-- TRUNCATE TABLE order_items CASCADE;
-- TRUNCATE TABLE payments CASCADE;
-- TRUNCATE TABLE orders CASCADE;
-- TRUNCATE TABLE stock_movements CASCADE;
-- TRUNCATE TABLE loyalty_transactions CASCADE;
-- -- Reset inventory
-- UPDATE inventory SET current_stock = 100, is_low_stock = false, is_out_of_stock = false;

-- 40. DATABASE HEALTH CHECK
SELECT 
  'Orders' as table_name, COUNT(*) as record_count FROM orders
UNION ALL
SELECT 'Order Items', COUNT(*) FROM order_items
UNION ALL
SELECT 'Customers', COUNT(*) FROM customers
UNION ALL
SELECT 'Payments', COUNT(*) FROM payments
UNION ALL
SELECT 'Inventory Items', COUNT(*) FROM inventory
UNION ALL
SELECT 'Staff', COUNT(*) FROM staff
UNION ALL
SELECT 'Suppliers', COUNT(*) FROM suppliers;

-- =====================================================
-- NOTES
-- =====================================================
-- Replace all '00000000-0000-0000-0000-000000000000' with actual UUIDs
-- Adjust dates and amounts as needed
-- Test queries in a dev environment first
-- Always backup before running destructive operations
-- =====================================================

