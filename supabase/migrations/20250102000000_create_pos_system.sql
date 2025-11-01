/*
  # Create Point of Sale (POS) System for Pet Store
  
  This migration creates a complete POS system with:
  1. Customer Management
  2. Order Management (Sales Transactions)
  3. Payment Processing
  4. Inventory Tracking
  5. Stock Management
  6. Supplier Management
  7. Expense Tracking
  8. Staff/Cashier Management
  9. Cash Drawer Sessions
  10. Sales Analytics & Reports

  Features:
  - Complete order lifecycle tracking
  - Multi-payment method support
  - Inventory management with low stock alerts
  - Customer loyalty tracking
  - Daily sales reporting
  - Cash drawer reconciliation
  - Supplier & expense management
*/

-- =====================================================
-- 1. CUSTOMERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_code text UNIQUE NOT NULL,
  name text NOT NULL,
  email text,
  phone text NOT NULL,
  address text,
  city text,
  postal_code text,
  
  -- Pet Information
  pet_name text,
  pet_type text, -- dog, cat, bird, fish, etc.
  pet_breed text,
  pet_age integer,
  
  -- Customer Stats
  total_orders integer DEFAULT 0,
  total_spent decimal(10,2) DEFAULT 0,
  loyalty_points integer DEFAULT 0,
  
  -- Dates
  first_purchase_date timestamptz,
  last_purchase_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Soft delete
  is_active boolean DEFAULT true
);

