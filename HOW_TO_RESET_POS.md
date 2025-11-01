# 🔄 How to Reset POS Data

## ✅ **Quick Reset Guide**

Use this to clear all test data and start fresh!

---

## 🎯 **What Gets Reset**

### **DELETED (Cleared):**
- ❌ All orders
- ❌ All payments
- ❌ All customers
- ❌ All sales history
- ❌ Cash drawer sessions
- ❌ Stock movements
- ❌ Loyalty transactions

### **KEPT (Preserved):**
- ✅ Products (menu items)
- ✅ Categories
- ✅ Staff members
- ✅ Suppliers
- ✅ Site settings
- ✅ Payment methods

### **RESET TO DEFAULT:**
- 🔄 Inventory → 100 units per product
- 🔄 Staff stats → 0
- 🔄 Supplier stats → 0

---

## 🚀 **How to Reset (2 Ways)**

### **METHOD 1: Using SQL File (Recommended)**

1. **Open the reset file:**
   ```
   RESET_POS_DATA.sql
   ```

2. **Copy ALL contents**
   - Select all (Ctrl+A)
   - Copy (Ctrl+C)

3. **Go to Supabase:**
   - Open: https://supabase.com/dashboard
   - Select your project
   - Click "SQL Editor"

4. **Paste and run:**
   - Paste the SQL
   - Click "RUN" button
   - Wait for "Success"

5. **Verify:**
   - Should see: "✅ POS DATA RESET COMPLETE!"
   - Shows counts of remaining data

6. **Refresh your POS:**
   - Go to your website
   - Ctrl+Shift+R (hard refresh)
   - POS Dashboard now shows 0 sales ✅

---

### **METHOD 2: Quick SQL (Faster)**

Just run this in Supabase SQL Editor:

```sql
-- Quick reset (copy and paste this)
-- IMPORTANT: Delete in correct order to avoid foreign key errors!
BEGIN;

-- Delete in correct order (dependencies first)
DELETE FROM stock_movements;        -- Must delete FIRST (references orders)
DELETE FROM loyalty_transactions;   -- References customers & orders
DELETE FROM order_items;            -- References orders
DELETE FROM payments;               -- References orders
DELETE FROM cash_drawer_sessions;   -- May reference orders
DELETE FROM orders;                 -- Now safe to delete
DELETE FROM customers;              -- Delete last

-- Reset inventory
UPDATE inventory 
SET current_stock = 100, 
    minimum_stock = 10,
    is_low_stock = false, 
    is_out_of_stock = false;

COMMIT;

SELECT '✅ Reset complete!' as status;
```

---

## ⚠️ **IMPORTANT NOTES**

### **Before Resetting:**

**Consider:**
- This DELETES all sales data
- This DELETES all customers
- This CANNOT be undone!
- Use only for testing/demo

**Backup First (Optional):**
```sql
-- Save orders to backup table
CREATE TABLE orders_backup AS SELECT * FROM orders;
CREATE TABLE customers_backup AS SELECT * FROM customers;
```

---

## 🎯 **After Reset**

### **Your POS will show:**
- Total Sales: ₱0.00 ✅
- Total Orders: 0 ✅
- Customers: 0 ✅
- Inventory: All at 100 units ✅
- Fresh start! ✅

### **You can now:**
- Test the system again
- Train staff with clean data
- Start real operations
- Demo to others

---

## 📋 **Step-by-Step Reset**

```
1. Open RESET_POS_DATA.sql
2. Copy all (Ctrl+A, Ctrl+C)
3. Supabase → SQL Editor
4. Paste
5. Click RUN
6. Wait for success
7. Refresh browser (Ctrl+Shift+R)
8. POS Dashboard shows 0 ✅
9. All inventory reset to 100 ✅
10. Ready to start fresh! 🎉
```

---

## 🔍 **Verify Reset Worked**

### **Check in Supabase SQL Editor:**

```sql
-- Verify all cleared
SELECT 'Orders' as table_name, COUNT(*) as count FROM orders;
SELECT 'Customers' as table_name, COUNT(*) as count FROM customers;
SELECT 'Payments' as table_name, COUNT(*) as count FROM payments;

-- Should all show: 0

-- Check inventory reset
SELECT 
  COUNT(*) as total_products,
  AVG(current_stock) as avg_stock
FROM inventory;

-- Should show: avg_stock = 100
```

### **Check in POS Dashboard:**

```
POS Dashboard:
- Today's Sales: ₱0.00 ✅
- Total Orders: 0 ✅
- Recent Orders: (empty) ✅

Inventory:
- All products: 100 units ✅
- No low stock alerts ✅
```

---

## 💡 **Use Cases**

### **When to Reset:**

✅ **Testing/Development**
- Want to test again with clean data
- Demonstrating to others
- Training staff

✅ **Before Going Live**
- Clear all test orders
- Reset inventory to actual stock
- Start with real data

✅ **After Demo**
- Showed to client/staff
- Want to clear demo data
- Start fresh

❌ **DON'T Reset:**
- During active business operations
- With real customer data you need
- Without backup

---

## 🎊 **What Happens**

### **Immediate Effects:**

```
BEFORE RESET:
- Orders: 25
- Sales: ₱12,500
- Customers: 15
- Inventory: Various levels

AFTER RESET:
- Orders: 0 ✅
- Sales: ₱0.00 ✅
- Customers: 0 ✅
- Inventory: All 100 units ✅
```

### **In POS Interface:**

```
Dashboard:
- All stats show 0
- No recent orders
- No low stock alerts
- Clean slate! ✅

Inventory:
- All products at 100 units
- No stock movements
- Fresh tracking

Customers:
- Empty list
- Ready to add real customers
```

---

## 🔄 **Alternative: Partial Reset**

If you want to keep customers but reset sales:

```sql
-- Keep customers, only reset sales
BEGIN;

DELETE FROM order_items;
DELETE FROM payments;
DELETE FROM orders;
DELETE FROM stock_movements;
DELETE FROM cash_drawer_sessions;

UPDATE inventory SET current_stock = 100;

COMMIT;
```

---

## 🎯 **Quick Reset Commands**

### **Full Reset:**
```
Run: RESET_POS_DATA.sql in Supabase
Result: Everything cleared
```

### **Keep Customers:**
```sql
-- Keep customers but reset sales
BEGIN;

DELETE FROM stock_movements;
DELETE FROM order_items;
DELETE FROM payments;
DELETE FROM cash_drawer_sessions;
DELETE FROM orders;
-- Skip: DELETE FROM customers;
-- Skip: DELETE FROM loyalty_transactions;

UPDATE inventory SET current_stock = 100;

COMMIT;
```

### **Custom Stock Levels:**
```sql
-- Instead of 100, set to your actual stock:
UPDATE inventory SET current_stock = 50;  -- or any number
```

---

## ✅ **READY TO RESET?**

**Do this now:**

1. **Open:** `RESET_POS_DATA.sql`
2. **Copy all:** Ctrl+A, Ctrl+C
3. **Supabase:** SQL Editor
4. **Paste:** Ctrl+V
5. **Run:** Click RUN button
6. **Wait:** 2-3 seconds
7. **Success:** "✅ POS DATA RESET COMPLETE!"
8. **Refresh:** Your POS Dashboard (Ctrl+Shift+R)
9. **Done:** All stats show 0, inventory at 100! ✅

---

**Your POS data is now reset and ready for a fresh start!** 🎉

