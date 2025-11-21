import { supabase } from './supabase';

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export interface Customer {
  id: string;
  customer_code: string;
  name: string;
  email?: string;
  phone: string;
  address?: string;
  pet_name?: string;
  pet_type?: string;
  pet_breed?: string;
  pet_age?: number;
  total_orders: number;
  total_spent: number;
  loyalty_points: number;
  created_at: string;
}

export interface Staff {
  id: string;
  staff_code: string;
  name: string;
  email?: string;
  role: 'admin' | 'manager' | 'cashier';
  total_sales: number;
  total_transactions: number;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id?: string;
  staff_id?: string;
  order_type: 'in-store' | 'online' | 'delivery';
  subtotal: number;
  discount_amount: number;
  total_amount: number;
  payment_status: 'pending' | 'paid' | 'partial' | 'refunded';
  order_status: 'pending' | 'processing' | 'completed' | 'cancelled';
  order_date: string;
}

export interface InventoryItem {
  id: string;
  menu_item_id: string;
  current_stock: number;
  minimum_stock: number;
  maximum_stock?: number;
  unit_cost?: number;
  sku?: string;
  is_low_stock: boolean;
  is_out_of_stock: boolean;
  menu_items?: {
    name: string;
    base_price: number;
    category: string;
  };
}

export interface SalesSummary {
  total_orders: number;
  total_sales: number;
  total_paid: number;
  average_order_value: number;
  total_customers: number;
  total_items_sold: number;
}

// =====================================================
// POS API
// =====================================================