-- =====================================================
-- 2. STAFF/CASHIERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_code text UNIQUE NOT NULL,
  name text NOT NULL,
  email text UNIQUE,
  phone text,
  role text NOT NULL DEFAULT 'cashier', -- cashier, manager, admin
  pin_code text, -- 4-6 digit PIN for POS login
  
  -- Employment Info
  hire_date date,
  employment_status text DEFAULT 'active', -- active, inactive, terminated
  
  -- Stats
  total_sales decimal(10,2) DEFAULT 0,
  total_transactions integer DEFAULT 0,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- 3. CASH DRAWER SESSIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS cash_drawer_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_number text UNIQUE NOT NULL,
  staff_id uuid REFERENCES staff(id),
  
  -- Session Times
  opened_at timestamptz DEFAULT now(),
  closed_at timestamptz,
  
  -- Cash Amounts
  opening_cash decimal(10,2) NOT NULL DEFAULT 0,
  closing_cash decimal(10,2),
  expected_cash decimal(10,2),
  cash_difference decimal(10,2), -- discrepancy
  
  -- Session Totals
  total_sales decimal(10,2) DEFAULT 0,
  total_cash_sales decimal(10,2) DEFAULT 0,
  total_card_sales decimal(10,2) DEFAULT 0,
  total_gcash_sales decimal(10,2) DEFAULT 0,
  total_other_sales decimal(10,2) DEFAULT 0,
  total_transactions integer DEFAULT 0,
  
  -- Status
  status text DEFAULT 'open', -- open, closed
  notes text,
  
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- 4. ORDERS/TRANSACTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  
  -- References
  customer_id uuid REFERENCES customers(id),
  staff_id uuid REFERENCES staff(id),
  cash_drawer_session_id uuid REFERENCES cash_drawer_sessions(id),
  
  -- Order Type
  order_type text NOT NULL DEFAULT 'in-store', -- in-store, online, delivery
  service_type text, -- dine-in, pickup, delivery (for compatibility)
  
  -- Order Details
  subtotal decimal(10,2) NOT NULL DEFAULT 0,
  discount_amount decimal(10,2) DEFAULT 0,
  discount_percentage decimal(5,2) DEFAULT 0,
  discount_reason text,
  tax_amount decimal(10,2) DEFAULT 0,
  delivery_fee decimal(10,2) DEFAULT 0,
  total_amount decimal(10,2) NOT NULL DEFAULT 0,
  
  -- Payment
  payment_status text DEFAULT 'pending', -- pending, paid, partial, refunded
  paid_amount decimal(10,2) DEFAULT 0,
  change_amount decimal(10,2) DEFAULT 0,
  
  -- Order Status
  order_status text DEFAULT 'pending', -- pending, processing, completed, cancelled
  fulfillment_status text DEFAULT 'unfulfilled', -- unfulfilled, fulfilled, partially_fulfilled
  
  -- Customer Info (for guests)
  customer_name text,
  customer_phone text,
  customer_email text,
  delivery_address text,
  delivery_landmark text,
  
  -- Timestamps
  order_date timestamptz DEFAULT now(),
  paid_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  
  -- Additional Info
  notes text,
  internal_notes text, -- staff notes
  cancellation_reason text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- 5. ORDER ITEMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id uuid REFERENCES menu_items(id),
  
  -- Item Details (snapshot at time of order)
  item_name text NOT NULL,
  item_description text,
  
  -- Pricing
  unit_price decimal(10,2) NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  discount_amount decimal(10,2) DEFAULT 0,
  total_price decimal(10,2) NOT NULL,
  
  -- Customization
  variation_id uuid REFERENCES variations(id),
  variation_name text,
  variation_price decimal(10,2) DEFAULT 0,
  
  -- Add-ons (stored as JSONB for flexibility)
  selected_add_ons jsonb, -- [{id, name, price, quantity}]
  
  -- Inventory Impact
  affects_inventory boolean DEFAULT true,
  
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- 6. PAYMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_number text UNIQUE NOT NULL,
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  
  -- Payment Details
  payment_method text NOT NULL, -- cash, card, gcash, maya, paymaya, bank_transfer
  amount decimal(10,2) NOT NULL,
  
  -- Payment Info
  reference_number text, -- for digital payments
  card_last_four text, -- for card payments
  bank_name text, -- for bank transfers
  
  -- Status
  payment_status text DEFAULT 'completed', -- pending, completed, failed, refunded
  
  -- Timestamps
  payment_date timestamptz DEFAULT now(),
  processed_at timestamptz,
  
  notes text,
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- 7. INVENTORY/STOCK TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id uuid REFERENCES menu_items(id) ON DELETE CASCADE UNIQUE,
  
  -- Stock Levels
  current_stock integer NOT NULL DEFAULT 0,
  minimum_stock integer DEFAULT 10, -- low stock alert threshold
  maximum_stock integer, -- reorder point
  reorder_quantity integer, -- suggested reorder amount
  
  -- Costing
  unit_cost decimal(10,2), -- purchase cost per unit
  last_purchase_price decimal(10,2),
  average_cost decimal(10,2), -- weighted average cost
  
  -- Stock Info
  sku text, -- Stock Keeping Unit
  barcode text,
  supplier_id uuid, -- we'll create suppliers table
  
  -- Tracking
  last_stock_update timestamptz,
  last_restock_date timestamptz,
  
  -- Status
  is_tracked boolean DEFAULT true, -- whether to track inventory for this item
  is_low_stock boolean DEFAULT false,
  is_out_of_stock boolean DEFAULT false,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- 8. STOCK MOVEMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_number text UNIQUE NOT NULL,
  inventory_id uuid REFERENCES inventory(id) ON DELETE CASCADE,
  menu_item_id uuid REFERENCES menu_items(id),
  
  -- Movement Details
  movement_type text NOT NULL, -- in, out, adjustment, return, wastage
  quantity integer NOT NULL,
  unit_cost decimal(10,2),
  total_cost decimal(10,2),
  
  -- Before/After Stock
  stock_before integer,
  stock_after integer,
  
  -- References
  order_id uuid REFERENCES orders(id), -- if related to an order
  supplier_id uuid, -- if from supplier
  staff_id uuid REFERENCES staff(id),
  
  -- Details
  reason text,
  notes text,
  
  movement_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- 9. SUPPLIERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_code text UNIQUE NOT NULL,
  name text NOT NULL,
  
  -- Contact Info
  contact_person text,
  email text,
  phone text,
  address text,
  city text,
  
  -- Business Info
  tax_id text,
  payment_terms text, -- NET 30, NET 60, COD, etc.
  
  -- Stats
  total_purchases decimal(10,2) DEFAULT 0,
  total_orders integer DEFAULT 0,
  
  -- Status
  is_active boolean DEFAULT true,
  rating integer, -- 1-5 stars
  
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- 10. PURCHASE ORDERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number text UNIQUE NOT NULL,
  supplier_id uuid REFERENCES suppliers(id),
  staff_id uuid REFERENCES staff(id), -- who created the PO
  
  -- Order Details
  order_date timestamptz DEFAULT now(),
  expected_delivery_date date,
  actual_delivery_date date,
  
  -- Amounts
  subtotal decimal(10,2) NOT NULL DEFAULT 0,
  tax_amount decimal(10,2) DEFAULT 0,
  shipping_cost decimal(10,2) DEFAULT 0,
  total_amount decimal(10,2) NOT NULL DEFAULT 0,
  
  -- Status
  status text DEFAULT 'draft', -- draft, sent, confirmed, received, cancelled
  payment_status text DEFAULT 'unpaid', -- unpaid, partial, paid
  
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- 11. PURCHASE ORDER ITEMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid REFERENCES purchase_orders(id) ON DELETE CASCADE,
  menu_item_id uuid REFERENCES menu_items(id),
  
  -- Item Details
  item_name text NOT NULL,
  quantity_ordered integer NOT NULL,
  quantity_received integer DEFAULT 0,
  
  -- Pricing
  unit_cost decimal(10,2) NOT NULL,
  total_cost decimal(10,2) NOT NULL,
  
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- 12. EXPENSES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_number text UNIQUE NOT NULL,
  
  -- Expense Details
  category text NOT NULL, -- utilities, rent, salaries, supplies, marketing, etc.
  subcategory text,
  description text NOT NULL,
  amount decimal(10,2) NOT NULL,
  
  -- Payment Info
  payment_method text, -- cash, bank_transfer, card
  reference_number text,
  
  -- References
  supplier_id uuid REFERENCES suppliers(id),
  staff_id uuid REFERENCES staff(id), -- who recorded it
  
  -- Dates
  expense_date date NOT NULL,
  payment_date date,
  due_date date,
  
  -- Status
  payment_status text DEFAULT 'unpaid', -- unpaid, paid, partial
  
  -- Attachments
  receipt_url text,
  
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- 13. CUSTOMER LOYALTY TRANSACTIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  order_id uuid REFERENCES orders(id),
  
  -- Transaction Details
  transaction_type text NOT NULL, -- earn, redeem, adjust, expire
  points integer NOT NULL, -- positive for earn, negative for redeem
  
  -- Points Calculation
  amount_spent decimal(10,2), -- for earn transactions
  points_rate decimal(5,2), -- points per peso
  
  description text,
  expires_at timestamptz, -- if points have expiry
  
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Customers
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_customer_code ON customers(customer_code);
CREATE INDEX idx_customers_active ON customers(is_active);

