import React, { useState } from 'react';
import { ArrowLeft, Clock } from 'lucide-react';
import { CartItem, PaymentMethod, ServiceType } from '../types';
import { usePaymentMethods } from '../hooks/usePaymentMethods';

interface CheckoutProps {
  cartItems: CartItem[];
  totalPrice: number;
  onBack: () => void;
}

const Checkout: React.FC<CheckoutProps> = ({ cartItems, totalPrice, onBack }) => {
  const { paymentMethods } = usePaymentMethods();
  const [step, setStep] = useState<'details' | 'payment'>('details');
  const [customerName, setCustomerName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [serviceType, setServiceType] = useState<ServiceType>('pickup');
  const [address, setAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [pickupTime, setPickupTime] = useState('5-10');
  const [customTime, setCustomTime] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('gcash');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [cashAmountPaid, setCashAmountPaid] = useState('');
  const [cashChangeNeeded, setCashChangeNeeded] = useState('');

  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  // Set default payment method when payment methods are loaded
  React.useEffect(() => {
    if (paymentMethods.length > 0 && paymentMethod !== 'cash' && !paymentMethods.find(m => m.id === paymentMethod)) {
      setPaymentMethod(paymentMethods[0].id as PaymentMethod);
    }
  }, [paymentMethods, paymentMethod]);

  const selectedPaymentMethod = paymentMethods.find(method => method.id === paymentMethod);

  // Check if payment method is QR PH and calculate 1% fee
  const isQRPH = selectedPaymentMethod?.name.toLowerCase().includes('qr ph') || 
                 selectedPaymentMethod?.name.toLowerCase().includes('qrph') ||
                 selectedPaymentMethod?.id.toLowerCase().includes('qr-ph') ||
                 selectedPaymentMethod?.id.toLowerCase().includes('qrph');
  
  const qrphFee = React.useMemo(() => {
    if (isQRPH && totalPrice > 0) {
      return totalPrice * 0.01; // 1% fee
    }
    return 0;
  }, [isQRPH, totalPrice]);

  const finalTotal = React.useMemo(() => {
    return totalPrice + qrphFee;
  }, [totalPrice, qrphFee]);

  // Calculate change when cash amount paid changes
  const cashChange = React.useMemo(() => {
    if (paymentMethod === 'cash' && cashAmountPaid) {
      const paid = parseFloat(cashAmountPaid);
      if (!isNaN(paid) && paid >= finalTotal) {
        return (paid - finalTotal).toFixed(2);
      }
    }
    return '0.00';
  }, [cashAmountPaid, finalTotal, paymentMethod]);

  const handleProceedToPayment = () => {
    setStep('payment');
  };

  const handlePlaceOrder = () => {
    const timeInfo = serviceType === 'pickup' 
      ? (pickupTime === 'custom' ? customTime : `${pickupTime} minutes`)
      : '';
    
    const orderDetails = `
🛒 For Your Pets Only ORDER

👤 Customer: ${customerName}
📞 Contact: ${contactNumber}
📍 Service: ${serviceType.charAt(0).toUpperCase() + serviceType.slice(1)}
${serviceType === 'delivery' ? `🏠 Address: ${address}${landmark ? `\n🗺️ Landmark: ${landmark}` : ''}` : ''}
${serviceType === 'pickup' ? `⏰ Pickup Time: ${timeInfo}` : ''}


📋 ORDER DETAILS:
${cartItems.map(item => {
  let itemDetails = `• ${item.name}`;
  if (item.selectedVariation) {
    itemDetails += ` (${item.selectedVariation.name})`;
  }
  if (item.selectedAddOns && item.selectedAddOns.length > 0) {
    itemDetails += ` + ${item.selectedAddOns.map(addOn => 
      addOn.quantity && addOn.quantity > 1 
        ? `${addOn.name} x${addOn.quantity}`
        : addOn.name
    ).join(', ')}`;
  }
  // Get base price (use basePrice or effectivePrice)
  const basePrice = item.basePrice || item.effectivePrice || item.totalPrice;
  itemDetails += ` ₱${basePrice.toFixed(2)} x ${item.quantity} - ₱${(item.totalPrice * item.quantity).toFixed(2)}`;
  return itemDetails;
}).join('\n\n')}

💰 SUBTOTAL: ₱${totalPrice.toFixed(2)}
${qrphFee > 0 ? `💳 QR PH Fee (1%): ₱${qrphFee.toFixed(2)}` : ''}
${serviceType === 'delivery' ? `🛵 DELIVERY FEE:` : ''}

💰 TOTAL: ₱${finalTotal.toFixed(2)}

💳 Payment: ${paymentMethod === 'cash' ? 'Cash' : (selectedPaymentMethod?.name || paymentMethod)}
${paymentMethod === 'cash' 
  ? `💰 Amount Paid: ₱${cashAmountPaid || '0.00'}\n${cashChange !== '0.00' ? `🔄 Change: ₱${cashChange}` : ''}${cashChangeNeeded ? `\n📝 Change Note: ${cashChangeNeeded}` : ''}`
  : `📸 Payment Screenshot: Please attach your payment receipt screenshot${qrphFee > 0 ? `\n💡 Note: 1% QR PH convenience fee included` : ''}`}

${notes ? `📝 Notes: ${notes}` : ''}

Please confirm this order to proceed. Thank you for choosing For Your Pets Only! 🥟
    `.trim();

    const encodedMessage = encodeURIComponent(orderDetails);
    const messengerUrl = `https://m.me/100310379306836?text=${encodedMessage}`;
    
    window.open(messengerUrl, '_blank');
    
  };

  const isDetailsValid = customerName && contactNumber && 
    (serviceType !== 'delivery' || address) && 
    (serviceType !== 'pickup' || (pickupTime !== 'custom' || customTime));

  if (step === 'details') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center mb-8">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-pet-orange hover:text-pet-orange-dark transition-colors duration-200 font-semibold"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Cart</span>
          </button>
          <h1 className="text-3xl font-display font-bold text-pet-orange-dark ml-8">📦 Order Details</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Order Summary */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-pet-orange">
            <h2 className="text-2xl font-display font-bold text-pet-orange-dark mb-6">📋 Order Summary</h2>
            
            <div className="space-y-4 mb-6">
              {cartItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-2 border-b-2 border-pet-beige">
                  <div>
                    <h4 className="font-semibold text-pet-brown">{item.name}</h4>
                    {item.selectedVariation && (
                      <p className="text-sm text-gray-600">Size: {item.selectedVariation.name}</p>
                    )}
                    {item.selectedAddOns && item.selectedAddOns.length > 0 && (
                      <p className="text-sm text-gray-600">
                        Add-ons: {item.selectedAddOns.map(addOn => addOn.name).join(', ')}
                      </p>
                    )}
                    <p className="text-sm text-gray-600">₱{item.totalPrice} x {item.quantity}</p>
                  </div>
                  <span className="font-bold text-pet-orange-dark">₱{item.totalPrice * item.quantity}</span>
                </div>
              ))}
            </div>
            
            <div className="border-t-2 border-pet-orange pt-4">
              <div className="flex items-center justify-between text-2xl font-display font-bold text-pet-brown">
                <span>Total:</span>
                <span className="text-pet-orange-dark">₱{totalPrice}</span>
              </div>
            </div>
          </div>

          {/* Customer Details Form */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-pet-orange">
            <h2 className="text-2xl font-display font-bold text-pet-orange-dark mb-6">👤 Customer Information</h2>
            
            <form className="space-y-6">
              {/* Customer Information */}
              <div>
                <label className="block text-sm font-semibold text-pet-brown mb-2">Full Name *</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-pet-orange rounded-lg focus:ring-2 focus:ring-pet-orange focus:border-pet-orange-dark transition-all duration-200"
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-pet-brown mb-2">Contact Number *</label>
                <input
                  type="tel"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-pet-orange rounded-lg focus:ring-2 focus:ring-pet-orange focus:border-pet-orange-dark transition-all duration-200"
                  placeholder="09XX XXX XXXX"
                  required
                />
              </div>

              {/* Service Type */}
              <div>
                <label className="block text-sm font-semibold text-pet-brown mb-3">Service Type *</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'pickup', label: 'Pickup', icon: '🚶' },
                    { value: 'delivery', label: 'Delivery', icon: '🛵' }
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setServiceType(option.value as ServiceType)}
                      className={`p-4 rounded-lg border-2 transition-all duration-200 font-semibold ${
                        serviceType === option.value
                          ? 'border-pet-orange bg-pet-orange text-white shadow-lg'
                          : 'border-pet-orange bg-white text-pet-brown hover:bg-pet-beige'
                      }`}
                    >
                      <div className="text-2xl mb-1">{option.icon}</div>
                      <div className="text-sm">{option.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Pickup Time Selection */}
              {serviceType === 'pickup' && (
                <div>
                  <label className="block text-sm font-medium text-black mb-3">Pickup Time *</label>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { value: '5-10', label: '5-10 minutes' },
                        { value: '15-20', label: '15-20 minutes' },
                        { value: '25-30', label: '25-30 minutes' },
                        { value: 'custom', label: 'Custom Time' }
                      ].map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setPickupTime(option.value)}
                          className={`p-3 rounded-lg border-2 transition-all duration-200 text-sm ${
                            pickupTime === option.value
                              ? 'border-red-600 bg-red-600 text-white'
                              : 'border-red-300 bg-white text-gray-700 hover:border-red-400'
                          }`}
                        >
                          <Clock className="h-4 w-4 mx-auto mb-1" />
                          {option.label}
                        </button>
                      ))}
                    </div>
                    
                    {pickupTime === 'custom' && (
                      <input
                        type="text"
                        value={customTime}
                        onChange={(e) => setCustomTime(e.target.value)}
                        className="w-full px-4 py-3 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200"
                        placeholder="e.g., 45 minutes, 1 hour, 2:30 PM"
                        required
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Delivery Address */}
              {serviceType === 'delivery' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-black mb-2">Delivery Address *</label>
                    <textarea
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full px-4 py-3 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200"
                      placeholder="Enter your complete delivery address"
                      rows={3}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-black mb-2">Landmark</label>
                    <input
                      type="text"
                      value={landmark}
                      onChange={(e) => setLandmark(e.target.value)}
                      className="w-full px-4 py-3 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200"
                      placeholder="e.g., Near McDonald's, Beside 7-Eleven, In front of school"
                    />
                  </div>
                </>
              )}

              {/* Special Notes */}
              <div>
                <label className="block text-sm font-medium text-black mb-2">Special Instructions</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-3 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200"
                  placeholder="Any special requests or notes..."
                  rows={3}
                />
              </div>

              <button
                onClick={handleProceedToPayment}
                disabled={!isDetailsValid}
                className={`w-full py-4 rounded-xl font-medium text-lg transition-all duration-200 transform ${
                  isDetailsValid
                    ? 'bg-red-600 text-white hover:bg-red-700 hover:scale-[1.02]'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Proceed to Payment
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Payment Step
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center mb-8">
        <button
          onClick={() => setStep('details')}
          className="flex items-center space-x-2 text-gray-600 hover:text-black transition-colors duration-200"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back to Details</span>
        </button>
        <h1 className="text-3xl font-noto font-semibold text-black ml-8">Payment</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Payment Method Selection */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-2xl font-noto font-medium text-black mb-6">Choose Payment Method</h2>
          
          <div className="grid grid-cols-1 gap-4 mb-6">
            {/* Cash Payment Option */}
            <button
              type="button"
              onClick={() => {
                setPaymentMethod('cash');
                setCashAmountPaid('');
                setCashChangeNeeded('');
              }}
              className={`p-4 rounded-lg border-2 transition-all duration-200 flex items-center space-x-3 ${
                paymentMethod === 'cash'
                  ? 'border-red-600 bg-red-600 text-white'
                  : 'border-red-300 bg-white text-gray-700 hover:border-red-400'
              }`}
            >
              <span className="text-2xl">💵</span>
              <span className="font-medium">Cash</span>
            </button>
            
            {/* Other Payment Methods */}
            {paymentMethods.map((method) => (
              <button
                key={method.id}
                type="button"
                onClick={() => {
                  setPaymentMethod(method.id as PaymentMethod);
                  setCashAmountPaid('');
                  setCashChangeNeeded('');
                }}
                className={`p-4 rounded-lg border-2 transition-all duration-200 flex items-center space-x-3 ${
                  paymentMethod === method.id
                    ? 'border-red-600 bg-red-600 text-white'
                    : 'border-red-300 bg-white text-gray-700 hover:border-red-400'
                }`}
              >
                <span className="text-2xl">💳</span>
                <span className="font-medium">{method.name}</span>
              </button>
            ))}
          </div>

          {/* Cash Payment Details */}
          {paymentMethod === 'cash' && (
            <div className="bg-green-50 rounded-lg p-6 mb-6 border-2 border-green-200">
              <h3 className="font-medium text-black mb-4">💵 Cash Payment Details</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Amount Paid *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min={finalTotal}
                    value={cashAmountPaid}
                    onChange={(e) => {
                      const value = e.target.value;
                      setCashAmountPaid(value);
                      // Auto-calculate if amount is sufficient
                      if (value && parseFloat(value) >= finalTotal) {
                        const change = (parseFloat(value) - finalTotal).toFixed(2);
                        if (parseFloat(change) > 0) {
                          setCashChangeNeeded(`Change needed: ₱${change}`);
                        } else {
                          setCashChangeNeeded('');
                        }
                      } else {
                        setCashChangeNeeded('');
                      }
                    }}
                    className="w-full px-4 py-3 border-2 border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg font-semibold"
                    placeholder={`₱${finalTotal.toFixed(2)}`}
                    required={paymentMethod === 'cash'}
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    {qrphFee > 0 ? (
                      <>
                        Subtotal: ₱{totalPrice.toFixed(2)}<br />
                        QR PH Fee (1%): ₱{qrphFee.toFixed(2)}<br />
                        <span className="font-semibold">Total: ₱{finalTotal.toFixed(2)}</span>
                      </>
                    ) : (
                      `Total amount: ₱${totalPrice.toFixed(2)}`
                    )}
                  </p>
                </div>

                {cashAmountPaid && parseFloat(cashAmountPaid) >= finalTotal && (
                  <div className="bg-white rounded-lg p-4 border-2 border-green-300">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Change:</span>
                      <span className="text-xl font-bold text-green-600">₱{cashChange}</span>
                    </div>
                    {parseFloat(cashChange) > 0 && (
                      <p className="text-xs text-green-700 mt-2">
                        ✓ Please prepare change of ₱{cashChange}
                      </p>
                    )}
                  </div>
                )}

                {cashAmountPaid && parseFloat(cashAmountPaid) < finalTotal && (
                  <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                    <p className="text-sm text-red-600">
                      ⚠️ Amount paid (₱{parseFloat(cashAmountPaid).toFixed(2)}) is less than total (₱{finalTotal.toFixed(2)})
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Additional Notes (Optional)
                  </label>
                  <textarea
                    value={cashChangeNeeded}
                    onChange={(e) => setCashChangeNeeded(e.target.value)}
                    className="w-full px-4 py-3 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="e.g., Please prepare exact change, No change needed, etc."
                    rows={2}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Payment Details with QR Code */}
          {selectedPaymentMethod && paymentMethod !== 'cash' && (
            <div className="bg-red-50 rounded-lg p-6 mb-6">
              <h3 className="font-medium text-black mb-4">Payment Details</h3>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex-1">
                  <p className="text-sm text-gray-600 mb-1">{selectedPaymentMethod.name}</p>
                  <p className="font-mono text-black font-medium">{selectedPaymentMethod.account_number}</p>
                  <p className="text-sm text-gray-600 mb-3">Account Name: {selectedPaymentMethod.account_name}</p>
                  {qrphFee > 0 && (
                    <div className="mb-2">
                      <p className="text-sm text-gray-600">Subtotal: ₱{totalPrice.toFixed(2)}</p>
                      <p className="text-sm text-orange-600 font-semibold">QR PH Fee (1%): ₱{qrphFee.toFixed(2)}</p>
                    </div>
                  )}
                  <p className="text-xl font-semibold text-black">Amount: ₱{finalTotal.toFixed(2)}</p>
                </div>
                <div className="flex-shrink-0">
                  <img 
                    src={selectedPaymentMethod.qr_code_url} 
                    alt={`${selectedPaymentMethod.name} QR Code`}
                    className="w-32 h-32 rounded-lg border-2 border-red-300 shadow-sm"
                    onError={(e) => {
                      e.currentTarget.src = 'https://images.pexels.com/photos/8867482/pexels-photo-8867482.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop';
                    }}
                  />
                  <p className="text-xs text-gray-500 text-center mt-2">Scan to pay</p>
                </div>
              </div>
            </div>
          )}

          {/* Reference Number - Only show for non-cash payments */}
          {paymentMethod !== 'cash' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-black mb-2">📸 Payment Proof Required</h4>
              <p className="text-sm text-gray-700">
                After making your payment, please take a screenshot of your payment receipt and attach it when you send your order via Messenger. This helps us verify and process your order quickly.
              </p>
            </div>
          )}
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-2xl font-noto font-medium text-black mb-6">Final Order Summary</h2>
          
          <div className="space-y-4 mb-6">
            <div className="bg-red-50 rounded-lg p-4">
              <h4 className="font-medium text-black mb-2">Customer Details</h4>
              <p className="text-sm text-gray-600">Name: {customerName}</p>
              <p className="text-sm text-gray-600">Contact: {contactNumber}</p>
              <p className="text-sm text-gray-600">Service: {serviceType.charAt(0).toUpperCase() + serviceType.slice(1)}</p>
              {serviceType === 'delivery' && (
                <>
                  <p className="text-sm text-gray-600">Address: {address}</p>
                  {landmark && <p className="text-sm text-gray-600">Landmark: {landmark}</p>}
                </>
              )}
              {serviceType === 'pickup' && (
                <p className="text-sm text-gray-600">
                  Pickup Time: {pickupTime === 'custom' ? customTime : `${pickupTime} minutes`}
                </p>
              )}
            </div>

            {cartItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-2 border-b border-red-100">
                <div>
                  <h4 className="font-medium text-black">{item.name}</h4>
                  {item.selectedVariation && (
                    <p className="text-sm text-gray-600">Size: {item.selectedVariation.name}</p>
                  )}
                  {item.selectedAddOns && item.selectedAddOns.length > 0 && (
                    <p className="text-sm text-gray-600">
                      Add-ons: {item.selectedAddOns.map(addOn => 
                        addOn.quantity && addOn.quantity > 1 
                          ? `${addOn.name} x${addOn.quantity}`
                          : addOn.name
                      ).join(', ')}
                    </p>
                  )}
                  <p className="text-sm text-gray-600">₱{item.totalPrice} x {item.quantity}</p>
                </div>
                <span className="font-semibold text-black">₱{item.totalPrice * item.quantity}</span>
              </div>
            ))}
          </div>
          
          <div className="border-t border-red-200 pt-4 mb-6">
            <div className="flex items-center justify-between text-2xl font-noto font-semibold text-black">
              <span>Total:</span>
              <div className="text-right">
                {qrphFee > 0 && (
                  <>
                    <div className="text-sm text-gray-600">Subtotal: ₱{totalPrice.toFixed(2)}</div>
                    <div className="text-sm text-orange-600">QR PH Fee (1%): ₱{qrphFee.toFixed(2)}</div>
                  </>
                )}
                <span className="font-bold text-lg">₱{finalTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <button
            onClick={handlePlaceOrder}
            disabled={paymentMethod === 'cash' && (!cashAmountPaid || parseFloat(cashAmountPaid) < finalTotal)}
            className={`w-full py-4 rounded-xl font-medium text-lg transition-all duration-200 transform ${
              paymentMethod === 'cash' && (!cashAmountPaid || parseFloat(cashAmountPaid) < finalTotal)
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-red-600 text-white hover:bg-red-700 hover:scale-[1.02]'
            }`}
          >
            Place Order via Messenger
          </button>
          
          <p className="text-xs text-gray-500 text-center mt-3">
            You'll be redirected to Facebook Messenger to confirm your order. Don't forget to attach your payment screenshot!
          </p>
        </div>
      </div>
    </div>
  );
};

export default Checkout;