import React, { useState, useEffect } from 'react';
import { Search, Plus, Minus, Trash2, ShoppingCart, X, Package, Download, CreditCard } from 'lucide-react';
import { posAPI } from '../../lib/pos';
import { useMenu } from '../../hooks/useMenu';
import { useCategories } from '../../hooks/useCategories';
import { useSiteSettings } from '../../hooks/useSiteSettings';
import { supabase } from '../../lib/supabase';
import { downloadReceipt, ReceiptData } from '../../utils/receiptGenerator';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
}

const QuickSale: React.FC = () => {
  const { menuItems, loading: productsLoading } = useMenu();
  const { siteSettings } = useSiteSettings();
  const { categories } = useCategories();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [useMultiPayment, setUseMultiPayment] = useState(false);
  const [multiPayments, setMultiPayments] = useState<Array<{ method: string; amount: string; id: string }>>([]);
  const [discount, setDiscount] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastOrderNumber, setLastOrderNumber] = useState('');
  const [lastOrderData, setLastOrderData] = useState<ReceiptData | null>(null);

  const filteredProducts = menuItems.filter(item => {
    // Filter by availability
    if (!item.available) return false;

    // Filter by category
    if (selectedCategoryFilter !== 'all' && item.category !== selectedCategoryFilter) {
      return false;
    }

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const category = categories.find(cat => cat.id === item.category);
      const categoryName = category?.name.toLowerCase() || '';
      
      const matchesSearch = 
        item.name.toLowerCase().includes(searchLower) ||
        item.description.toLowerCase().includes(searchLower) ||
        categoryName.includes(searchLower);
      
      if (!matchesSearch) return false;
    }
    
    return true;
  });

  console.log(`Products: ${menuItems.length} total, ${filteredProducts.length} shown (available: ${menuItems.filter(i => i.available).length})`);


  const addToCart = (product: any) => {
    // Check stock availability
    if (product.isTracked && product.currentStock !== undefined) {
      if (product.currentStock <= 0) {
        alert(`Sorry, ${product.name} is out of stock.`);
        return;
      }
      
      const existingItem = cart.find(item => item.id === product.id);
      const currentQuantity = existingItem ? existingItem.quantity : 0;
      const newQuantity = currentQuantity + 1;
      
      if (newQuantity > product.currentStock) {
        alert(`Sorry, only ${product.currentStock} ${product.currentStock === 1 ? 'piece' : 'pieces'} available for ${product.name}.`);
        return;
      }
    }
    
    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
      setCart(cart.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.price }
          : item
      ));
    } else {
      setCart([...cart, {
        id: product.id,
        name: product.name,
        price: product.basePrice,
        quantity: 1,
        total: product.basePrice
      }]);
    }
  };

  const updateQuantity = (id: string, change: number) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const newQuantity = Math.max(1, item.quantity + change);
        
        // Check stock availability when increasing quantity
        if (change > 0) {
          const product = menuItems.find(p => p.id === id);
          if (product?.isTracked && product.currentStock !== undefined) {
            if (product.currentStock <= 0) {
              alert(`Sorry, ${product.name} is out of stock.`);
              return item;
            }
            if (newQuantity > product.currentStock) {
              alert(`Sorry, only ${product.currentStock} ${product.currentStock === 1 ? 'piece' : 'pieces'} available for ${product.name}.`);
              return item;
            }
          }
        }
        
        return { ...item, quantity: newQuantity, total: newQuantity * item.price };
      }
      return item;
    }));
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + item.total, 0);
  };

  const calculateDiscount = () => {
    const discountValue = parseFloat(discount) || 0;
    return Math.max(0, discountValue);
  };

  const calculateDeliveryFee = () => {
    return parseFloat(deliveryFee) || 0;
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const discountAmount = calculateDiscount();
    const deliveryFeeAmount = calculateDeliveryFee();
    return Math.max(0, subtotal - discountAmount + deliveryFeeAmount);
  };

  const calculateMultiPaymentTotal = () => {
    return multiPayments.reduce((sum, payment) => {
      return sum + (parseFloat(payment.amount) || 0);
    }, 0);
  };

  const calculateChange = () => {
    if (useMultiPayment) {
      const totalPaid = calculateMultiPaymentTotal();
      const cashPayment = multiPayments.find(p => p.method === 'cash');
      if (cashPayment && cashPayment.amount) {
        const cashAmount = parseFloat(cashPayment.amount) || 0;
        const total = calculateTotal();
        const otherPayments = multiPayments
          .filter(p => p.method !== 'cash')
          .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
        const cashNeeded = total - otherPayments;
        return Math.max(0, cashAmount - cashNeeded);
      }
      return 0;
    }
    if (paymentMethod !== 'cash' || !amountPaid) return 0;
    const paid = parseFloat(amountPaid) || 0;
    const total = calculateTotal();
    return Math.max(0, paid - total);
  };

  const isAmountSufficient = () => {
    if (paymentMethod === 'pay-later') return true;
    if (useMultiPayment) {
      const totalPaid = calculateMultiPaymentTotal();
      return totalPaid >= calculateTotal();
    }
    if (paymentMethod !== 'cash') return true;
    const paid = parseFloat(amountPaid) || 0;
    return paid >= calculateTotal();
  };

  const addMultiPayment = () => {
    const newPayment = {
      id: `payment-${Date.now()}-${Math.random()}`,
      method: 'cash',
      amount: ''
    };
    setMultiPayments([...multiPayments, newPayment]);
  };

  const removeMultiPayment = (id: string) => {
    setMultiPayments(multiPayments.filter(p => p.id !== id));
  };

  const updateMultiPayment = (id: string, field: 'method' | 'amount', value: string) => {
    setMultiPayments(multiPayments.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    ));
  };

  const getPaymentRemaining = () => {
    const total = calculateTotal();
    const paid = calculateMultiPaymentTotal();
    return Math.max(0, total - paid);
  };

  const handleCompleteSale = async () => {
    if (cart.length === 0) {
      alert('Please add items to cart');
      return;
    }

    if (!customerName.trim()) {
      alert('Please enter customer name');
      return;
    }

    if (useMultiPayment) {
      const totalPaid = calculateMultiPaymentTotal();
      const total = calculateTotal();
      if (totalPaid < total) {
        alert(`Insufficient payment. Total is ₱${total.toFixed(2)} but only ₱${totalPaid.toFixed(2)} was paid.`);
        return;
      }
      if (multiPayments.length === 0) {
        alert('Please add at least one payment method');
        return;
      }
    } else if (paymentMethod === 'cash' && !isAmountSufficient()) {
      alert(`Insufficient payment. Total is ₱${calculateTotal().toFixed(2)} but only ₱${parseFloat(amountPaid || '0').toFixed(2)} was paid.`);
      return;
    }

    const isPayLater = paymentMethod === 'pay-later';

    try {
      setIsProcessing(true);
      console.log('Starting sale process...');

      // Create order
      console.log('Creating order with data:', {
        order_type: 'in-store',
        customer_name: customerName,
        items_count: cart.length
      });

      const order = await posAPI.createOrder({
        order_type: 'in-store',
        customer_name: customerName,
        customer_phone: customerPhone || undefined,
        items: cart.map(item => ({
          menu_item_id: item.id,
          item_name: item.name,
          unit_price: item.price,
          quantity: item.quantity
        })),
        discount_amount: calculateDiscount()
      });

      console.log('Order created:', order.order_number);

      // Create payment(s) (skip for pay-later)
      if (!isPayLater) {
        if (useMultiPayment) {
          console.log('Creating multiple payments...');
          // Create multiple payment records
          for (const payment of multiPayments) {
            const amount = parseFloat(payment.amount) || 0;
            if (amount > 0) {
              await posAPI.createPayment({
                order_id: order.id,
                payment_method: payment.method,
                amount: amount
              });
              console.log(`Payment recorded: ${payment.method} - ₱${amount.toFixed(2)}`);
            }
          }
          console.log('All payments recorded');
        } else {
          console.log('Creating payment...');
          await posAPI.createPayment({
            order_id: order.id,
            payment_method: paymentMethod,
            amount: calculateTotal()
          });
          console.log('Payment recorded');
        }
      } else {
        console.log('Pay Later: Skipping payment creation');
      }

      // Update order with delivery fee and payment status
      const updateData: any = {
        total_amount: calculateTotal()
      };
      
      if (calculateDeliveryFee() > 0) {
        updateData.notes = `Delivery Fee: ₱${calculateDeliveryFee().toFixed(2)}`;
      }
      
      // For pay-later, keep payment_status as 'pending' but mark order as completed
      if (isPayLater) {
        updateData.payment_status = 'pending';
        updateData.order_status = 'completed'; // Order is completed, just payment is pending
        if (updateData.notes) {
          updateData.notes += ' | Payment: Pending (Pay Later)';
        } else {
          updateData.notes = 'Payment: Pending (Pay Later)';
        }
      }
      
      if (calculateDeliveryFee() > 0 || isPayLater) {
        const { error: updateError } = await supabase
          .from('orders')
          .update(updateData)
          .eq('id', order.id);
        
        if (updateError) {
          console.error('Failed to update order:', updateError);
        }
      }

      // Get stock levels BEFORE completing order
      console.log('📊 Checking stock levels before sale...');
      const stockBefore: { [key: string]: number } = {};
      for (const item of cart) {
        const inv = await posAPI.getInventoryForItem(item.id);
        stockBefore[item.id] = inv?.current_stock || 0;
        console.log(`Before sale - ${item.name}: ${stockBefore[item.id]} units`);
      }

      // Complete order (might trigger database automatic update)
      // For pay-later, we still complete the order to decrease inventory
      console.log('Completing order...');
      if (isPayLater) {
        // For pay-later, update order status to completed but keep payment as pending
        const { error: completeError } = await supabase
          .from('orders')
          .update({
            order_status: 'completed',
            completed_at: new Date().toISOString(),
            // Keep payment_status as 'pending'
          })
          .eq('id', order.id);
        
        if (completeError) {
          console.error('Failed to complete pay-later order:', completeError);
        } else {
          console.log('Pay-later order completed (inventory will decrease)');
        }
      } else {
        await posAPI.completeOrder(order.id);
        console.log('Order completed successfully!');
      }

      // Wait for trigger to fire (if enabled)
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Check if inventory was updated correctly
      console.log('📊 Verifying inventory updates...');
      for (const item of cart) {
        const inv = await posAPI.getInventoryForItem(item.id);
        const currentStock = inv?.current_stock || 0;
        const expectedStock = stockBefore[item.id] - item.quantity;
        
        console.log(`After sale - ${item.name}: ${currentStock} units (expected: ${expectedStock})`);
        
        // If stock didn't decrease correctly, update manually
        if (currentStock !== expectedStock) {
          console.log(`⚠️ Stock mismatch! Expected ${expectedStock}, got ${currentStock}. Fixing...`);
          
          // Set to correct stock level
          const { data, error } = await supabase
            .from('inventory')
            .update({
              current_stock: expectedStock,
              is_low_stock: expectedStock <= (inv?.minimum_stock || 10),
              is_out_of_stock: expectedStock <= 0,
              last_stock_update: new Date().toISOString()
            })
            .eq('menu_item_id', item.id)
            .select()
            .single();
            
          if (!error) {
            console.log(`✅ Corrected stock for ${item.name}: ${currentStock} → ${expectedStock}`);
          }
        } else {
          console.log(`✅ Stock correctly updated for ${item.name}`);
        }
      }

      // Prepare receipt data
      const receiptData: ReceiptData = {
        orderNumber: order.order_number,
        shopName: siteSettings?.site_name || 'For Your Pets Only',
        shopDescription: siteSettings?.site_description || '',
        date: new Date().toISOString(),
        time: new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }),
        customerName: customerName,
        customerPhone: customerPhone || undefined,
        items: cart.map(item => ({
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.price,
          total: item.total
        })),
        subtotal: calculateSubtotal(),
        discount: calculateDiscount(),
        deliveryFee: calculateDeliveryFee(),
        total: calculateTotal(),
        paymentMethod: isPayLater ? 'Pay Later' : (useMultiPayment ? 'Multiple Payments' : paymentMethod),
        amountPaid: useMultiPayment 
          ? calculateMultiPaymentTotal() 
          : (paymentMethod === 'cash' && amountPaid ? parseFloat(amountPaid) : undefined),
        change: useMultiPayment ? calculateChange() : (paymentMethod === 'cash' ? calculateChange() : undefined),
        isPayLater: isPayLater,
        multiPayments: useMultiPayment ? multiPayments.map(p => ({
          method: p.method,
          amount: parseFloat(p.amount) || 0
        })) : undefined
      };

      // Store receipt data
      setLastOrderData(receiptData);
      setLastOrderNumber(order.order_number);
      setShowSuccess(true);
      
      // Show different message for pay-later
      if (isPayLater) {
        console.log('✅ Pay Later order completed. Stock decreased. Payment pending.');
      }

      // Reset form
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setPaymentMethod('cash');
      setAmountPaid('');
      setUseMultiPayment(false);
      setMultiPayments([]);
      setDiscount('');
      setDeliveryFee('');

      // Hide success message after 5 seconds
      setTimeout(() => setShowSuccess(false), 5000);

    } catch (error: any) {
      console.error('Error processing sale:', error);
      const errorMessage = error.message || 'Unknown error occurred';
      
      if (errorMessage.includes('orders') || errorMessage.includes('table')) {
        alert(`Database Error: ${errorMessage}\n\nPlease make sure:\n1. Database migrations are run\n2. Tables exist in Supabase\n\nCheck the Database Status section for details.`);
      } else {
        alert(`Failed to process sale:\n${errorMessage}\n\nCheck browser console for details.`);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 lg:gap-6">
      {/* Success Message */}
      {showSuccess && (
        <div className={`fixed top-4 right-4 px-6 py-4 rounded-lg shadow-lg z-50 animate-slide-up max-w-sm ${
          lastOrderData?.isPayLater ? 'bg-yellow-500 text-yellow-900' : 'bg-green-500 text-white'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="text-2xl">{lastOrderData?.isPayLater ? '⏰' : '✅'}</div>
              <div>
                <p className="font-bold">
                  {lastOrderData?.isPayLater ? 'Order Completed (Pay Later)' : 'Sale Completed!'}
                </p>
                <p className="text-sm">Order #{lastOrderNumber}</p>
                {lastOrderData?.isPayLater && (
                  <p className="text-xs mt-1 opacity-90">Stock decreased. Payment pending.</p>
                )}
              </div>
            </div>
            {lastOrderData && (
              <button
                onClick={() => downloadReceipt(lastOrderData)}
                className={`ml-4 px-3 py-2 rounded-lg transition-colors flex items-center space-x-2 text-sm font-semibold ${
                  lastOrderData.isPayLater 
                    ? 'bg-white text-yellow-600 hover:bg-yellow-50' 
                    : 'bg-white text-green-600 hover:bg-green-50'
                }`}
                title="Download Receipt"
              >
                <Download className="h-4 w-4" />
                <span>Receipt</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Products List - Left Side */}
      <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-4 lg:p-6 max-h-[70vh] lg:max-h-[calc(100vh-12rem)] overflow-y-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-pet-orange-dark mb-4">Select Products</h2>
          
          {/* Search Bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search products or categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-3 border-2 border-pet-orange rounded-lg focus:outline-none focus:ring-2 focus:ring-pet-orange"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-pet-brown mb-2 uppercase">Filter by Category</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategoryFilter('all')}
                className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200 border-2 ${
                  selectedCategoryFilter === 'all'
                    ? 'bg-pet-orange text-white border-pet-orange'
                    : 'bg-white text-pet-brown border-pet-orange hover:bg-pet-cream'
                }`}
              >
                All
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategoryFilter(category.id)}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200 border-2 flex items-center space-x-1 ${
                    selectedCategoryFilter === category.id
                      ? 'bg-pet-orange text-white border-pet-orange'
                      : 'bg-white text-pet-brown border-pet-orange hover:bg-pet-cream'
                  }`}
                >
                  <span>{category.icon}</span>
                  <span>{category.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-pet-gray-medium">
            Showing {filteredProducts.length} of {menuItems.filter(i => i.available).length} available products
            {(searchTerm || selectedCategoryFilter !== 'all') && (
              <span className="ml-2">
                {searchTerm && `(search: "${searchTerm}")`}
                {selectedCategoryFilter !== 'all' && `(category: ${categories.find(c => c.id === selectedCategoryFilter)?.name})`}
              </span>
            )}
          </p>
          {(searchTerm || selectedCategoryFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCategoryFilter('all');
              }}
              className="text-sm text-pet-orange hover:text-pet-orange-dark font-semibold"
            >
              Clear filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {productsLoading ? (
            <div className="col-span-full text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pet-orange mx-auto mb-2"></div>
              <p>Loading products...</p>
            </div>
          ) : menuItems.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-yellow-50 rounded-lg border-2 border-yellow-300">
              <Package className="h-16 w-16 mx-auto mb-4 text-yellow-600 opacity-50" />
              <p className="text-yellow-800 font-semibold mb-2">No Products Found</p>
              <p className="text-sm text-yellow-700 mb-4">Please add products first in Admin Panel</p>
              <a 
                href="/admin"
                className="inline-block px-4 py-2 bg-pet-orange text-white rounded-lg hover:bg-pet-orange-dark"
              >
                Go to Admin → Manage Menu Items
              </a>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-500">
              <p className="mb-2">No products match "{searchTerm}"</p>
              <button
                onClick={() => setSearchTerm('')}
                className="text-pet-orange hover:underline"
              >
                Clear search to see all {menuItems.filter(i => i.available).length} available products
              </button>
            </div>
          ) : (
            filteredProducts.map(product => {
              const stockDisplay = product.isTracked && product.currentStock !== undefined 
                ? product.currentStock 
                : null;
              const isOutOfStock = product.isTracked && (product.isOutOfStock || (product.currentStock ?? 0) <= 0);
              const isLowStock = product.isTracked && product.currentStock !== undefined && product.currentStock > 0 && product.currentStock <= 5;
              
              return (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  disabled={isOutOfStock}
                  className={`p-4 border-2 rounded-lg transition-colors text-left group relative ${
                    isOutOfStock 
                      ? 'border-red-300 bg-red-50 opacity-60 cursor-not-allowed' 
                      : isLowStock
                      ? 'border-yellow-400 bg-yellow-50 hover:bg-yellow-100'
                      : 'border-pet-orange hover:bg-pet-cream'
                  }`}
                  title={`${product.name} - ₱${product.basePrice.toFixed(2)}${stockDisplay !== null ? ` - Stock: ${stockDisplay}` : ''}`}
                >
                  {product.image && (
                    <img 
                      src={product.image} 
                      alt={product.name}
                      className="w-full h-32 object-cover rounded mb-2 group-hover:scale-105 transition-transform"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  )}
                  
                  {/* Stock Badge */}
                  {stockDisplay !== null && (
                    <div className={`absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-bold ${
                      isOutOfStock
                        ? 'bg-red-600 text-white'
                        : isLowStock
                        ? 'bg-yellow-500 text-white'
                        : 'bg-green-600 text-white'
                    }`}>
                      {isOutOfStock ? 'OUT OF STOCK' : `Stock: ${stockDisplay}`}
                    </div>
                  )}
                  
                  {/* Discount Badge */}
                  {product.isOnDiscount && (
                    <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                      SALE
                    </div>
                  )}
                  
                  <p className="font-semibold text-pet-brown text-sm mb-1 line-clamp-2">{product.name}</p>
                  
                  {/* Price and Stock Info */}
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-bold text-pet-orange-dark">₱{product.basePrice.toFixed(2)}</p>
                    {stockDisplay !== null && !isOutOfStock && (
                      <div className={`text-xs font-semibold px-2 py-1 rounded ${
                        isLowStock ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {stockDisplay} left
                      </div>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Cart & Checkout - Right Side - REDESIGNED FOR MOBILE */}
      <div className="bg-white rounded-xl shadow-lg flex flex-col lg:sticky lg:top-4 max-h-[calc(100vh-6rem)]">
        {/* Header - Always Visible */}
        <div className="p-4 lg:p-6 border-b-2 border-pet-orange">
          <div className="flex items-center justify-between">
            <h2 className="text-xl lg:text-2xl font-bold text-pet-orange-dark">Current Sale</h2>
            <div className="bg-pet-orange text-white px-3 py-1 rounded-full text-sm font-bold">
              {cart.length} {cart.length === 1 ? 'item' : 'items'}
            </div>
          </div>
        </div>

        {/* Scrollable Middle Section */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4">
          {/* Customer Info */}
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Customer Name *"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full px-4 py-2 border-2 border-pet-orange rounded-lg focus:outline-none focus:ring-2 focus:ring-pet-orange text-sm lg:text-base"
            />
            <input
              type="tel"
              placeholder="Phone (optional)"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pet-orange text-sm lg:text-base"
            />
          </div>

          {/* Cart Items - Scrollable Area */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-pet-gray-medium uppercase">Cart Items</p>
            {cart.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Cart is empty</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[40vh] lg:max-h-[35vh] overflow-y-auto pr-2">
                {cart.map(item => (
                  <div key={item.id} className="p-3 bg-pet-cream rounded-lg border border-pet-orange/20">
                    <div className="flex items-start justify-between mb-2">
                      <span className="font-semibold text-pet-brown text-sm flex-1 pr-2">{item.name}</span>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1 bg-white rounded-lg p-1 border border-pet-orange">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="p-1.5 hover:bg-pet-orange hover:text-white rounded transition-colors"
                        >
                          <Minus className="h-3 w-3 lg:h-4 lg:w-4" />
                        </button>
                        <span className="font-bold text-pet-brown min-w-[2.5rem] text-center text-sm lg:text-base">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="p-1.5 hover:bg-pet-orange hover:text-white rounded transition-colors"
                        >
                          <Plus className="h-3 w-3 lg:h-4 lg:w-4" />
                        </button>
                      </div>
                      <span className="font-bold text-pet-orange-dark text-sm lg:text-base">₱{item.total.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Discount & Delivery Fee */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-pet-brown mb-2 uppercase">Discount</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-2 border-2 border-pet-orange rounded-lg focus:outline-none focus:ring-2 focus:ring-pet-orange text-sm lg:text-base"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-pet-brown mb-2 uppercase">Delivery Fee</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={deliveryFee}
                onChange={(e) => setDeliveryFee(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-2 border-2 border-pet-orange rounded-lg focus:outline-none focus:ring-2 focus:ring-pet-orange text-sm lg:text-base"
              />
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-pet-brown uppercase">Payment Method</label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useMultiPayment}
                    onChange={(e) => {
                      setUseMultiPayment(e.target.checked);
                      if (e.target.checked) {
                        setMultiPayments([{ id: `payment-${Date.now()}`, method: 'cash', amount: '' }]);
                      } else {
                        setMultiPayments([]);
                      }
                    }}
                    className="rounded border-gray-300 text-pet-orange focus:ring-pet-orange"
                  />
                  <span className="text-xs text-pet-brown font-medium">Multi-Payment</span>
                </label>
              </div>
              
              {!useMultiPayment ? (
                <>
                  <select
                    value={paymentMethod}
                    onChange={(e) => {
                      setPaymentMethod(e.target.value);
                      if (e.target.value !== 'cash') {
                        setAmountPaid('');
                      }
                    }}
                    className="w-full px-4 py-2 border-2 border-pet-orange rounded-lg focus:outline-none focus:ring-2 focus:ring-pet-orange text-sm lg:text-base"
                  >
                    <option value="cash">💵 Cash</option>
                    <option value="card">💳 Card</option>
                    <option value="gcash">📱 GCash</option>
                    <option value="maya">📱 Maya</option>
                    <option value="pay-later">⏰ Pay Later</option>
                  </select>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-blue-800">Multiple Payments</span>
                      <button
                        onClick={addMultiPayment}
                        className="text-blue-600 hover:text-blue-800 text-xs font-semibold flex items-center space-x-1"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Add Payment</span>
                      </button>
                    </div>
                    <div className="text-xs text-blue-700 mb-2">
                      Total: ₱{calculateMultiPaymentTotal().toFixed(2)} / ₱{calculateTotal().toFixed(2)}
                    </div>
                    {getPaymentRemaining() > 0 && (
                      <div className="text-xs text-orange-600 font-semibold">
                        Remaining: ₱{getPaymentRemaining().toFixed(2)}
                      </div>
                    )}
                    {getPaymentRemaining() < 0 && (
                      <div className="text-xs text-red-600 font-semibold">
                        Overpaid: ₱{Math.abs(getPaymentRemaining()).toFixed(2)}
                      </div>
                    )}
                  </div>

                  {multiPayments.map((payment, index) => (
                    <div key={payment.id} className="bg-pet-cream border-2 border-pet-orange rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-pet-brown">Payment {index + 1}</span>
                        {multiPayments.length > 1 && (
                          <button
                            onClick={() => removeMultiPayment(payment.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      <select
                        value={payment.method}
                        onChange={(e) => updateMultiPayment(payment.id, 'method', e.target.value)}
                        className="w-full px-3 py-2 border border-pet-orange rounded-lg focus:outline-none focus:ring-2 focus:ring-pet-orange text-sm"
                      >
                        <option value="cash">💵 Cash</option>
                        <option value="card">💳 Card</option>
                        <option value="gcash">📱 GCash</option>
                        <option value="maya">📱 Maya</option>
                      </select>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={payment.amount}
                        onChange={(e) => updateMultiPayment(payment.id, 'amount', e.target.value)}
                        placeholder="Amount"
                        className="w-full px-3 py-2 border border-pet-orange rounded-lg focus:outline-none focus:ring-2 focus:ring-pet-orange text-sm"
                      />
                      {payment.method === 'cash' && payment.amount && parseFloat(payment.amount) > 0 && (
                        <div className="text-xs text-gray-600">
                          Amount: ₱{parseFloat(payment.amount).toFixed(2)}
                        </div>
                      )}
                    </div>
                  ))}

                  {multiPayments.length === 0 && (
                    <button
                      onClick={addMultiPayment}
                      className="w-full py-2 border-2 border-dashed border-pet-orange rounded-lg text-pet-orange hover:bg-pet-cream transition-colors text-sm font-semibold flex items-center justify-center space-x-2"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add Payment Method</span>
                    </button>
                  )}

                  {getPaymentRemaining() > 0 && (
                    <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-2">
                      <p className="text-xs text-yellow-800">
                        ⚠️ Payment incomplete. Add ₱{getPaymentRemaining().toFixed(2)} more.
                      </p>
                    </div>
                  )}

                  {calculateMultiPaymentTotal() >= calculateTotal() && (
                    <div className="bg-green-50 border border-green-300 rounded-lg p-2">
                      <p className="text-xs text-green-800 font-semibold">
                        ✅ Payment complete
                      </p>
                      {calculateChange() > 0 && (
                        <p className="text-xs text-green-700 mt-1">
                          Change: ₱{calculateChange().toFixed(2)}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Pay Later Notice */}
            {paymentMethod === 'pay-later' && (
              <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="text-2xl">⏰</div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-yellow-800 mb-1">Pay Later Order</h4>
                    <p className="text-sm text-yellow-700">
                      Stock will be decreased immediately. Payment can be collected later.
                    </p>
                    <p className="text-xs text-yellow-600 mt-2 font-semibold">
                      Total Amount: ₱{calculateTotal().toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Cash Payment - Amount Paid & Change */}
            {!useMultiPayment && paymentMethod === 'cash' && (
              <div className="space-y-2 bg-pet-cream p-3 rounded-lg border-2 border-pet-orange">
                <div>
                  <label className="block text-xs font-semibold text-pet-brown mb-1">Amount Paid *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-4 py-2 border-2 border-pet-orange rounded-lg focus:outline-none focus:ring-2 focus:ring-pet-orange text-sm lg:text-base font-semibold"
                  />
                </div>
                {amountPaid && parseFloat(amountPaid) > 0 && (
                  <div className="pt-2 border-t border-pet-orange/30">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-pet-gray-medium">Subtotal:</span>
                      <span className="font-semibold text-pet-brown">₱{calculateSubtotal().toFixed(2)}</span>
                    </div>
                    {calculateDiscount() > 0 && (
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-pet-gray-medium">Discount:</span>
                        <span className="font-semibold text-red-600">-₱{calculateDiscount().toFixed(2)}</span>
                      </div>
                    )}
                    {calculateDeliveryFee() > 0 && (
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-pet-gray-medium">Delivery Fee:</span>
                        <span className="font-semibold text-green-600">+₱{calculateDeliveryFee().toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm mb-1 pt-1 border-t border-pet-orange/30">
                      <span className="text-pet-gray-medium font-semibold">Total:</span>
                      <span className="font-bold text-pet-brown">₱{calculateTotal().toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-pet-gray-medium">Paid:</span>
                      <span className="font-semibold text-pet-brown">₱{parseFloat(amountPaid || '0').toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-base font-bold pt-2 border-t border-pet-orange/30">
                      <span className={calculateChange() >= 0 ? 'text-green-600' : 'text-red-600'}>
                        Change:
                      </span>
                      <span className={calculateChange() >= 0 ? 'text-green-600' : 'text-red-600'}>
                        ₱{calculateChange().toFixed(2)}
                      </span>
                    </div>
                    {!isAmountSufficient() && (
                      <p className="text-xs text-red-600 mt-1 font-semibold">
                        ⚠️ Insufficient payment
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer - Always Visible (Sticky) */}
        <div className="border-t-2 border-pet-orange bg-white p-4 lg:p-6 space-y-3">
          {/* Total Breakdown */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-semibold">₱{calculateSubtotal().toFixed(2)}</span>
            </div>
            {calculateDiscount() > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Discount</span>
                <span className="font-semibold text-red-600">-₱{calculateDiscount().toFixed(2)}</span>
              </div>
            )}
            {calculateDeliveryFee() > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Delivery Fee</span>
                <span className="font-semibold text-green-600">+₱{calculateDeliveryFee().toFixed(2)}</span>
              </div>
            )}
            <div className="border-t border-pet-orange/30 pt-2 mt-2">
              <div className="flex items-center justify-between">
                <span className="text-lg lg:text-xl font-bold text-pet-brown">TOTAL</span>
                <span className="text-xl lg:text-2xl font-bold text-pet-orange-dark">₱{calculateTotal().toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons - Always Accessible */}
          <div className="space-y-2">
            <button
              onClick={handleCompleteSale}
              disabled={
                isProcessing || 
                cart.length === 0 || 
                (!useMultiPayment && paymentMethod === 'cash' && !isAmountSufficient()) ||
                (useMultiPayment && !isAmountSufficient())
              }
              className="w-full bg-gradient-to-r from-pet-orange to-pet-orange-dark text-white py-3 lg:py-4 rounded-lg font-bold text-base lg:text-lg hover:from-pet-orange-dark hover:to-pet-orange transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {isProcessing ? (
                <span className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Processing...</span>
                </span>
              ) : paymentMethod === 'pay-later' ? (
                `Complete Sale (Pay Later) - ₱${calculateTotal().toFixed(2)}`
              ) : useMultiPayment ? (
                `Complete Sale - ₱${calculateTotal().toFixed(2)}${calculateChange() > 0 ? ` (Change: ₱${calculateChange().toFixed(2)})` : ''}`
              ) : (
                `Complete Sale - ₱${calculateTotal().toFixed(2)}${paymentMethod === 'cash' && calculateChange() > 0 ? ` (Change: ₱${calculateChange().toFixed(2)})` : ''}`
              )}
            </button>
            <button
              onClick={() => {
                setCart([]);
                setAmountPaid('');
              }}
              disabled={cart.length === 0}
              className="w-full bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-300 transition-colors disabled:opacity-50 text-sm lg:text-base"
            >
              Clear Cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickSale;