-- Staff
CREATE INDEX idx_staff_staff_code ON staff(staff_code);
CREATE INDEX idx_staff_role ON staff(role);
CREATE INDEX idx_staff_status ON staff(employment_status);

-- Orders
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_staff_id ON orders(staff_id);
CREATE INDEX idx_orders_order_date ON orders(order_date);
CREATE INDEX idx_orders_order_status ON orders(order_status);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_session_id ON orders(cash_drawer_session_id);

-- Order Items
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_menu_item_id ON order_items(menu_item_id);

-- Payments
CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_payment_method ON payments(payment_method);
CREATE INDEX idx_payments_payment_date ON payments(payment_date);

-- Inventory
CREATE INDEX idx_inventory_menu_item_id ON inventory(menu_item_id);
CREATE INDEX idx_inventory_sku ON inventory(sku);
CREATE INDEX idx_inventory_barcode ON inventory(barcode);
CREATE INDEX idx_inventory_low_stock ON inventory(is_low_stock);
CREATE INDEX idx_inventory_out_of_stock ON inventory(is_out_of_stock);

-- Stock Movements
CREATE INDEX idx_stock_movements_inventory_id ON stock_movements(inventory_id);
CREATE INDEX idx_stock_movements_movement_date ON stock_movements(movement_date);
CREATE INDEX idx_stock_movements_movement_type ON stock_movements(movement_type);

