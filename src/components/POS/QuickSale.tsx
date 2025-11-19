import React, { useState, useEffect } from 'react';
import { Search, Plus, Minus, Trash2, ShoppingCart, X, Package } from 'lucide-react';
import { posAPI } from '../../lib/pos';
import { useMenu } from '../../hooks/useMenu';
import { supabase } from '../../lib/supabase';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
}

const QuickSale: React.FC = () => {
  const { menuItems, loading: productsLoading } = useMenu();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastOrderNumber, setLastOrderNumber] = useState('');

  const filteredProducts = menuItems.filter(item => {
    const matchesSearch = searchTerm === '' || 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch && item.available;
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

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + item.total, 0);
  };

  const calculateChange = () => {
    if (paymentMethod !== 'cash' || !amountPaid) return 0;
    const paid = parseFloat(amountPaid) || 0;
    const total = calculateTotal();
    return Math.max(0, paid - total);
  };

  const isAmountSufficient = () => {
    if (paymentMethod !== 'cash') return true;
    const paid = parseFloat(amountPaid) || 0;
    return paid >= calculateTotal();
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

    if (paymentMethod === 'cash' && !isAmountSufficient()) {
      alert(`Insufficient payment. Total is ₱${calculateTotal().toFixed(2)} but only ₱${parseFloat(amountPaid || '0').toFixed(2)} was paid.`);
      return;
    }

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
        }))
      });

      console.log('Order created:', order.order_number);

      // Create payment
      console.log('Creating payment...');
      await posAPI.createPayment({
        order_id: order.id,
        payment_method: paymentMethod,
        amount: calculateTotal()
      });

      console.log('Payment recorded');

      // Get stock levels BEFORE completing order
      console.log('📊 Checking stock levels before sale...');
      const stockBefore: { [key: string]: number } = {};
      for (const item of cart) {
        const inv = await posAPI.getInventoryForItem(item.id);
        stockBefore[item.id] = inv?.current_stock || 0;
        console.log(`Before sale - ${item.name}: ${stockBefore[item.id]} units`);
      }

      // Complete order (might trigger database automatic update)
      console.log('Completing order...');
      await posAPI.completeOrder(order.id);
      console.log('Order completed successfully!');

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

      // Show success
      setLastOrderNumber(order.order_number);
      setShowSuccess(true);

      // Reset form
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setPaymentMethod('cash');
      setAmountPaid('');

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
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg z-50 animate-slide-up">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">✅</div>
            <div>
              <p className="font-bold">Sale Completed!</p>
              <p className="text-sm">Order #{lastOrderNumber}</p>
            </div>
          </div>
        </div>
      )}

      {/* Products List - Left Side */}
      <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-4 lg:p-6 max-h-[70vh] lg:max-h-[calc(100vh-12rem)] overflow-y-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-pet-orange-dark mb-4">Select Products</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border-2 border-pet-orange rounded-lg focus:outline-none focus:ring-2 focus:ring-pet-orange"
            />
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-pet-gray-medium">
            Showing {filteredProducts.length} of {menuItems.length} products
            {menuItems.length > filteredProducts.length && ` (${menuItems.length - filteredProducts.length} unavailable hidden)`}
          </p>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="text-sm text-pet-orange hover:text-pet-orange-dark"
            >
              Clear search
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
            filteredProducts.map(product => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                className="p-4 border-2 border-pet-orange rounded-lg hover:bg-pet-cream transition-colors text-left group relative"
                title={`${product.name} - ₱${product.basePrice.toFixed(2)}`}
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
                <p className="font-semibold text-pet-brown text-sm mb-1 line-clamp-2">{product.name}</p>
                <p className="text-lg font-bold text-pet-orange-dark">₱{product.basePrice.toFixed(2)}</p>
                {product.isOnDiscount && (
                  <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                    SALE
                  </div>
                )}
              </button>
            ))
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

          {/* Payment Method */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-pet-brown mb-2 uppercase">Payment Method</label>
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
              </select>
            </div>

            {/* Cash Payment - Amount Paid & Change */}
            {paymentMethod === 'cash' && (
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
                      <span className="text-pet-gray-medium">Total:</span>
                      <span className="font-semibold text-pet-brown">₱{calculateTotal().toFixed(2)}</span>
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
          {/* Total */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-semibold">₱{calculateTotal().toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-lg lg:text-xl font-bold text-pet-brown">TOTAL</span>
              <span className="text-xl lg:text-2xl font-bold text-pet-orange-dark">₱{calculateTotal().toFixed(2)}</span>
            </div>
          </div>

          {/* Action Buttons - Always Accessible */}
          <div className="space-y-2">
            <button
              onClick={handleCompleteSale}
              disabled={isProcessing || cart.length === 0 || (paymentMethod === 'cash' && !isAmountSufficient())}
              className="w-full bg-gradient-to-r from-pet-orange to-pet-orange-dark text-white py-3 lg:py-4 rounded-lg font-bold text-base lg:text-lg hover:from-pet-orange-dark hover:to-pet-orange transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {isProcessing ? (
                <span className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Processing...</span>
                </span>
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

