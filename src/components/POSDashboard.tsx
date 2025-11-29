import React, { useState, useEffect } from 'react';
import { posAPI } from '../lib/pos';
import { 
  TrendingUp, 
  ShoppingCart, 
  Users, 
  Package, 
  Coins,
  AlertTriangle,
  BarChart3,
  Calendar,
  Clock,
  Download
} from 'lucide-react';
import QuickSale from './POS/QuickSale';
import CustomerManagement from './POS/CustomerManagement';
import InventoryManagement from './POS/InventoryManagement';
import Reports from './POS/Reports';
import PendingPayments from './POS/PendingPayments';
import { downloadReceipt, ReceiptData } from '../utils/receiptGenerator';
import { useSiteSettings } from '../hooks/useSiteSettings';

const POSDashboard: React.FC = () => {
  const { siteSettings } = useSiteSettings();
  const [loading, setLoading] = useState(true);
  const [todaySales, setTodaySales] = useState<any>(null);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [customerStats, setCustomerStats] = useState<any>(null);
  const [inventoryValue, setInventoryValue] = useState<any>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [activeView, setActiveView] = useState<'dashboard' | 'quicksale' | 'customers' | 'inventory' | 'reports' | 'pending-payments'>('dashboard');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadDashboardData();
    setSelectedOrders(new Set()); // Clear selections when date range changes
  }, [startDate, endDate]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load all data in parallel with error handling for each
      const [sales, products, stock, customers, inventory, orders] = await Promise.allSettled([
        posAPI.getDailySales().catch(e => { console.error('Sales error:', e); return null; }),
        posAPI.getTopProducts(7).catch(e => { console.error('Products error:', e); return []; }),
        posAPI.getLowStockItems().catch(e => { console.error('Stock error:', e); return []; }),
        posAPI.getCustomerAnalytics().catch(e => { console.error('Customer error:', e); return null; }),
        posAPI.getInventoryValuation().catch(e => { console.error('Inventory error:', e); return null; }),
        posAPI.getOrdersByDateRange(startDate, endDate).catch(e => { console.error('Orders error:', e); return []; })
      ]);

      setTodaySales(sales.status === 'fulfilled' ? sales.value : null);
      setTopProducts((products.status === 'fulfilled' ? products.value : [])?.slice(0, 5) || []);
      setLowStockItems((stock.status === 'fulfilled' ? stock.value : []) || []);
      setCustomerStats(customers.status === 'fulfilled' ? customers.value : null);
      setInventoryValue(inventory.status === 'fulfilled' ? inventory.value : null);
      setRecentOrders((orders.status === 'fulfilled' ? orders.value : []) || []);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOrderClick = async (order: any) => {
    try {
      // Get full order details with items
      const orderDetails = await posAPI.getOrderById(order.id);
      const payments = await posAPI.getPaymentsByOrderId(order.id);
      
      // Format order date and time
      const orderDate = new Date(orderDetails.order_date);
      const formattedDate = orderDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      const formattedTime = orderDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });

      // Prepare receipt data
      const receiptData: ReceiptData = {
        orderNumber: orderDetails.order_number,
        shopName: siteSettings?.site_name || 'For Your Pets Only',
        shopDescription: siteSettings?.site_description || '',
        date: formattedDate,
        time: formattedTime,
        customerName: orderDetails.customers?.name || orderDetails.customer_name || 'Walk-in',
        customerPhone: orderDetails.customers?.phone || orderDetails.customer_phone || undefined,
        items: (orderDetails.order_items || []).map((item: any) => ({
          name: item.item_name,
          quantity: item.quantity,
          unitPrice: parseFloat(item.unit_price),
          total: parseFloat(item.total_price)
        })),
        subtotal: parseFloat(orderDetails.subtotal || 0),
        discount: parseFloat(orderDetails.discount_amount || 0),
        deliveryFee: 0, // Not stored in order, set to 0
        total: parseFloat(orderDetails.total_amount || 0),
        paymentMethod: payments.length > 1 ? 'Multiple Payments' : (payments[0]?.payment_method || orderDetails.payment_status || 'Unknown'),
        amountPaid: payments.reduce((sum: number, p: any) => sum + parseFloat(p.amount || 0), 0) || undefined,
        change: undefined, // Not stored, would need to calculate
        isPayLater: orderDetails.payment_status === 'pending',
        multiPayments: payments.length > 1 ? payments.map((p: any) => ({
          method: p.payment_method,
          amount: parseFloat(p.amount || 0)
        })) : undefined
      };

      // Download receipt
      await downloadReceipt(receiptData);
    } catch (error) {
      console.error('Error loading order receipt:', error);
      alert('Failed to load receipt. Please try again.');
    }
  };

  const handleOrderSelect = (orderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedOrders.size === recentOrders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(recentOrders.map((o: any) => o.id)));
    }
  };

  const handleExportToExcel = async () => {
    if (selectedOrders.size === 0) {
      alert('Please select at least one order to export.');
      return;
    }

    try {
      // Get full details for selected orders
      const ordersToExport = recentOrders.filter((o: any) => selectedOrders.has(o.id));
      const ordersWithDetails = await Promise.all(
        ordersToExport.map(async (order: any) => {
          try {
            const orderDetails = await posAPI.getOrderById(order.id);
            const payments = await posAPI.getPaymentsByOrderId(order.id);
            return { orderDetails, payments };
          } catch (error) {
            console.error(`Error fetching order ${order.id}:`, error);
            return null;
          }
        })
      );

      // Prepare CSV data
      const csvRows: string[] = [];
      
      // Header row
      csvRows.push([
        'Order Number',
        'Order Date',
        'Order Time',
        'Customer Name',
        'Customer Phone',
        'Customer Email',
        'Order Status',
        'Payment Status',
        'Subtotal',
        'Discount',
        'Delivery Fee',
        'Total Amount',
        'Payment Method(s)',
        'Amount Paid',
        'Items (Name, Quantity, Unit Price, Total)',
        'Notes',
        'Order Type'
      ].join(','));

      // Data rows
      ordersWithDetails.forEach((data: any) => {
        if (!data) return;
        
        const { orderDetails, payments } = data;
        const orderDate = new Date(orderDetails.order_date);
        const dateStr = orderDate.toLocaleDateString('en-US');
        const timeStr = orderDate.toLocaleTimeString('en-US');
        
        // Format items
        const itemsStr = (orderDetails.order_items || [])
          .map((item: any) => 
            `${item.item_name} (Qty: ${item.quantity}, Price: ₱${parseFloat(item.unit_price).toFixed(2)}, Total: ₱${parseFloat(item.total_price).toFixed(2)})`
          )
          .join('; ');

        // Format payments
        const paymentMethods = payments.map((p: any) => `${p.payment_method}: ₱${parseFloat(p.amount || 0).toFixed(2)}`).join('; ');
        const totalPaid = payments.reduce((sum: number, p: any) => sum + parseFloat(p.amount || 0), 0);

        csvRows.push([
          `"${orderDetails.order_number}"`,
          `"${dateStr}"`,
          `"${timeStr}"`,
          `"${orderDetails.customers?.name || orderDetails.customer_name || 'Walk-in'}"`,
          `"${orderDetails.customers?.phone || orderDetails.customer_phone || ''}"`,
          `"${orderDetails.customers?.email || orderDetails.customer_email || ''}"`,
          `"${orderDetails.order_status || ''}"`,
          `"${orderDetails.payment_status || ''}"`,
          `₱${parseFloat(orderDetails.subtotal || 0).toFixed(2)}`,
          `₱${parseFloat(orderDetails.discount_amount || 0).toFixed(2)}`,
          `₱${parseFloat(orderDetails.delivery_fee || 0).toFixed(2)}`,
          `₱${parseFloat(orderDetails.total_amount || 0).toFixed(2)}`,
          `"${paymentMethods}"`,
          `₱${totalPaid.toFixed(2)}`,
          `"${itemsStr}"`,
          `"${orderDetails.notes || ''}"`,
          `"${orderDetails.order_type || ''}"`
        ].join(','));
      });

      // Create and download CSV file
      const csvContent = csvRows.join('\n');
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `orders_${startDate}_to_${endDate}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      alert(`Exported ${selectedOrders.size} order(s) successfully!`);
      setSelectedOrders(new Set());
    } catch (error) {
      console.error('Error exporting orders:', error);
      alert('Failed to export orders. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pet-orange mx-auto mb-4"></div>
          <p className="text-pet-gray-medium">Loading POS data...</p>
        </div>
      </div>
    );
  }

  // Quick Sale View
  if (activeView === 'quicksale') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-display font-bold text-pet-orange-dark">
            🛒 Quick Sale
          </h1>
          <button
            onClick={() => setActiveView('dashboard')}
            className="px-4 py-2 bg-pet-orange text-white rounded-lg hover:bg-pet-orange-dark transition-colors"
          >
            ← Back to Dashboard
          </button>
        </div>
        <QuickSale />
      </div>
    );
  }

  // Customers View
  if (activeView === 'customers') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setActiveView('dashboard')}
            className="px-4 py-2 bg-pet-orange text-white rounded-lg hover:bg-pet-orange-dark transition-colors"
          >
            ← Back to Dashboard
          </button>
        </div>
        <CustomerManagement />
      </div>
    );
  }

  // Inventory View
  if (activeView === 'inventory') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setActiveView('dashboard')}
            className="px-4 py-2 bg-pet-orange text-white rounded-lg hover:bg-pet-orange-dark transition-colors"
          >
            ← Back to Dashboard
          </button>
        </div>
        <InventoryManagement />
      </div>
    );
  }

  // Reports View
  if (activeView === 'reports') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setActiveView('dashboard')}
            className="px-4 py-2 bg-pet-orange text-white rounded-lg hover:bg-pet-orange-dark transition-colors"
          >
            ← Back to Dashboard
          </button>
        </div>
        <Reports />
      </div>
    );
  }

  // Pending Payments View
  if (activeView === 'pending-payments') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setActiveView('dashboard')}
            className="px-4 py-2 bg-pet-orange text-white rounded-lg hover:bg-pet-orange-dark transition-colors"
          >
            ← Back to Dashboard
          </button>
        </div>
        <PendingPayments />
      </div>
    );
  }

  // Main Dashboard View
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-pet-orange-dark">
            🎯 POS Dashboard
          </h1>
          <p className="text-pet-gray-medium mt-1">
            Real-time business insights for For Your Pets Only
          </p>
        </div>
        <button
          onClick={loadDashboardData}
          className="px-4 py-2 bg-pet-orange text-white rounded-lg hover:bg-pet-orange-dark transition-colors"
        >
          Refresh Data
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Today's Sales */}
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-pet-orange">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-pet-cream rounded-lg">
              <div className="text-3xl text-pet-orange font-bold">₱</div>
            </div>
            <span className="text-xs text-pet-gray-medium">Today</span>
          </div>
          <h3 className="text-2xl font-bold text-pet-brown">
            ₱{(todaySales?.total_sales || 0).toFixed(2)}
          </h3>
          <p className="text-sm text-pet-gray-medium mt-1">Total Sales</p>
          <div className="mt-2 text-xs text-pet-orange">
            {todaySales?.total_orders || 0} orders
          </div>
        </div>

        {/* Average Order Value */}
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-50 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <span className="text-xs text-pet-gray-medium">Today</span>
          </div>
          <h3 className="text-2xl font-bold text-pet-brown">
            ₱{(todaySales?.average_order_value || 0).toFixed(2)}
          </h3>
          <p className="text-sm text-pet-gray-medium mt-1">Avg Order Value</p>
        </div>

        {/* Customers */}
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <span className="text-xs text-pet-gray-medium">Total</span>
          </div>
          <h3 className="text-2xl font-bold text-pet-brown">
            {customerStats?.total_customers || 0}
          </h3>
          <p className="text-sm text-pet-gray-medium mt-1">Total Customers</p>
          <div className="mt-2 text-xs text-blue-600">
            {customerStats?.active_customers || 0} active
          </div>
        </div>

        {/* Inventory Value */}
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-50 rounded-lg">
              <Package className="h-6 w-6 text-purple-600" />
            </div>
            <span className="text-xs text-pet-gray-medium">Stock</span>
          </div>
          <h3 className="text-2xl font-bold text-pet-brown">
            ₱{(inventoryValue?.total_value || 0).toFixed(2)}
          </h3>
          <p className="text-sm text-pet-gray-medium mt-1">Inventory Value</p>
          <div className="mt-2 text-xs text-purple-600">
            {inventoryValue?.total_items || 0} items tracked
          </div>
        </div>
      </div>

      {/* Quick Actions - MOVED TO TOP */}
      <div className="bg-gradient-to-r from-pet-orange to-pet-orange-dark rounded-xl shadow-lg p-6 text-white">
        <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <button 
            onClick={() => setActiveView('quicksale')}
            className="bg-white/20 hover:bg-white/30 transition-colors p-4 rounded-lg text-center group"
          >
            <ShoppingCart className="h-6 w-6 mx-auto mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-semibold">Quick Sale</span>
            <p className="text-xs opacity-75 mt-1">Process in-store sales</p>
          </button>
          <button 
            onClick={() => setActiveView('pending-payments')}
            className="bg-white/20 hover:bg-white/30 transition-colors p-4 rounded-lg text-center group border-2 border-yellow-400"
          >
            <Clock className="h-6 w-6 mx-auto mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-semibold">Pay Later</span>
            <p className="text-xs opacity-75 mt-1">Manage pending payments</p>
          </button>
          <button 
            onClick={() => setActiveView('customers')}
            className="bg-white/20 hover:bg-white/30 transition-colors p-4 rounded-lg text-center group"
          >
            <Users className="h-6 w-6 mx-auto mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-semibold">Customers</span>
            <p className="text-xs opacity-75 mt-1">Manage customer profiles</p>
          </button>
          <button 
            onClick={() => setActiveView('inventory')}
            className="bg-white/20 hover:bg-white/30 transition-colors p-4 rounded-lg text-center group"
          >
            <Package className="h-6 w-6 mx-auto mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-semibold">Inventory</span>
            <p className="text-xs opacity-75 mt-1">Track & adjust stock</p>
          </button>
          <button 
            onClick={() => setActiveView('reports')}
            className="bg-white/20 hover:bg-white/30 transition-colors p-4 rounded-lg text-center group"
          >
            <Calendar className="h-6 w-6 mx-auto mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-semibold">Reports</span>
            <p className="text-xs opacity-75 mt-1">View detailed analytics</p>
          </button>
        </div>
      </div>

      {/* Pending Payments Alert */}
      {recentOrders.filter((o: any) => o.payment_status === 'pending').length > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded-lg">
          <div className="flex items-start">
            <Clock className="h-5 w-5 text-yellow-600 mt-0.5 mr-3" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-yellow-800 mb-2">
                  ⏰ Pending Payments
                </h3>
                <button
                  onClick={() => setActiveView('pending-payments')}
                  className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors text-sm font-semibold"
                >
                  Manage Payments →
                </button>
              </div>
              <p className="text-sm text-yellow-700">
                You have {recentOrders.filter((o: any) => o.payment_status === 'pending').length} order(s) with pending payments
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-lg">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 mr-3" />
            <div className="flex-1">
              <h3 className="text-lg font-bold text-red-800 mb-2">
                ⚠️ Low Stock Alert ({lowStockItems.length} items)
              </h3>
              <div className="space-y-1">
                {lowStockItems.slice(0, 5).map((item: any, index: number) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className="text-red-700">
                      {item.menu_items?.name || 'Unknown Product'}
                    </span>
                    <span className="font-bold text-red-800">
                      Stock: {item.current_stock} (Min: {item.minimum_stock})
                    </span>
                  </div>
                ))}
                {lowStockItems.length > 5 && (
                  <p className="text-xs text-red-600 mt-2">
                    And {lowStockItems.length - 5} more items...
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Two Column Layout - Top Products & Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Products (Last 7 Days) */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center mb-6">
            <BarChart3 className="h-5 w-5 text-pet-orange mr-2" />
            <h2 className="text-xl font-bold text-pet-brown">Top Products (7 Days)</h2>
          </div>
          {topProducts.length > 0 ? (
            <div className="space-y-4">
              {topProducts.map((product: any, index: number) => (
                <div key={index} className="flex items-center justify-between pb-4 border-b border-pet-beige last:border-0">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '📦'}
                      </span>
                      <div>
                        <p className="font-semibold text-pet-brown">
                          {product.product_name}
                        </p>
                        <p className="text-xs text-pet-gray-medium">
                          {product.total_quantity} sold
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-pet-orange-dark">
                      ₱{parseFloat(product.total_revenue || 0).toFixed(2)}
                    </p>
                    {product.profit_margin !== null && (
                      <p className="text-xs text-green-600">
                        {parseFloat(product.profit_margin).toFixed(1)}% margin
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-pet-gray-medium py-8">
              No sales data yet
            </p>
          )}
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <ShoppingCart className="h-5 w-5 text-pet-orange mr-2" />
              <h2 className="text-xl font-bold text-pet-brown">Recent Orders</h2>
              {selectedOrders.size > 0 && (
                <span className="ml-3 text-sm text-pet-orange font-semibold">
                  ({selectedOrders.size} selected)
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {selectedOrders.size > 0 && (
                <button
                  onClick={handleExportToExcel}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold"
                >
                  <Download className="h-4 w-4" />
                  <span>Export Excel ({selectedOrders.size})</span>
                </button>
              )}
              <Calendar className="h-4 w-4 text-pet-gray-medium" />
              <div className="flex items-center space-x-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-1 border-2 border-pet-orange rounded-lg focus:outline-none focus:ring-2 focus:ring-pet-orange text-sm"
                />
                <span className="text-pet-gray-medium">-</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  className="px-3 py-1 border-2 border-pet-orange rounded-lg focus:outline-none focus:ring-2 focus:ring-pet-orange text-sm"
                />
              </div>
            </div>
          </div>
          {recentOrders.length > 0 && (
            <div className="mb-4 flex items-center space-x-2">
              <input
                type="checkbox"
                checked={selectedOrders.size === recentOrders.length && recentOrders.length > 0}
                onChange={handleSelectAll}
                className="w-4 h-4 text-pet-orange border-pet-orange rounded focus:ring-pet-orange"
              />
              <label className="text-sm text-pet-gray-medium cursor-pointer" onClick={handleSelectAll}>
                Select All ({recentOrders.length} orders)
              </label>
            </div>
          )}
          {recentOrders.length > 0 ? (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {recentOrders.map((order: any, index: number) => (
                <div 
                  key={index} 
                  className="p-4 bg-pet-cream rounded-lg border-l-4 border-pet-orange hover:bg-pet-orange/10 transition-colors"
                >
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedOrders.has(order.id)}
                      onChange={(e) => handleOrderSelect(order.id, e as any)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1 w-4 h-4 text-pet-orange border-pet-orange rounded focus:ring-pet-orange cursor-pointer"
                    />
                    <div 
                      className="flex-1 cursor-pointer"
                      onClick={() => handleOrderClick(order)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-pet-brown text-sm">
                          {order.order_number}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          order.payment_status === 'paid' 
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {order.payment_status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-pet-gray-medium">
                        <span>
                          {order.customers?.name || order.customer_name || 'Walk-in'}
                        </span>
                        <span className="font-bold text-pet-orange-dark">
                          ₱{parseFloat(order.total_amount).toFixed(2)}
                        </span>
                      </div>
                      <div className="text-xs text-pet-gray-medium mt-1">
                        {new Date(order.order_date).toLocaleString()}
                      </div>
                      <div className="text-xs text-pet-orange mt-2 font-semibold">
                        Click to view receipt →
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-pet-gray-medium py-8">
              No orders found for selected date range
            </p>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="bg-white rounded-lg shadow p-4 text-center text-sm text-pet-gray-medium">
        Last updated: {new Date().toLocaleString()} • 
        <span className="text-pet-orange font-semibold ml-1">POS System Active ✅</span>
      </div>
    </div>
  );
};

export default POSDashboard;