-- Suppliers
CREATE INDEX idx_suppliers_supplier_code ON suppliers(supplier_code);
CREATE INDEX idx_suppliers_active ON suppliers(is_active);

-- Purchase Orders
CREATE INDEX idx_purchase_orders_supplier_id ON purchase_orders(supplier_id);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX idx_purchase_orders_order_date ON purchase_orders(order_date);

-- Expenses
CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_expenses_expense_date ON expenses(expense_date);
CREATE INDEX idx_expenses_payment_status ON expenses(payment_status);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_drawer_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;

-- Public can read (for online orders)
CREATE POLICY "Anyone can read customers"
  ON customers FOR SELECT TO public USING (true);

-- Authenticated users can manage everything
CREATE POLICY "Authenticated users can manage customers"
  ON customers FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage staff"
  ON staff FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage cash sessions"
  ON cash_drawer_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Anyone can create orders"
  ON orders FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Anyone can read orders"
  ON orders FOR SELECT TO public USING (true);

CREATE POLICY "Authenticated users can manage orders"
  ON orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Anyone can create order items"
  ON order_items FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Anyone can read order items"
  ON order_items FOR SELECT TO public USING (true);

CREATE POLICY "Authenticated users can manage order items"
  ON order_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Anyone can create payments"
  ON payments FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Anyone can read payments"
  ON payments FOR SELECT TO public USING (true);

CREATE POLICY "Authenticated users can manage payments"
  ON payments FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage inventory"
  ON inventory FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage stock movements"
  ON stock_movements FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage suppliers"
  ON suppliers FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage purchase orders"
  ON purchase_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage purchase order items"
  ON purchase_order_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage expenses"
  ON expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage loyalty transactions"
  ON loyalty_transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update timestamps trigger
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_updated_at
  BEFORE UPDATE ON staff
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_updated_at
  BEFORE UPDATE ON inventory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchase_orders_updated_at
  BEFORE UPDATE ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- FUNCTIONS FOR POS OPERATIONS
-- =====================================================

-- Function to generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS text AS $$
DECLARE
  new_number text;
  date_prefix text;
  sequence_num integer;
BEGIN
  date_prefix := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');
  
  SELECT COUNT(*) + 1 INTO sequence_num
  FROM orders
  WHERE order_date::date = CURRENT_DATE;
  
  new_number := 'ORD-' || date_prefix || '-' || LPAD(sequence_num::text, 4, '0');
  
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Function to generate payment number
CREATE OR REPLACE FUNCTION generate_payment_number()
RETURNS text AS $$
DECLARE
  new_number text;
  date_prefix text;
  sequence_num integer;
BEGIN
  date_prefix := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');
  
  SELECT COUNT(*) + 1 INTO sequence_num
  FROM payments
  WHERE payment_date::date = CURRENT_DATE;
  
  new_number := 'PAY-' || date_prefix || '-' || LPAD(sequence_num::text, 4, '0');
  
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Function to generate customer code
CREATE OR REPLACE FUNCTION generate_customer_code()
RETURNS text AS $$
DECLARE
  new_code text;
  sequence_num integer;
BEGIN
  SELECT COUNT(*) + 1 INTO sequence_num FROM customers;
  new_code := 'CUST-' || LPAD(sequence_num::text, 6, '0');
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Function to update inventory after order
CREATE OR REPLACE FUNCTION update_inventory_on_order()
RETURNS trigger AS $$
DECLARE
  inv_record RECORD;
BEGIN
  -- Only process if order is completed and not already processed
  IF NEW.order_status = 'completed' AND (OLD.order_status IS NULL OR OLD.order_status != 'completed') THEN
    
    -- Update inventory for each order item
    FOR inv_record IN 
      SELECT oi.menu_item_id, oi.quantity
      FROM order_items oi
      WHERE oi.order_id = NEW.id AND oi.affects_inventory = true
    LOOP
      -- Update inventory stock
      UPDATE inventory
      SET 
        current_stock = current_stock - inv_record.quantity,
        last_stock_update = NOW(),
        is_low_stock = (current_stock - inv_record.quantity) <= minimum_stock,
        is_out_of_stock = (current_stock - inv_record.quantity) <= 0
      WHERE menu_item_id = inv_record.menu_item_id;
      
      -- Create stock movement record
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
        inv_record.quantity,
        i.current_stock,
        i.current_stock - inv_record.quantity,
        NEW.id,
        NEW.staff_id,
        'Order Sale'
      FROM inventory i
      WHERE i.menu_item_id = inv_record.menu_item_id;
      
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_inventory_on_order
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_inventory_on_order();

