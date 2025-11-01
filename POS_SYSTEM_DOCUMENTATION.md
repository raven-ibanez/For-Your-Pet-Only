# 🐾 For Your Pets Only - POS System Documentation

## 📋 Table of Contents

1. [Overview](#overview)
2. [Database Schema](#database-schema)
3. [Core Features](#core-features)
4. [API Functions](#api-functions)
5. [Usage Examples](#usage-examples)
6. [Reports & Analytics](#reports--analytics)
7. [Installation](#installation)
8. [Best Practices](#best-practices)

---

## 🎯 Overview

This is a comprehensive Point of Sale (POS) system designed specifically for "For Your Pets Only" pet store. The system handles:

- **Sales Transactions** - Complete order processing
- **Inventory Management** - Real-time stock tracking
- **Customer Management** - Customer profiles with pet information
- **Staff Management** - Cashier and staff tracking
- **Payment Processing** - Multiple payment methods
- **Analytics & Reports** - Business intelligence and insights
- **Loyalty Program** - Customer rewards and points
- **Supplier Management** - Purchase orders and supplier tracking

---

## 🗄️ Database Schema

### Core Tables

#### 1. **customers**
Stores customer information including pet details and loyalty data.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| customer_code | text | Unique customer code (CUST-XXXXXX) |
| name | text | Customer name |
| email | text | Email address |
| phone | text | Phone number |
| address | text | Full address |
| pet_name | text | Name of customer's pet |
| pet_type | text | Type (dog, cat, bird, etc.) |
| pet_breed | text | Pet breed |
| total_orders | integer | Lifetime order count |
| total_spent | decimal | Lifetime spending |
| loyalty_points | integer | Current loyalty points |

#### 2. **staff**
Staff members who can operate the POS.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| staff_code | text | Unique staff code (STF-XXX) |
| name | text | Staff name |
| role | text | cashier, manager, admin |
| pin_code | text | PIN for POS login |
| total_sales | decimal | Total sales made |
| total_transactions | integer | Transaction count |

#### 3. **orders**
Sales transactions.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| order_number | text | Unique order number (ORD-YYYYMMDD-XXXX) |
| customer_id | uuid | Reference to customer |
| staff_id | uuid | Staff who processed |
| order_type | text | in-store, online, delivery |
| subtotal | decimal | Order subtotal |
| discount_amount | decimal | Discount applied |
| total_amount | decimal | Final total |
| payment_status | text | pending, paid, partial, refunded |
| order_status | text | pending, processing, completed, cancelled |

#### 4. **order_items**
Individual items in orders.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| order_id | uuid | Reference to order |
| menu_item_id | uuid | Reference to product |
| item_name | text | Product name (snapshot) |
| unit_price | decimal | Price per unit |
| quantity | integer | Quantity ordered |
| total_price | decimal | Total for this item |
| selected_add_ons | jsonb | Add-ons selected |

#### 5. **payments**
Payment records (supports split payments).

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| payment_number | text | Unique (PAY-YYYYMMDD-XXXX) |
| order_id | uuid | Reference to order |
| payment_method | text | cash, card, gcash, maya |
| amount | decimal | Payment amount |
| reference_number | text | Digital payment reference |

#### 6. **inventory**
Stock levels and inventory tracking.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| menu_item_id | uuid | Reference to product |
| current_stock | integer | Current stock level |
| minimum_stock | integer | Low stock threshold |
| maximum_stock | integer | Maximum stock level |
| unit_cost | decimal | Cost per unit |
| sku | text | Stock Keeping Unit |
| is_low_stock | boolean | Low stock alert |
| is_out_of_stock | boolean | Out of stock flag |

#### 7. **stock_movements**
All stock changes (in, out, adjustments).

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| reference_number | text | Unique reference |
| movement_type | text | in, out, adjustment, wastage |
| quantity | integer | Quantity moved |
| stock_before | integer | Stock before movement |
| stock_after | integer | Stock after movement |
| reason | text | Reason for movement |

#### 8. **cash_drawer_sessions**
Cash drawer opening/closing for reconciliation.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| session_number | text | Unique session ID |
| staff_id | uuid | Cashier |
| opened_at | timestamptz | Session start |
| closed_at | timestamptz | Session end |
| opening_cash | decimal | Starting cash |
| closing_cash | decimal | Ending cash |
| cash_difference | decimal | Discrepancy |
| total_sales | decimal | Total sales in session |

#### 9. **suppliers**
Supplier information.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| supplier_code | text | Unique supplier code |
| name | text | Supplier name |
| contact_person | text | Contact name |
| email | text | Email address |
| phone | text | Phone number |
| total_purchases | decimal | Total purchases |

#### 10. **purchase_orders**
Purchase orders to suppliers.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| po_number | text | Unique PO number |
| supplier_id | uuid | Reference to supplier |
| total_amount | decimal | Total PO amount |
| status | text | draft, sent, received, cancelled |

#### 11. **expenses**
Business expense tracking.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| expense_number | text | Unique expense ID |
| category | text | Expense category |
| amount | decimal | Expense amount |
| expense_date | date | Date of expense |
| payment_status | text | unpaid, paid, partial |

#### 12. **loyalty_transactions**
Customer loyalty points tracking.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| customer_id | uuid | Reference to customer |
| order_id | uuid | Related order |
| transaction_type | text | earn, redeem, adjust |
| points | integer | Points (+ or -) |

---

## ✨ Core Features

### 1. **Sales Processing**

Complete order lifecycle:
1. Create order
2. Add items
3. Apply discounts
4. Process payment(s)
5. Update inventory
6. Award loyalty points

### 2. **Inventory Management**

- **Real-time tracking** - Stock updates automatically
- **Low stock alerts** - Notifications when stock is low
- **Stock movements** - Full audit trail
- **Wastage tracking** - Record damaged/expired items
- **Automatic reorder** - Suggested reorder quantities

### 3. **Customer Management**

- **Customer profiles** - Complete customer information
- **Pet profiles** - Track pet details (name, type, breed, age)
- **Purchase history** - Lifetime order tracking
- **Loyalty program** - Points earning and redemption
- **Customer analytics** - Spending patterns and preferences

### 4. **Staff Management**

- **Role-based access** - Admin, Manager, Cashier
- **PIN authentication** - Secure POS login
- **Performance tracking** - Sales per staff member
- **Commission calculation** - Based on sales

### 5. **Cash Management**

- **Cash drawer sessions** - Opening/closing procedures
- **Cash reconciliation** - Track discrepancies
- **Payment methods** - Cash, Card, GCash, Maya, etc.
- **Split payments** - Multiple payment methods per order

### 6. **Analytics & Reporting**

- Daily/weekly/monthly sales reports
- Product performance analysis
- Customer lifetime value
- Inventory valuation
- Staff performance metrics

---

## 🔧 API Functions

### Sales Functions

#### `generate_order_number()`
Auto-generates order numbers in format: `ORD-YYYYMMDD-XXXX`

```sql
SELECT generate_order_number();
-- Returns: 'ORD-20250102-0001'
```

#### `generate_payment_number()`
Auto-generates payment numbers: `PAY-YYYYMMDD-XXXX`

```sql
SELECT generate_payment_number();
-- Returns: 'PAY-20250102-0001'
```

### Analytics Functions

#### `get_sales_by_date_range(start_date, end_date)`
Get comprehensive sales statistics.

```sql
SELECT * FROM get_sales_by_date_range('2025-01-01', '2025-01-31');
```

**Returns:**
- total_orders
- total_sales
- total_paid
- average_order_value
- total_customers
- total_items_sold

#### `get_product_performance(days_back)`
Analyze product performance.

```sql
SELECT * FROM get_product_performance(30);
```

**Returns:**
- product_name
- times_ordered
- total_quantity
- total_revenue
- profit_margin
- stock_turnover_rate

#### `get_customer_analytics()`
Overall customer statistics.

```sql
SELECT * FROM get_customer_analytics();
```

**Returns:**
- total_customers
- active_customers
- new_customers_this_month
- average_customer_value
- total_loyalty_points

#### `get_inventory_valuation()`
Current inventory value and status.

```sql
SELECT * FROM get_inventory_valuation();
```

**Returns:**
- total_items
- total_stock
- total_value
- low_stock_items
- out_of_stock_items

#### `get_payment_method_breakdown(days_back)`
Payment method analysis.

```sql
SELECT * FROM get_payment_method_breakdown(30);
```

**Returns:**
- payment_method
- transaction_count
- total_amount
- percentage

#### `get_staff_performance(days_back)`
Staff sales performance.

```sql
SELECT * FROM get_staff_performance(30);
```

**Returns:**
- staff_name
- total_orders
- total_sales
- average_order_value
- orders_per_day

### Inventory Functions

#### `add_stock(menu_item_id, quantity, unit_cost, supplier_id, staff_id, notes)`
Add stock to inventory.

```sql
SELECT add_stock(
  'menu-item-uuid'::uuid,
  50,                    -- quantity
  150.00,                -- unit cost
  'supplier-uuid'::uuid,
  'staff-uuid'::uuid,
  'Restocking from Supplier'
);
```

#### `adjust_stock(menu_item_id, new_quantity, staff_id, reason, notes)`
Adjust stock levels (for physical counts).

```sql
SELECT adjust_stock(
  'menu-item-uuid'::uuid,
  75,                    -- new quantity
  'staff-uuid'::uuid,
  'Physical count adjustment',
  'Annual inventory check'
);
```

#### `record_wastage(menu_item_id, quantity, staff_id, reason, notes)`
Record damaged/expired items.

```sql
SELECT record_wastage(
  'menu-item-uuid'::uuid,
  5,                     -- quantity wasted
  'staff-uuid'::uuid,
  'Damaged packaging',
  'Damaged during delivery'
);
```

---

## 📊 Reports & Analytics

### Pre-built Views

#### `daily_sales_summary`
Daily sales overview.

```sql
SELECT * FROM daily_sales_summary 
WHERE sale_date >= CURRENT_DATE - 7;
```

#### `top_selling_products`
Best selling products.

```sql
SELECT * FROM top_selling_products 
LIMIT 10;
```

#### `low_stock_items`
Items needing restock.

```sql
SELECT * FROM low_stock_items;
```

#### `customer_lifetime_value`
Customer value analysis.

```sql
SELECT * FROM customer_lifetime_value 
ORDER BY total_spent DESC 
LIMIT 20;
```

#### `items_need_reorder`
Items below minimum stock.

```sql
SELECT * FROM items_need_reorder;
```

#### `revenue_by_category`
Sales by product category.

```sql
SELECT * FROM revenue_by_category;
```

#### `monthly_comparison`
Month-over-month comparison.

```sql
SELECT * FROM monthly_comparison;
```

---

## 💻 Usage Examples

### Example 1: Create a New Sale

```sql
-- 1. Create order
INSERT INTO orders (
  order_number,
  customer_id,
  staff_id,
  order_type,
  subtotal,
  total_amount,
  payment_status,
  order_status
)
VALUES (
  generate_order_number(),
  'customer-uuid',
  'staff-uuid',
  'in-store',
  1500.00,
  1500.00,
  'paid',
  'completed'
)
RETURNING id;

-- 2. Add order items
INSERT INTO order_items (
  order_id,
  menu_item_id,
  item_name,
  unit_price,
  quantity,
  total_price
)
VALUES (
  'order-uuid',
  'product-uuid',
  'Premium Dog Food 5kg',
  500.00,
  3,
  1500.00
);

-- 3. Record payment
INSERT INTO payments (
  payment_number,
  order_id,
  payment_method,
  amount,
  payment_status
)
VALUES (
  generate_payment_number(),
  'order-uuid',
  'cash',
  1500.00,
  'completed'
);
```

### Example 2: Register New Customer

```sql
INSERT INTO customers (
  customer_code,
  name,
  phone,
  email,
  address,
  pet_name,
  pet_type,
  pet_breed
)
VALUES (
  generate_customer_code(),
  'Juan Dela Cruz',
  '09123456789',
  'juan@email.com',
  '123 Main St, Manila',
  'Bruno',
  'dog',
  'Golden Retriever'
);
```

### Example 3: Open Cash Drawer Session

```sql
INSERT INTO cash_drawer_sessions (
  session_number,
  staff_id,
  opening_cash,
  status
)
VALUES (
  'SESS-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-001',
  'staff-uuid',
  5000.00,  -- starting cash
  'open'
);
```

### Example 4: Close Cash Drawer Session

```sql
UPDATE cash_drawer_sessions
SET 
  status = 'closed',
  closed_at = NOW(),
  closing_cash = 12500.00,
  expected_cash = 12000.00,
  cash_difference = 500.00  -- extra 500
WHERE session_number = 'SESS-20250102-001';
```

---

## 🚀 Installation

### Step 1: Run Migrations

```bash
# Navigate to your project directory
cd your-project-folder

# Run migrations in order
supabase migration up
```

Or manually run in Supabase SQL Editor:

1. `20250102000000_create_pos_system.sql`
2. `20250102000001_pos_advanced_features.sql`

### Step 2: Verify Installation

```sql
-- Check tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_name IN (
  'customers', 'staff', 'orders', 'order_items', 
  'payments', 'inventory', 'suppliers'
);

-- Check functions
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND routine_name LIKE 'get_%';
```

### Step 3: Set Up Initial Data

The migrations include sample data:
- 2 staff members (Admin, Cashier)
- 2 suppliers
- Inventory records for all existing products

---

## 📝 Best Practices

### 1. **Order Processing**
- Always use transactions for order creation
- Verify inventory before completing orders
- Record all payment methods accurately
- Update order status progressively

### 2. **Inventory Management**
- Conduct regular physical counts
- Use `adjust_stock()` for corrections
- Track wastage separately
- Set realistic minimum stock levels

### 3. **Cash Handling**
- Open drawer session at start of shift
- Close drawer session at end of shift
- Reconcile cash daily
- Investigate discrepancies

### 4. **Customer Management**
- Keep pet information updated
- Award loyalty points automatically
- Track customer preferences
- Send notifications for promotions

### 5. **Reporting**
- Review daily sales summaries
- Monitor low stock items
- Analyze top-selling products
- Track staff performance

---

## 🎯 Key Metrics to Monitor

1. **Daily Sales** - Track against targets
2. **Average Order Value** - Optimize pricing/upselling
3. **Stock Turnover** - Identify slow-moving items
4. **Customer Retention** - Repeat customer rate
5. **Profit Margins** - By product/category
6. **Cash Discrepancies** - Minimize errors
7. **Staff Performance** - Sales per employee

---

## 🔒 Security

- Row Level Security (RLS) enabled on all tables
- Public can create orders (online orders)
- Authenticated users can manage POS
- Staff PIN codes for POS login
- Audit trail for all transactions

---

## 📞 Support

For questions or issues:
- Check the database comments: `COMMENT ON TABLE ...`
- Review function documentation
- Check migration files for updates

---

**Made with ❤️ for For Your Pets Only 🐾**