export const posAPI = {
  // ==================== CUSTOMERS ====================
  
  async getAllCustomers() {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(100);
    
    if (error) throw error;
    return data as Customer[];
  },

  async findCustomerByPhone(phone: string) {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .ilike('phone', `%${phone}%`)
      .eq('is_active', true)
      .limit(10);
    
    if (error) throw error;
    return data as Customer[];
  },

  async createCustomer(customerData: {
    name: string;
    phone: string;
    email?: string;
    address?: string;
    pet_name?: string;
    pet_type?: string;
    pet_breed?: string;
    pet_age?: number;
  }) {
    try {
      // Generate customer code
      const customerCode = `CUST-${Date.now().toString().slice(-6)}`;
      
      const { data, error } = await supabase
        .from('customers')
        .insert([{
          customer_code: customerCode,  // Generate customer code
          ...customerData
        }])
        .select()
        .single();
      
      if (error) {
        console.error('Create customer error:', error);
        throw new Error(`Failed to create customer: ${error.message}`);
      }
      
      return data as Customer;
    } catch (error: any) {
      console.error('Create customer failed:', error);
      throw error;
    }
  },

  // ==================== STAFF ====================
  
  async getAllStaff() {
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .eq('employment_status', 'active')
      .order('name');
    
    if (error) throw error;
    return data as Staff[];
  },

  // ==================== ORDERS ====================
  
  async createOrder(orderData: {
    customer_id?: string;
    staff_id?: string;
    order_type: string;
    customer_name?: string;
    customer_phone?: string;
    items: {
      menu_item_id: string;
      item_name: string;
      unit_price: number;
      quantity: number;
    }[];
    discount_amount?: number;
  }) {
    try {
      // Calculate totals
      const subtotal = orderData.items.reduce(
        (sum, item) => sum + (item.unit_price * item.quantity), 
        0
      );
      const discount = orderData.discount_amount || 0;
      const total = subtotal - discount;

      // Generate order number
      const orderNumber = `ORD-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
      
      console.log('Generated order number:', orderNumber);

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([{
          order_number: orderNumber,  // Generate order number here!
          customer_id: orderData.customer_id,
          staff_id: orderData.staff_id,
          order_type: orderData.order_type,
          customer_name: orderData.customer_name,
          customer_phone: orderData.customer_phone,
          subtotal,
          discount_amount: discount,
          total_amount: total,
          payment_status: 'pending',
          order_status: 'pending'
        }])
        .select()
        .single();

      if (orderError) {
        console.error('Order creation error:', orderError);
        throw new Error(`Failed to create order: ${orderError.message}`);
      }

      // Create order items
      const orderItems = orderData.items.map(item => ({
        order_id: order.id,
        menu_item_id: item.menu_item_id,
        item_name: item.item_name,
        unit_price: item.unit_price,
        quantity: item.quantity,
        total_price: item.unit_price * item.quantity
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        console.error('Order items error:', itemsError);
        throw new Error(`Failed to add items: ${itemsError.message}`);
      }

      return order as Order;
    } catch (error: any) {
      console.error('Create order error:', error);
      throw new Error(error.message || 'Failed to create order');
    }
  },

  async completeOrder(orderId: string) {
    try {
      console.log('Completing order:', orderId);
      
      const { data, error } = await supabase
        .from('orders')
        .update({
          payment_status: 'paid',
          order_status: 'completed',
          paid_at: new Date().toISOString(),
          completed_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .select()
        .single();

      if (error) {
        console.error('Complete order error:', error);
        throw new Error(`Failed to complete order: ${error.message}`);
      }
      
      console.log('Order completed:', data);
      return data as Order;
    } catch (error: any) {
      console.error('Complete order failed:', error);
      throw error;
    }
  },

  // Manual inventory update (comprehensive with create if not exists)
  async updateInventoryManual(menuItemId: string, quantitySold: number) {
    try {
      console.log('📦 Updating inventory for item:', menuItemId, 'Quantity sold:', quantitySold);
      
      // First, check if inventory record exists
      const { data: inventory, error: fetchError } = await supabase
        .from('inventory')
        .select('*')
        .eq('menu_item_id', menuItemId)
        .maybeSingle();

      if (fetchError) {
        console.error('❌ Fetch inventory error:', fetchError);
        return { success: false, error: fetchError.message };
      }

      // If no inventory record exists, create one
      if (!inventory) {
        console.log('⚠️ No inventory record found, creating one...');
        const { data: newInventory, error: createError } = await supabase
          .from('inventory')
          .insert([{
            menu_item_id: menuItemId,
            current_stock: Math.max(0, 100 - quantitySold), // Start with 100, subtract sold
            minimum_stock: 10,
            maximum_stock: 200,
            unit_cost: 100,
            is_tracked: true,
            is_low_stock: (100 - quantitySold) <= 10,
            is_out_of_stock: (100 - quantitySold) <= 0,
            last_stock_update: new Date().toISOString()
          }])
          .select()
          .single();

        if (createError) {
          console.error('❌ Create inventory error:', createError);
          return { success: false, error: createError.message };
        }
        
        console.log('✅ Inventory record created with stock:', newInventory.current_stock);
        return { success: true, oldStock: 100, newStock: newInventory.current_stock };
      }

      // Calculate new stock
      const oldStock = inventory.current_stock;
      const newStock = Math.max(0, oldStock - quantitySold); // Can't go below 0
      const minStock = inventory.minimum_stock || 10;

      console.log(`📊 Stock calculation: ${oldStock} - ${quantitySold} = ${newStock}`);
      
      // Update inventory
      const { data: updated, error: updateError } = await supabase
        .from('inventory')
        .update({
          current_stock: newStock,
          is_low_stock: newStock <= minStock,
          is_out_of_stock: newStock <= 0,
          last_stock_update: new Date().toISOString()
        })
        .eq('menu_item_id', menuItemId)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Update inventory error:', updateError);
        return { success: false, error: updateError.message };
      }

      console.log(`✅ Inventory updated successfully! Old: ${oldStock}, New: ${newStock}`);
      return { success: true, oldStock, newStock, lowStock: updated.is_low_stock, outOfStock: updated.is_out_of_stock };
    } catch (error: any) {
      console.error('❌ Manual inventory update failed:', error);
      return { success: false, error: error.message };
    }
  },

  // Batch inventory update for multiple items
  async updateInventoryBatch(items: { menuItemId: string; quantity: number }[]) {
    const results = [];
    for (const item of items) {
      const result = await this.updateInventoryManual(item.menuItemId, item.quantity);
      results.push({ ...item, result });
    }
    return results;
  },

  // Get inventory for specific item
  async getInventoryForItem(menuItemId: string) {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select(`
          *,
          menu_items (
            name,
            base_price
          )
        `)
        .eq('menu_item_id', menuItemId)
        .single();

      if (error) {
        console.error('Get inventory error:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Get inventory failed:', error);
      return null;
    }
  },

  // Sync inventory - creates inventory records for products that don't have them
  async syncInventory() {
    try {
      console.log('🔄 Syncing inventory with menu items...');

      // Get all menu items with prices
      const { data: menuItems, error: menuError } = await supabase
        .from('menu_items')
        .select('id, name, base_price');

      if (menuError) throw menuError;

      console.log(`📦 Found ${menuItems?.length || 0} total products in database`);

      // Get all existing inventory records
      const { data: existingInventory, error: invError } = await supabase
        .from('inventory')
        .select('menu_item_id');

      if (invError) throw invError;

      console.log(`📊 Found ${existingInventory?.length || 0} existing inventory records`);

      const existingItemIds = new Set(existingInventory?.map(inv => inv.menu_item_id) || []);
      
      // Find items without inventory
      const missingInventory = menuItems?.filter(item => !existingItemIds.has(item.id)) || [];

      console.log(`⚠️ Found ${missingInventory.length} products WITHOUT inventory records`);

      if (missingInventory.length > 0) {
        console.log('Creating inventory for:', missingInventory.map(i => i.name).join(', '));

        // Create inventory records for missing items using their actual base_price
        const newInventoryRecords = missingInventory.map(item => ({
          menu_item_id: item.id,
          current_stock: 100,
          minimum_stock: 10,
          maximum_stock: 200,
          unit_cost: item.base_price || 100,  // Use actual product price!
          average_cost: item.base_price || 100,
          is_tracked: true,
          is_low_stock: false,
          is_out_of_stock: false,
          last_stock_update: new Date().toISOString()
        }));

        const { data, error: insertError } = await supabase
          .from('inventory')
          .insert(newInventoryRecords)
          .select();

        if (insertError) {
          console.error('❌ Insert error:', insertError);
          throw insertError;
        }

        console.log(`✅ Successfully created ${newInventoryRecords.length} new inventory records!`);
        return { created: newInventoryRecords.length, items: data };
      } else {
        console.log('✅ All products already have inventory records');
        return { created: 0, items: [] };
      }
    } catch (error: any) {
      console.error('❌ Sync inventory failed:', error);
      throw error;
    }
  },

  // Update unit costs for existing inventory based on product prices
  async updateUnitCosts() {
    try {
      console.log('💰 Updating unit costs from product prices...');

      // Get all inventory with their menu items
      const { data: inventory, error } = await supabase
        .from('inventory')
        .select(`
          id,
          menu_item_id,
          unit_cost,
          menu_items (
            base_price
          )
        `);

      if (error) throw error;

      let updated = 0;
      
      // Update inventory where unit_cost is 0 or null
      for (const inv of inventory || []) {
        if (!inv.unit_cost || inv.unit_cost === 0) {
          const basePrice = (inv.menu_items as any)?.base_price;
          if (basePrice && basePrice > 0) {
            const { error: updateError } = await supabase
              .from('inventory')
              .update({
                unit_cost: basePrice,
                average_cost: basePrice
              })
              .eq('id', inv.id);

            if (!updateError) {
              updated++;
              console.log(`Updated unit cost for item to ₱${basePrice}`);
            }
          }
        }
      }

      console.log(`✅ Updated ${updated} inventory unit costs`);
      return { updated };
    } catch (error: any) {
      console.error('❌ Update unit costs failed:', error);
      throw error;
    }
  },

  async getTodayOrders() {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        customers (name, phone, pet_name)
      `)
      .gte('order_date', today)
      .order('order_date', { ascending: false })
      .limit(50);

    if (error) throw error;
    return data;
  },

  async getPendingPayments() {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('payment_status', 'pending')
      .eq('order_status', 'completed')
      .order('order_date', { ascending: false });

    if (error) throw error;
    return data;
  },

  async markOrderAsPaid(orderId: string, paymentData: {
    payment_method: string;
    amount: number;
    reference_number?: string;
  }) {
    try {
      // Create payment record
      await this.createPayment({
        order_id: orderId,
        payment_method: paymentData.payment_method,
        amount: paymentData.amount,
        reference_number: paymentData.reference_number
      });

      // Update order payment status
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          payment_status: 'paid',
          paid_at: new Date().toISOString(),
          paid_amount: paymentData.amount
        })
        .eq('id', orderId);

      if (updateError) throw updateError;
      
      return { success: true };
    } catch (error: any) {
      console.error('Error marking order as paid:', error);
      throw error;
    }
  },

  // ==================== PAYMENTS ====================
  
  async createPayment(paymentData: {
    order_id: string;
    payment_method: string;
    amount: number;
    reference_number?: string;
  }) {
    // Generate payment number
    const paymentNumber = `PAY-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    
    const { data, error } = await supabase
      .from('payments')
      .insert([{
        payment_number: paymentNumber,  // Generate payment number here!
        ...paymentData,
        payment_status: 'completed'
      }])
      .select()
      .single();

    if (error) {
      console.error('Payment creation error:', error);
      throw new Error(`Failed to create payment: ${error.message}`);
    }
    return data;
  },

  // ==================== INVENTORY ====================
  
  async getInventory() {
    const { data, error } = await supabase
      .from('inventory')
      .select(`
        *,
        menu_items (
          id,
          name,
          base_price,
          category
        )
      `)
      .eq('is_tracked', true)
      .order('current_stock', { ascending: true });

    if (error) throw error;
    return data as InventoryItem[];
  },

  async getLowStockItems() {
    const { data, error } = await supabase
      .from('inventory')
      .select(`
        *,
        menu_items (
          name,
          base_price,
          category
        )
      `)
      .eq('is_tracked', true)
      .or('is_low_stock.eq.true,is_out_of_stock.eq.true')
      .order('current_stock', { ascending: true });

    if (error) throw error;
    return data as InventoryItem[];
  },

  async updateStock(menuItemId: string, newStock: number, staffId: string, reason: string) {
    const { data, error } = await supabase.rpc('adjust_stock', {
      p_menu_item_id: menuItemId,
      p_new_quantity: newStock,
      p_staff_id: staffId,
      p_reason: reason
    });

    if (error) throw error;
    return data;
  },

  // ==================== ANALYTICS ====================
  
  async getDailySales(date?: string) {
    try {
      const targetDate = date || new Date().toISOString().split('T')[0];
      const { data, error } = await supabase.rpc('get_sales_by_date_range', {
        start_date: targetDate,
        end_date: targetDate
      });

      if (error) {
        console.error('getDailySales error:', error);
        throw new Error(`Database function error: ${error.message}`);
      }
      return data?.[0] as SalesSummary;
    } catch (error: any) {
      console.error('getDailySales failed:', error);
      return null;
    }
  },

  async getTopProducts(daysBack: number = 30) {
    try {
      const { data, error } = await supabase.rpc('get_product_performance', {
        days_back: daysBack
      });

      if (error) {
        console.error('getTopProducts error:', error);
        return [];
      }
      return data || [];
    } catch (error: any) {
      console.error('getTopProducts failed:', error);
      return [];
    }
  },

  async getCustomerAnalytics() {
    try {
      const { data, error } = await supabase.rpc('get_customer_analytics');

      if (error) {
        console.error('getCustomerAnalytics error:', error);
        return null;
      }
      return data?.[0];
    } catch (error: any) {
      console.error('getCustomerAnalytics failed:', error);
      return null;
    }
  },

  async getInventoryValuation() {
    try {
      const { data, error } = await supabase.rpc('get_inventory_valuation');

      if (error) {
        console.error('getInventoryValuation error:', error);
        return null;
      }
      return data?.[0];
    } catch (error: any) {
      console.error('getInventoryValuation failed:', error);
      return null;
    }
  },

  async getStaffPerformance(daysBack: number = 30) {
    try {
      const { data, error } = await supabase.rpc('get_staff_performance', {
        days_back: daysBack
      });

      if (error) {
        console.error('getStaffPerformance error:', error);
        return [];
      }
      return data || [];
    } catch (error: any) {
      console.error('getStaffPerformance failed:', error);
      return [];
    }
  },

  async getPaymentMethodBreakdown(daysBack: number = 30) {
    try {
      const { data, error } = await supabase.rpc('get_payment_method_breakdown', {
        days_back: daysBack
      });

      if (error) {
        console.error('getPaymentMethodBreakdown error:', error);
        return [];
      }
      return data || [];
    } catch (error: any) {
      console.error('getPaymentMethodBreakdown failed:', error);
      return [];
    }
  }
};