-- Function to update customer stats
CREATE OR REPLACE FUNCTION update_customer_stats()
RETURNS trigger AS $$
BEGIN
  IF NEW.payment_status = 'paid' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'paid') THEN
    UPDATE customers
    SET 
      total_orders = total_orders + 1,
      total_spent = total_spent + NEW.total_amount,
      loyalty_points = loyalty_points + FLOOR(NEW.total_amount / 100), -- 1 point per 100 pesos
      last_purchase_date = NEW.order_date,
      first_purchase_date = COALESCE(first_purchase_date, NEW.order_date)
    WHERE id = NEW.customer_id;
    
    -- Create loyalty transaction
    IF NEW.customer_id IS NOT NULL THEN
      INSERT INTO loyalty_transactions (
        customer_id,
        order_id,
        transaction_type,
        points,
        amount_spent,
        points_rate,
        description
      )
      VALUES (
        NEW.customer_id,
        NEW.id,
        'earn',
        FLOOR(NEW.total_amount / 100),
        NEW.total_amount,
        0.01,
        'Points earned from order ' || NEW.order_number
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_customer_stats
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_stats();

-- Function to update cash drawer session totals
CREATE OR REPLACE FUNCTION update_cash_drawer_totals()
RETURNS trigger AS $$
BEGIN
  IF NEW.payment_status = 'paid' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'paid') THEN
    UPDATE cash_drawer_sessions
    SET 
      total_sales = total_sales + NEW.total_amount,
      total_transactions = total_transactions + 1
    WHERE id = NEW.cash_drawer_session_id;
    
    -- Update payment method totals based on payments
    UPDATE cash_drawer_sessions cds
    SET 
      total_cash_sales = (
        SELECT COALESCE(SUM(p.amount), 0)
        FROM payments p
        WHERE p.order_id IN (
          SELECT o.id FROM orders o WHERE o.cash_drawer_session_id = cds.id
        ) AND p.payment_method = 'cash'
      ),
      total_card_sales = (
        SELECT COALESCE(SUM(p.amount), 0)
        FROM payments p
        WHERE p.order_id IN (
          SELECT o.id FROM orders o WHERE o.cash_drawer_session_id = cds.id
        ) AND p.payment_method = 'card'
      ),
      total_gcash_sales = (
        SELECT COALESCE(SUM(p.amount), 0)
        FROM payments p
        WHERE p.order_id IN (
          SELECT o.id FROM orders o WHERE o.cash_drawer_session_id = cds.id
        ) AND p.payment_method IN ('gcash', 'maya', 'paymaya')
      )
    WHERE id = NEW.cash_drawer_session_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_cash_drawer_totals
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_cash_drawer_totals();

-- =====================================================
-- VIEWS FOR REPORTING
-- =====================================================

-- Daily Sales Summary
CREATE OR REPLACE VIEW daily_sales_summary AS
SELECT 
  order_date::date as sale_date,
  COUNT(*) as total_orders,
  SUM(total_amount) as total_sales,
  SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END) as paid_sales,
  AVG(total_amount) as average_order_value,
  SUM(CASE WHEN order_type = 'in-store' THEN total_amount ELSE 0 END) as in_store_sales,
  SUM(CASE WHEN order_type = 'online' THEN total_amount ELSE 0 END) as online_sales,
  SUM(CASE WHEN order_type = 'delivery' THEN total_amount ELSE 0 END) as delivery_sales
FROM orders
WHERE order_status != 'cancelled'
GROUP BY order_date::date
ORDER BY sale_date DESC;

