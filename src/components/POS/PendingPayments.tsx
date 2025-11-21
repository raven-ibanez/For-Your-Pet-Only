import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, DollarSign, Search, X } from 'lucide-react';
import { posAPI } from '../../lib/pos';
import { supabase } from '../../lib/supabase';

interface PendingOrder {
  id: string;
  order_number: string;
  customer_name?: string;
  customer_phone?: string;
  total_amount: number;
  subtotal: number;
  discount_amount: number;
  order_date: string;
  notes?: string;
}

const PendingPayments: React.FC = () => {
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<PendingOrder | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadPendingOrders();
  }, []);

  const loadPendingOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('payment_status', 'pending')
        .eq('order_status', 'completed')
        .order('order_date', { ascending: false });

      if (error) throw error;
      setPendingOrders(data || []);
    } catch (error) {
      console.error('Error loading pending orders:', error);
      alert('Failed to load pending orders');
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = pendingOrders.filter(order => {
    const searchLower = searchTerm.toLowerCase();
    return (
      order.order_number.toLowerCase().includes(searchLower) ||
      (order.customer_name && order.customer_name.toLowerCase().includes(searchLower)) ||
      (order.customer_phone && order.customer_phone.includes(searchTerm))
    );
  });

  const handleMarkAsPaid = async (order: PendingOrder) => {
    setSelectedOrder(order);
    setAmountPaid(order.total_amount.toFixed(2));
    setPaymentMethod('cash');
    setShowPaymentModal(true);
  };

  const handleProcessPayment = async () => {
    if (!selectedOrder) return;

    if (paymentMethod === 'cash' && (!amountPaid || parseFloat(amountPaid) < selectedOrder.total_amount)) {
      alert(`Amount paid must be at least ₱${selectedOrder.total_amount.toFixed(2)}`);
      return;
    }

    try {
      setIsProcessing(true);

      // Create payment record
      await posAPI.createPayment({
        order_id: selectedOrder.id,
        payment_method: paymentMethod,
        amount: selectedOrder.total_amount,
        reference_number: paymentMethod !== 'cash' ? `PAID-${Date.now()}` : undefined
      });

      // Update order payment status
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          payment_status: 'paid',
          paid_at: new Date().toISOString(),
          paid_amount: selectedOrder.total_amount
        })
        .eq('id', selectedOrder.id);

      if (updateError) throw updateError;

      // Refresh list
      await loadPendingOrders();
      setShowPaymentModal(false);
      setSelectedOrder(null);
      setAmountPaid('');
      
      alert(`✅ Payment recorded for Order ${selectedOrder.order_number}`);
    } catch (error: any) {
      console.error('Error processing payment:', error);
      alert(`Failed to process payment: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const calculateChange = () => {
    if (!selectedOrder || paymentMethod !== 'cash' || !amountPaid) return 0;
    const paid = parseFloat(amountPaid) || 0;
    return Math.max(0, paid - selectedOrder.total_amount);
  };

  const totalPending = pendingOrders.reduce((sum, order) => sum + order.total_amount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pet-orange mx-auto mb-4"></div>
          <p className="text-pet-gray-medium">Loading pending payments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-pet-orange-dark flex items-center">
              <Clock className="h-6 w-6 mr-2" />
              Pending Payments
            </h1>
            <p className="text-pet-gray-medium mt-1">
              Manage orders with pending payments (Pay Later)
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-pet-gray-medium">Total Pending</div>
            <div className="text-2xl font-bold text-yellow-600">
              ₱{totalPending.toFixed(2)}
            </div>
            <div className="text-xs text-pet-gray-medium mt-1">
              {pendingOrders.length} order{pendingOrders.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search by order number, customer name, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border-2 border-pet-orange rounded-lg focus:outline-none focus:ring-2 focus:ring-pet-orange"
          />
        </div>
      </div>

      {/* Orders List */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 text-lg font-semibold mb-2">
              {searchTerm ? 'No orders match your search' : 'No Pending Payments'}
            </p>
            <p className="text-sm text-gray-400">
              {searchTerm 
                ? 'Try a different search term' 
                : 'All orders have been paid'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-pet-cream">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-bold text-pet-brown">Order #</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-pet-brown">Customer</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-pet-brown">Date</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-pet-brown">Subtotal</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-pet-brown">Discount</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-pet-brown">Total</th>
                  <th className="px-6 py-4 text-center text-sm font-bold text-pet-brown">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-pet-cream transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-semibold text-pet-brown">{order.order_number}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">
                          {order.customer_name || 'Walk-in Customer'}
                        </div>
                        {order.customer_phone && (
                          <div className="text-sm text-gray-500">{order.customer_phone}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(order.order_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      ₱{order.subtotal.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-red-600">
                      {order.discount_amount > 0 ? `-₱${order.discount_amount.toFixed(2)}` : '₱0.00'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-pet-orange-dark text-lg">
                        ₱{order.total_amount.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleMarkAsPaid(order)}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 mx-auto"
                      >
                        <DollarSign className="h-4 w-4" />
                        <span>Mark as Paid</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-pet-orange-dark">Record Payment</h2>
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedOrder(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div className="bg-pet-cream rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-2">Order Number</div>
                <div className="font-bold text-lg">{selectedOrder.order_number}</div>
              </div>

              <div className="bg-pet-cream rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-2">Customer</div>
                <div className="font-semibold">
                  {selectedOrder.customer_name || 'Walk-in Customer'}
                </div>
                {selectedOrder.customer_phone && (
                  <div className="text-sm text-gray-600">{selectedOrder.customer_phone}</div>
                )}
              </div>

              <div className="bg-pet-cream rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Total Amount:</span>
                  <span className="font-bold text-xl text-pet-orange-dark">
                    ₱{selectedOrder.total_amount.toFixed(2)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method *
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => {
                    setPaymentMethod(e.target.value);
                    if (e.target.value !== 'cash') {
                      setAmountPaid(selectedOrder.total_amount.toFixed(2));
                    }
                  }}
                  className="w-full px-4 py-3 border-2 border-pet-orange rounded-lg focus:outline-none focus:ring-2 focus:ring-pet-orange"
                >
                  <option value="cash">💵 Cash</option>
                  <option value="card">💳 Card</option>
                  <option value="gcash">📱 GCash</option>
                  <option value="maya">📱 Maya</option>
                </select>
              </div>

              {paymentMethod === 'cash' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount Paid *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min={selectedOrder.total_amount}
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-pet-orange rounded-lg focus:outline-none focus:ring-2 focus:ring-pet-orange"
                    placeholder={`₱${selectedOrder.total_amount.toFixed(2)}`}
                  />
                  {amountPaid && parseFloat(amountPaid) >= selectedOrder.total_amount && calculateChange() > 0 && (
                    <div className="mt-2 bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">Change:</span>
                        <span className="font-bold text-green-600">
                          ₱{calculateChange().toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                  {amountPaid && parseFloat(amountPaid) < selectedOrder.total_amount && (
                    <p className="text-xs text-red-600 mt-1">
                      ⚠️ Amount is less than total
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedOrder(null);
                }}
                className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleProcessPayment}
                disabled={isProcessing || (paymentMethod === 'cash' && (!amountPaid || parseFloat(amountPaid) < selectedOrder.total_amount))}
                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    <span>Record Payment</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PendingPayments;