-- Top Selling Products
CREATE OR REPLACE VIEW top_selling_products AS
SELECT 
  oi.menu_item_id,
  oi.item_name,
  COUNT(*) as times_ordered,
  SUM(oi.quantity) as total_quantity_sold,
  SUM(oi.total_price) as total_revenue,
  AVG(oi.unit_price) as average_price
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
WHERE o.order_status != 'cancelled'
GROUP BY oi.menu_item_id, oi.item_name
ORDER BY total_quantity_sold DESC;

-- Low Stock Items
CREATE OR REPLACE VIEW low_stock_items AS
SELECT 
  i.id,
  mi.name,
  i.current_stock,
  i.minimum_stock,
  i.sku,
  i.barcode,
  i.last_restock_date
FROM inventory i
JOIN menu_items mi ON i.menu_item_id = mi.id
WHERE i.is_low_stock = true OR i.is_out_of_stock = true
ORDER BY i.current_stock ASC;

-- Customer Lifetime Value
CREATE OR REPLACE VIEW customer_lifetime_value AS
SELECT 
  c.id,
  c.customer_code,
  c.name,
  c.total_orders,
  c.total_spent,
  c.loyalty_points,
  c.first_purchase_date,
  c.last_purchase_date,
  CASE 
    WHEN c.total_orders = 0 THEN 0
    ELSE c.total_spent / c.total_orders
  END as average_order_value,
  CASE 
    WHEN c.first_purchase_date IS NULL THEN 0
    ELSE EXTRACT(DAYS FROM (COALESCE(c.last_purchase_date, NOW()) - c.first_purchase_date))
  END as customer_age_days
FROM customers c
WHERE c.is_active = true
ORDER BY c.total_spent DESC;

-- =====================================================
-- SAMPLE DATA (Optional - for testing)
-- =====================================================

-- Insert sample staff
INSERT INTO staff (staff_code, name, email, phone, role, pin_code) VALUES
  ('STF-001', 'Admin User', 'admin@foryourpetsonly.com', '09123456789', 'admin', '1234'),
  ('STF-002', 'Jane Cashier', 'jane@foryourpetsonly.com', '09123456790', 'cashier', '5678')
ON CONFLICT (staff_code) DO NOTHING;

-- Insert sample supplier
INSERT INTO suppliers (supplier_code, name, contact_person, email, phone, address) VALUES
  ('SUP-001', 'Pet Supplies Co.', 'John Supplier', 'john@petsupplies.com', '09123456791', '123 Supplier St, Manila'),
  ('SUP-002', 'Quality Pet Foods Inc.', 'Mary Smith', 'mary@petfoods.com', '09123456792', '456 Food Ave, Quezon City')
ON CONFLICT (supplier_code) DO NOTHING;

-- Create inventory records for existing menu items
INSERT INTO inventory (menu_item_id, current_stock, minimum_stock, maximum_stock, reorder_quantity, is_tracked)
SELECT 
  id,
  100, -- current stock
  10,  -- minimum stock
  200, -- maximum stock
  50,  -- reorder quantity
  true -- is tracked
FROM menu_items
ON CONFLICT (menu_item_id) DO NOTHING;

COMMENT ON TABLE customers IS 'Customer information including pet details and loyalty tracking';
COMMENT ON TABLE staff IS 'Staff members who can operate the POS system';
COMMENT ON TABLE cash_drawer_sessions IS 'Cash drawer opening/closing sessions for reconciliation';
COMMENT ON TABLE orders IS 'Sales transactions/orders from customers';
COMMENT ON TABLE order_items IS 'Individual items within each order';
COMMENT ON TABLE payments IS 'Payment records for orders (supports split payments)';
COMMENT ON TABLE inventory IS 'Current stock levels and inventory information';
COMMENT ON TABLE stock_movements IS 'All stock movements (in, out, adjustments)';
COMMENT ON TABLE suppliers IS 'Supplier information for purchase orders';
COMMENT ON TABLE purchase_orders IS 'Purchase orders to suppliers';
COMMENT ON TABLE expenses IS 'Business expenses tracking';
COMMENT ON TABLE loyalty_transactions IS 'Customer loyalty points transactions';

