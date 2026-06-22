import React, { useState } from 'react';
import { ArrowLeft, Clock, MapPin, Truck, Package, ClipboardList, Tag, AlertTriangle, CheckCircle2, Banknote, CreditCard, MessageSquare, Phone, User } from 'lucide-react';
import { CartItem, PaymentMethod, ServiceType } from '../types';
import { usePaymentMethods } from '../hooks/usePaymentMethods';
import { useDeliverySettings } from '../hooks/useDeliverySettings';
import { posAPI } from '../lib/pos';
import { useMenu } from '../hooks/useMenu';
import { supabase } from '../lib/supabase';

interface CheckoutProps {
  cartItems: CartItem[];
  totalPrice: number;
  onBack: () => void;
}

const Checkout: React.FC<CheckoutProps> = ({ cartItems, totalPrice, onBack }) => {
  const { paymentMethods } = usePaymentMethods();
  const { menuItems } = useMenu();
  const { subdivisions, globalSettings } = useDeliverySettings();
  const [step, setStep] = useState<'details' | 'payment' | 'success'>('details');
  const [createdOrderNumber, setCreatedOrderNumber] = useState('');
  const [generatedMessengerUrl, setGeneratedMessengerUrl] = useState('');
  const [createdOrderDetails, setCreatedOrderDetails] = useState('');
  const [copied, setCopied] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [serviceType, setServiceType] = useState<ServiceType>('pickup');

  // Pickup fields
  const [pickupTime, setPickupTime] = useState('5-10');
  const [customTime, setCustomTime] = useState('');

  // Store Delivery Rider fields
  const [selectedSubdivisionId, setSelectedSubdivisionId] = useState('');
  const [phase, setPhase] = useState('');
  const [block, setBlock] = useState('');
  const [lot, setLot] = useState('');
  const [streetName, setStreetName] = useState('');
  const [pinAddress, setPinAddress] = useState('');
  const [deliveryLandmark, setDeliveryLandmark] = useState('');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');

  // Lalamove fields
  const [lalamoveAddress, setLalamoveAddress] = useState('');
  const [lalamoveNote, setLalamoveNote] = useState('');

  // Payment fields
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('gcash');
  const [cashOption, setCashOption] = useState<string>('exact');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [cashAmountPaid, setCashAmountPaid] = useState('');
  const [cashChangeNeeded, setCashChangeNeeded] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Voucher fields
  const [voucherCode, setVoucherCode] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState<any | null>(null);
  const [voucherError, setVoucherError] = useState('');
  const [isApplyingVoucher, setIsApplyingVoucher] = useState(false);

  // Active subdivisions only
  const activeSubdivisions = subdivisions.filter(s => s.active);

  // Selected subdivision
  const selectedSubdivision = activeSubdivisions.find(s => s.id === selectedSubdivisionId);

  // Delivery fee calculation
  const deliveryFee = React.useMemo(() => {
    if (serviceType !== 'store-delivery' || !selectedSubdivision) return 0;
    if (globalSettings.free_delivery_promo) return 0;
    return selectedSubdivision.delivery_fee;
  }, [serviceType, selectedSubdivision, globalSettings.free_delivery_promo]);

  const selectedPaymentMethod = paymentMethods.find(method => method.id === paymentMethod);

  // Check if payment method is QR PH and calculate 1% fee
  const isQRPH = selectedPaymentMethod?.name?.toLowerCase().includes('qr ph') ||
    selectedPaymentMethod?.name?.toLowerCase().includes('qrph') ||
    selectedPaymentMethod?.id?.toLowerCase().includes('qr-ph') ||
    selectedPaymentMethod?.id?.toLowerCase().includes('qrph');

  const qrphFee = React.useMemo(() => {
    if (isQRPH && totalPrice > 0) {
      return totalPrice * 0.01; // 1% fee
    }
    return 0;
  }, [isQRPH, totalPrice]);

  const voucherDiscount = React.useMemo(() => {
    if (!appliedVoucher) return 0;
    if (appliedVoucher.type === 'free_delivery') {
      return serviceType === 'store-delivery' ? deliveryFee : 0;
    }
    if (appliedVoucher.type === 'percentage') {
      return totalPrice * (appliedVoucher.value / 100);
    }
    if (appliedVoucher.type === 'fixed') {
      return Math.min(appliedVoucher.value, totalPrice);
    }
    return 0;
  }, [appliedVoucher, totalPrice, deliveryFee, serviceType]);

  const finalTotal = React.useMemo(() => {
    return Math.max(0, totalPrice + qrphFee + deliveryFee - voucherDiscount);
  }, [totalPrice, qrphFee, deliveryFee, voucherDiscount]);

  const handleApplyVoucher = async () => {
    if (!voucherCode.trim()) return;
    try {
      setIsApplyingVoucher(true);
      setVoucherError('');

      const { data, error } = await supabase
        .from('vouchers')
        .select('*')
        .eq('code', voucherCode.trim().toUpperCase())
        .single();

      if (error || !data) {
        setVoucherError('Invalid voucher code');
        setAppliedVoucher(null);
        return;
      }

      if (!data.active) {
        setVoucherError('This voucher code is inactive');
        setAppliedVoucher(null);
        return;
      }

      if (data.type === 'free_delivery' && serviceType !== 'store-delivery') {
        setVoucherError('Free delivery vouchers are only applicable for Store Delivery Rider');
        setAppliedVoucher(null);
        return;
      }

      setAppliedVoucher(data);
      setVoucherError('');
    } catch (err) {
      console.error(err);
      setVoucherError('Error validating voucher code');
    } finally {
      setIsApplyingVoucher(false);
    }
  };

  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setVoucherCode('');
    setVoucherError('');
  };

  // Remove free delivery voucher if serviceType is changed to something other than store-delivery
  React.useEffect(() => {
    if (appliedVoucher && appliedVoucher.type === 'free_delivery' && serviceType !== 'store-delivery') {
      setAppliedVoucher(null);
      setVoucherCode('');
      setVoucherError('Free delivery voucher was removed because it is only applicable for Store Delivery Rider.');
    }
  }, [serviceType, appliedVoucher]);

  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  // Set default payment method when payment methods are loaded
  React.useEffect(() => {
    if (paymentMethods.length > 0 && paymentMethod !== 'cash' && !paymentMethods.find(m => m.id === paymentMethod)) {
      setPaymentMethod(paymentMethods[0].id as PaymentMethod);
    }
  }, [paymentMethods, paymentMethod]);

  // Reset payment method if Cash is selected but service type is Lalamove
  React.useEffect(() => {
    if (serviceType === 'lalamove' && paymentMethod === 'cash') {
      const defaultMethod = paymentMethods.find(m => m.id !== 'cash')?.id || 'gcash';
      setPaymentMethod(defaultMethod as PaymentMethod);
    }
  }, [serviceType, paymentMethod, paymentMethods]);

  // Sync cashAmountPaid when cashOption or finalTotal changes
  React.useEffect(() => {
    if (paymentMethod === 'cash') {
      if (cashOption === 'exact') {
        setCashAmountPaid(finalTotal.toFixed(2));
      } else if (['100', '200', '500', '1000'].includes(cashOption)) {
        const billValue = parseFloat(cashOption);
        if (billValue <= finalTotal) {
          setCashOption('exact');
          setCashAmountPaid(finalTotal.toFixed(2));
        } else {
          setCashAmountPaid(cashOption);
        }
      }
    }
  }, [cashOption, finalTotal, paymentMethod]);

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

  const handlePlaceOrder = async () => {
    if (isProcessing) return;

    try {
      setIsProcessing(true);
      console.log('🛒 Starting order creation for website checkout...');

      // Prepare order items - calculate unit price per item (totalPrice already includes variations/add-ons)
      const orderItems = cartItems.map(item => {
        // For each cart item, the totalPrice is the price per unit (base + variations + add-ons)
        // So unit_price should be totalPrice (it's already per unit)
        const unitPrice = item.totalPrice;

        // Extract base menu_item_id from the unique cart item ID
        // Cart item ID format: {menu_item_id}-{variation_id}-{addon_ids}
        // We need just the base menu_item_id (UUID format: 8-4-4-4-12 = 36 chars)
        let menuItemId = item.id;
        if (item.id.includes('-default-') || item.id.includes('-')) {
          // Try to extract UUID (first 36 characters if it starts with UUID)
          // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
          const uuidMatch = item.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
          if (uuidMatch) {
            menuItemId = uuidMatch[0];
          } else {
            // Fallback: try to find by name in menuItems
            const menuItem = menuItems.find(mi => mi.name === item.name);
            if (menuItem) {
              menuItemId = menuItem.id;
            } else {
              // Last resort: use first part before first '-default-' or '-'
              menuItemId = item.id.split('-default-')[0].split('-').slice(0, 5).join('-');
            }
          }
        }

        let itemName = item.name;
        if (item.selectedVariation) {
          itemName += ` (${item.selectedVariation.name})`;
        }
        if (item.selectedAddOns && item.selectedAddOns.length > 0) {
          itemName += ` + ${item.selectedAddOns.map(addOn => addOn.name).join(', ')}`;
        }

        return {
          menu_item_id: menuItemId,
          item_name: itemName,
          unit_price: unitPrice,
          quantity: item.quantity
        };
      });

      // Create order in database
      console.log('📝 Creating order in database...');
      const order = await posAPI.createOrder({
        order_type: serviceType, // 'pickup', 'store-delivery', or 'lalamove'
        customer_name: customerName,
        customer_phone: contactNumber,
        items: orderItems,
        discount_amount: voucherDiscount
      });

      console.log('✅ Order created:', order.order_number);

      // Create payment record
      console.log('💳 Creating payment record...');
      await posAPI.createPayment({
        order_id: order.id,
        payment_method: paymentMethod === 'cash' ? 'cash' : paymentMethod,
        amount: finalTotal,
        reference_number: referenceNumber || undefined
      });

      console.log('✅ Payment recorded');

      // Complete the order immediately to trigger inventory updates
      console.log('📦 Completing order to update inventory...');
      await posAPI.completeOrder(order.id);

      console.log('✅ Order completed - inventory updated!');

      // Deduct variation stocks manually
      for (const item of cartItems) {
        if (item.selectedVariation && item.selectedVariation.id) {
          const varId = item.selectedVariation.id;
          const currentStock = item.selectedVariation.stock_on_hand || 0;
          const newStock = Math.max(0, currentStock - item.quantity);
          console.log(`🔄 Deducting variation stock for ${item.name} (${item.selectedVariation.name}): ${currentStock} -> ${newStock}`);

          const { error: varUpdateError } = await supabase
            .from('variations')
            .update({ stock_on_hand: newStock })
            .eq('id', varId);

          if (varUpdateError) {
            console.error(`❌ Failed to deduct stock for variation ${item.selectedVariation.name}:`, varUpdateError);
          } else {
            console.log(`✅ Deducted stock for variation ${item.selectedVariation.name} to ${newStock}`);
          }
        }
      }

      // Build service-specific details for Messenger message
      let serviceDetails = '';
      if (serviceType === 'pickup') {
        const timeInfo = pickupTime === 'custom' ? customTime : `${pickupTime} minutes`;
        serviceDetails = `📍 Service: PICK-UP\n⏰ Pickup Time: ${timeInfo}`;
      } else if (serviceType === 'store-delivery') {
        const subdivisionName = selectedSubdivision?.name || 'N/A';
        const feeText = globalSettings.free_delivery_promo ? 'FREE (Promo)' : `₱${deliveryFee.toFixed(2)}`;
        serviceDetails = `📍 Service: STORE DELIVERY RIDER\n🏘️ Subdivision: ${subdivisionName}\n🛵 Delivery Fee: ${feeText}`;
        serviceDetails += `\n🏠 Phase: ${phase || 'N/A'}, Block: ${block || 'N/A'}, Lot: ${lot || 'N/A'}, Street: ${streetName || 'N/A'}`;
        if (pinAddress) serviceDetails += `\n📌 Pin Address: ${pinAddress}`;
        if (deliveryLandmark) serviceDetails += `\n🗺️ Landmark: ${deliveryLandmark}`;
        if (deliveryInstructions) serviceDetails += `\n📝 Instructions: ${deliveryInstructions}`;
      } else if (serviceType === 'lalamove') {
        serviceDetails = `📍 Service: LALAMOVE\n🏠 Delivery Address: ${lalamoveAddress}`;
        if (lalamoveNote) serviceDetails += `\n📝 Note: ${lalamoveNote}`;
      }

      const orderDetails = `
🛒 For Your Pets Only ORDER
📦 Order #: ${order.order_number}

👤 Customer: ${customerName}
📞 Contact: ${contactNumber}
${serviceDetails}

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
        itemDetails += ` ₱${item.totalPrice.toFixed(2)} x ${item.quantity} = ₱${(item.totalPrice * item.quantity).toFixed(2)}`;
        return itemDetails;
      }).join('\n\n')}

💰 SUBTOTAL: ₱${totalPrice.toFixed(2)}
${qrphFee > 0 ? `💳 QR PH Fee (1%): ₱${qrphFee.toFixed(2)}` : ''}
${deliveryFee > 0 ? `🛵 Delivery Fee: ₱${deliveryFee.toFixed(2)}` : ''}
${globalSettings.free_delivery_promo && serviceType === 'store-delivery' ? '🎉 FREE DELIVERY PROMO APPLIED' : ''}
${appliedVoucher ? `🏷️ Voucher Applied: ${appliedVoucher.code} (-₱${voucherDiscount.toFixed(2)})` : ''}

💰 TOTAL: ₱${finalTotal.toFixed(2)}

💳 Payment: ${paymentMethod === 'cash' ? 'Cash' : (isQRPH ? 'QR Ph (+1% transaction fee)' : (selectedPaymentMethod?.name || paymentMethod))}
${paymentMethod === 'cash'
          ? `💰 Customer to pay with: ₱${cashAmountPaid || '0.00'}\n${cashChange !== '0.00' ? `🔄 Change to be provided: ₱${cashChange}` : ''}${cashChangeNeeded ? `\n📝 Note: ${cashChangeNeeded}` : ''}`
          : `📸 Payment Screenshot: Please attach your payment receipt screenshot${isQRPH ? '\n💡 Note: 1% QR PH convenience fee included' : ''}`}

${notes ? `📝 Notes: ${notes}` : ''}

Please confirm this order to proceed. Thank you for choosing For Your Pets Only!
      `.trim();

      const encodedMessage = encodeURIComponent(orderDetails);
      const messengerUrl = `https://m.me/100310379306836?text=${encodedMessage}`;

      setCreatedOrderNumber(order.order_number);
      setGeneratedMessengerUrl(messengerUrl);
      setCreatedOrderDetails(orderDetails);
      setStep('success');

    } catch (error: any) {
      console.error('❌ Error creating order:', error);
      alert(`Failed to create order: ${error.message}\n\nPlease try again or contact support.`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Validation
  const isDetailsValid = React.useMemo(() => {
    if (!customerName || !contactNumber) return false;
    if (serviceType === 'pickup' && pickupTime === 'custom' && !customTime) return false;
    if (serviceType === 'store-delivery' && (!selectedSubdivisionId || !phase || !block || !lot || !streetName)) return false;
    if (serviceType === 'lalamove' && !lalamoveAddress) return false;
    return true;
  }, [customerName, contactNumber, serviceType, pickupTime, customTime, selectedSubdivisionId, phase, block, lot, streetName, lalamoveAddress]);

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
          <div className="flex items-center space-x-2 ml-8 text-pet-orange-dark">
            <Package className="h-7 w-7" />
            <h1 className="text-3xl font-display font-bold">Order Details</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Order Summary */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-pet-orange">
            <div className="flex items-center space-x-2 text-pet-orange-dark mb-6">
              <ClipboardList className="h-6 w-6" />
              <h2 className="text-2xl font-display font-bold">Order Summary</h2>
            </div>

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

            {/* Voucher Code Input */}
            <div className="border-t-2 border-pet-beige pt-4 mb-6">
              <div className="flex items-center space-x-1.5 text-sm font-semibold text-pet-brown mb-2">
                <Tag className="h-4 w-4" />
                <label>Have a Voucher Code?</label>
              </div>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={voucherCode}
                  onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                  disabled={!!appliedVoucher || isApplyingVoucher}
                  className="flex-1 px-4 py-2 border-2 border-pet-orange rounded-lg focus:ring-2 focus:ring-pet-orange uppercase font-semibold text-sm disabled:bg-gray-100 disabled:text-gray-500 text-gray-900"
                  placeholder="ENTER CODE"
                />
                {appliedVoucher ? (
                  <button
                    type="button"
                    onClick={handleRemoveVoucher}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-semibold"
                  >
                    Remove
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleApplyVoucher}
                    disabled={!voucherCode.trim() || isApplyingVoucher}
                    className="px-4 py-2 bg-pet-orange text-white rounded-lg hover:bg-pet-orange-dark disabled:bg-gray-300 disabled:text-gray-500 transition-colors text-sm font-semibold"
                  >
                    {isApplyingVoucher ? 'Applying...' : 'Apply'}
                  </button>
                )}
              </div>
              {voucherError && (
                <div className="flex items-center space-x-1.5 text-xs text-red-500 mt-1.5 font-semibold">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>{voucherError}</span>
                </div>
              )}
              {appliedVoucher && (
                <p className="text-xs text-green-600 mt-1.5 font-semibold">
                  ✓ Voucher "{appliedVoucher.code}" applied!
                  ({appliedVoucher.type === 'free_delivery' && 'Free Shipping'}
                  {appliedVoucher.type === 'percentage' && `${appliedVoucher.value}% Off`}
                  {appliedVoucher.type === 'fixed' && `₱${appliedVoucher.value} Off`})
                </p>
              )}
            </div>

            <div className="border-t-2 border-pet-orange pt-4 space-y-2">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Subtotal:</span>
                <span>₱{totalPrice.toFixed(2)}</span>
              </div>
              {deliveryFee > 0 && (
                <div className="flex items-center justify-between text-sm text-pet-orange">
                  <span className="flex items-center gap-1">
                    <Truck className="h-4 w-4" />
                    Delivery Fee ({selectedSubdivision?.name}):
                  </span>
                  <span>₱{deliveryFee.toFixed(2)}</span>
                </div>
              )}
              {globalSettings.free_delivery_promo && serviceType === 'store-delivery' && selectedSubdivision && (
                <div className="flex items-center justify-between text-sm text-green-600 font-medium">
                  <span>Free Delivery Promo:</span>
                  <span>-₱{selectedSubdivision.delivery_fee.toFixed(2)}</span>
                </div>
              )}
              {voucherDiscount > 0 && (
                <div className="flex items-center justify-between text-sm text-green-600 font-semibold">
                  <span className="flex items-center gap-1">
                    <Tag className="h-4 w-4" />
                    Voucher Discount ({appliedVoucher?.code}):
                  </span>
                  <span>-₱{voucherDiscount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-2xl font-display font-bold text-pet-brown pt-2 border-t border-pet-beige">
                <span>Total:</span>
                <span className="text-pet-orange-dark">₱{Math.max(0, totalPrice + deliveryFee - voucherDiscount).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Customer Details Form */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-pet-orange">
            <div className="flex items-center space-x-2 text-pet-orange-dark mb-6">
              <User className="h-6 w-6" />
              <h2 className="text-2xl font-display font-bold">Customer Information</h2>
            </div>

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
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'pickup' as ServiceType, label: 'PICK-UP', icon: <MapPin className="h-6 w-6 mx-auto text-current" /> },
                    { value: 'store-delivery' as ServiceType, label: 'STORE DELIVERY RIDER', icon: <Truck className="h-6 w-6 mx-auto text-current" /> },
                    { value: 'lalamove' as ServiceType, label: 'LALAMOVE', icon: <Package className="h-6 w-6 mx-auto text-current" /> }
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setServiceType(option.value)}
                      className={`p-4 rounded-lg border-2 transition-all duration-200 font-semibold text-center flex flex-col items-center justify-center ${serviceType === option.value
                        ? 'border-pet-orange bg-pet-orange text-white shadow-lg'
                        : 'border-pet-orange bg-white text-pet-brown hover:bg-pet-beige'
                        }`}
                    >
                      <div className="mb-1">{option.icon}</div>
                      <div className="text-xs leading-tight">{option.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* ========== PICK-UP FIELDS ========== */}
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
                          className={`p-3 rounded-lg border-2 transition-all duration-200 text-sm ${pickupTime === option.value
                            ? 'border-pet-orange bg-pet-orange text-white'
                            : 'border-pet-orange/30 bg-white text-gray-700 hover:border-pet-orange'
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
                        className="w-full px-4 py-3 border-2 border-pet-orange/30 rounded-lg focus:ring-2 focus:ring-pet-orange focus:border-pet-orange transition-all duration-200"
                        placeholder="e.g., 45 minutes, 1 hour, 2:30 PM"
                        required
                      />
                    )}
                  </div>
                </div>
              )}

              {/* ========== STORE DELIVERY RIDER FIELDS ========== */}
              {serviceType === 'store-delivery' && (
                <div className="space-y-4">
                  {/* Subdivision Dropdown */}
                  <div>
                    <label className="block text-sm font-semibold text-pet-brown mb-2">Choose your Subdivision *</label>
                    <select
                      value={selectedSubdivisionId}
                      onChange={(e) => setSelectedSubdivisionId(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-pet-orange rounded-lg focus:ring-2 focus:ring-pet-orange focus:border-pet-orange-dark transition-all duration-200 bg-white"
                    >
                      <option value="">-- Select Subdivision --</option>
                      {activeSubdivisions.map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          {sub.name} ({globalSettings.free_delivery_promo ? 'FREE' : `₱${sub.delivery_fee.toFixed(2)}`})
                        </option>
                      ))}
                    </select>
                    {selectedSubdivision && (
                      <div className="mt-2 p-2 rounded-lg bg-pet-beige">
                        {globalSettings.free_delivery_promo ? (
                          <p className="text-sm text-green-600 font-medium">🎉 Free Delivery Promo! Delivery fee: <span className="line-through text-gray-400">₱{selectedSubdivision.delivery_fee.toFixed(2)}</span> <strong>FREE</strong></p>
                        ) : (
                          <p className="text-sm text-pet-brown">
                            🛵 Delivery Fee: <strong className="text-pet-orange-dark">₱{selectedSubdivision.delivery_fee.toFixed(2)}</strong>
                            {selectedSubdivision.delivery_fee === 0 && ' (Free)'}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Address Fields */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-pet-brown mb-1">Phase # *</label>
                      <input
                        type="text"
                        value={phase}
                        onChange={(e) => setPhase(e.target.value)}
                        className="w-full px-3 py-2.5 border-2 border-pet-orange/30 rounded-lg focus:ring-2 focus:ring-pet-orange focus:border-pet-orange transition-all duration-200"
                        placeholder="Enter your Phase #"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-pet-brown mb-1">Block # *</label>
                      <input
                        type="text"
                        value={block}
                        onChange={(e) => setBlock(e.target.value)}
                        className="w-full px-3 py-2.5 border-2 border-pet-orange/30 rounded-lg focus:ring-2 focus:ring-pet-orange focus:border-pet-orange transition-all duration-200"
                        placeholder="Enter your Block #"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-pet-brown mb-1">Lot # *</label>
                      <input
                        type="text"
                        value={lot}
                        onChange={(e) => setLot(e.target.value)}
                        className="w-full px-3 py-2.5 border-2 border-pet-orange/30 rounded-lg focus:ring-2 focus:ring-pet-orange focus:border-pet-orange transition-all duration-200"
                        placeholder="Enter your Lot #"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-pet-brown mb-1">Street Name *</label>
                      <input
                        type="text"
                        value={streetName}
                        onChange={(e) => setStreetName(e.target.value)}
                        className="w-full px-3 py-2.5 border-2 border-pet-orange/30 rounded-lg focus:ring-2 focus:ring-pet-orange focus:border-pet-orange transition-all duration-200"
                        placeholder="Enter your Street Name"
                        required
                      />
                    </div>
                  </div>

                  {/* Optional Fields */}
                  <div>
                    <label className="block text-sm font-medium text-pet-brown mb-1">Pin Address (optional)</label>
                    <input
                      type="text"
                      value={pinAddress}
                      onChange={(e) => setPinAddress(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-pet-orange/30 rounded-lg focus:ring-2 focus:ring-pet-orange focus:border-pet-orange transition-all duration-200"
                      placeholder="e.g., Waze pin or Google Maps pin"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-pet-brown mb-1">Landmark (optional)</label>
                    <input
                      type="text"
                      value={deliveryLandmark}
                      onChange={(e) => setDeliveryLandmark(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-pet-orange/30 rounded-lg focus:ring-2 focus:ring-pet-orange focus:border-pet-orange transition-all duration-200"
                      placeholder="e.g., Near sari-sari store, beside basketball court"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-pet-brown mb-1">Special Instructions (optional)</label>
                    <textarea
                      value={deliveryInstructions}
                      onChange={(e) => setDeliveryInstructions(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-pet-orange/30 rounded-lg focus:ring-2 focus:ring-pet-orange focus:border-pet-orange transition-all duration-200"
                      placeholder="Any special delivery instructions..."
                      rows={2}
                    />
                  </div>
                </div>
              )}

              {/* ========== LALAMOVE FIELDS ========== */}
              {serviceType === 'lalamove' && (
                <div className="space-y-4">
                  {/* Lalamove Info Note */}
                  <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4">
                    <p className="text-sm text-amber-800 font-medium mb-2">Note:</p>
                    <ul className="text-sm text-amber-700 space-y-1">
                      <li>• Buyer to arrange booking and pay the delivery fee.</li>
                      <li>• Online payment should be made before booking.</li>
                      <li>• Can be picked up anytime during open hours.</li>
                      <li> <b>Pick-up Address:</b> Natania Homes, Phase 1B Block 18 Lot 66, Pine Street, Pasong Kawayan 2, General Trias, Cavite</li>

                    </ul>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-pet-brown mb-2">Delivery Address *</label>
                    <textarea
                      value={lalamoveAddress}
                      onChange={(e) => setLalamoveAddress(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-pet-orange rounded-lg focus:ring-2 focus:ring-pet-orange focus:border-pet-orange-dark transition-all duration-200"
                      placeholder="Enter your complete delivery address"
                      rows={3}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-pet-brown mb-2">Note (optional)</label>
                    <textarea
                      value={lalamoveNote}
                      onChange={(e) => setLalamoveNote(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-pet-orange/30 rounded-lg focus:ring-2 focus:ring-pet-orange focus:border-pet-orange transition-all duration-200"
                      placeholder="Any additional notes for the order..."
                      rows={2}
                    />
                  </div>
                </div>
              )}

              {/* Special Notes (global, only for pickup) */}
              {serviceType === 'pickup' && (
                <div>
                  <label className="block text-sm font-medium text-black mb-2">Special Instructions</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-pet-orange/30 rounded-lg focus:ring-2 focus:ring-pet-orange focus:border-pet-orange transition-all duration-200"
                    placeholder="Any special requests or notes..."
                    rows={3}
                  />
                </div>
              )}

              <button
                onClick={handleProceedToPayment}
                disabled={!isDetailsValid}
                className={`w-full py-4 rounded-xl font-medium text-lg transition-all duration-200 transform ${isDetailsValid
                  ? 'bg-pet-orange text-white hover:bg-pet-orange-dark hover:scale-[1.02]'
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
  if (step === 'payment') {
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
                disabled={serviceType === 'lalamove'}
                onClick={() => {
                  setPaymentMethod('cash');
                  setCashAmountPaid('');
                  setCashChangeNeeded('');
                }}
                className={`p-4 rounded-lg border-2 transition-all duration-200 flex items-center space-x-3 w-full ${serviceType === 'lalamove'
                  ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                  : paymentMethod === 'cash'
                    ? 'border-pet-orange bg-pet-orange text-white'
                    : 'border-pet-orange/30 bg-white text-gray-700 hover:border-pet-orange'
                  }`}
              >
                <Banknote className="h-6 w-6 text-current" />
                <div className="flex flex-col items-start">
                  <span className="font-medium">Cash</span>
                  {serviceType === 'lalamove' && (
                    <span className="text-xs text-red-500 font-normal">Not available for Lalamove delivery</span>
                  )}
                </div>
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
                  className={`p-4 rounded-lg border-2 transition-all duration-200 flex items-center space-x-3 ${paymentMethod === method.id
                    ? 'border-pet-orange bg-pet-orange text-white'
                    : 'border-pet-orange/30 bg-white text-gray-700 hover:border-pet-orange'
                    }`}
                >
                  <CreditCard className="h-6 w-6 text-current" />
                  <span className="font-medium">{method.name}</span>
                </button>
              ))}
            </div>

            {/* Cash Payment Details */}
            {paymentMethod === 'cash' && (
              <div className="bg-green-50 rounded-lg p-6 mb-6 border-2 border-green-200">
                <div className="flex items-center space-x-2 text-black mb-4 font-semibold">
                  <Banknote className="h-5 w-5 text-green-600" />
                  <h3 className="font-medium">Cash Payment Details</h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-pet-brown mb-2">
                      Cash Payment Option *
                    </label>
                    <select
                      value={cashOption}
                      onChange={(e) => {
                        setCashOption(e.target.value);
                        setCashChangeNeeded('');
                        if (e.target.value !== 'custom') {
                          if (e.target.value === 'exact') {
                            setCashAmountPaid(finalTotal.toFixed(2));
                          } else {
                            setCashAmountPaid(e.target.value);
                          }
                        } else {
                          setCashAmountPaid('');
                        }
                      }}
                      className="w-full px-4 py-3 border-2 border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white font-medium text-black"
                    >
                      <option value="exact">Exact Amount (₱{finalTotal.toFixed(2)})</option>
                      {[100, 200, 500, 1000].map((bill) => {
                        if (bill > finalTotal) {
                          return (
                            <option key={bill} value={bill.toString()}>
                              Change for ₱{bill}
                            </option>
                          );
                        }
                        return null;
                      })}
                      <option value="custom">Custom Amount</option>
                    </select>
                  </div>

                  {cashOption === 'custom' && (
                    <div>
                      <label className="block text-sm font-medium text-black mb-2">
                        Enter Custom Amount *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min={finalTotal}
                        value={cashAmountPaid}
                        onChange={(e) => {
                          setCashAmountPaid(e.target.value);
                          setCashChangeNeeded('');
                        }}
                        className="w-full px-4 py-3 border-2 border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg font-semibold"
                        placeholder={`₱${finalTotal.toFixed(2)}`}
                        required={paymentMethod === 'cash' && cashOption === 'custom'}
                      />
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-gray-600 mt-1">
                      {qrphFee > 0 ? (
                        <>
                          Subtotal: ₱{totalPrice.toFixed(2)}<br />
                          QR PH Fee (1%): ₱{qrphFee.toFixed(2)}<br />
                          {deliveryFee > 0 && (<>Delivery Fee: ₱{deliveryFee.toFixed(2)}<br /></>)}
                          <span className="font-semibold">Total: ₱{finalTotal.toFixed(2)}</span>
                        </>
                      ) : deliveryFee > 0 ? (
                        <>
                          Subtotal: ₱{totalPrice.toFixed(2)}<br />
                          Delivery Fee: ₱{deliveryFee.toFixed(2)}<br />
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
                      {cashChangeNeeded && (
                        <p className="text-xs text-gray-600 mt-2">
                          {cashChangeNeeded}
                        </p>
                      )}
                      {parseFloat(cashChange) > 0 && (
                        <p className="text-xs text-green-700 mt-2">
                          Please prepare change of ₱{cashChange}
                        </p>
                      )}
                    </div>
                  )}

                  {cashAmountPaid && parseFloat(cashAmountPaid) < finalTotal && (
                    <div className="bg-red-50 rounded-lg p-3 border border-red-200 flex items-center space-x-2 text-red-600">
                      <AlertTriangle className="h-4 w-4" />
                      <p className="text-sm">
                        Amount paid (₱{parseFloat(cashAmountPaid).toFixed(2)}) is less than total (₱{finalTotal.toFixed(2)})
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
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Payment Details with QR Code */}
            {selectedPaymentMethod && paymentMethod !== 'cash' && (
              <div className="bg-pet-beige rounded-lg p-6 mb-6">
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
                    {deliveryFee > 0 && (
                      <p className="text-sm text-pet-orange font-semibold">Delivery Fee: ₱{deliveryFee.toFixed(2)}</p>
                    )}
                    <p className="text-xl font-semibold text-black">Amount: ₱{finalTotal.toFixed(2)}</p>
                  </div>
                  <div className="flex-shrink-0">
                    <img
                      src={selectedPaymentMethod.qr_code_url}
                      alt={`${selectedPaymentMethod.name} QR Code`}
                      className="w-32 h-32 rounded-lg border-2 border-pet-orange/30 shadow-sm"
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
                <div className="flex items-center space-x-2 text-black mb-2 font-semibold">
                  <Package className="h-5 w-5 text-yellow-600" />
                  <h4>Payment Proof Required</h4>
                </div>
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
              <div className="bg-pet-beige rounded-lg p-4">
                <h4 className="font-medium text-black mb-2">Customer Details</h4>
                <p className="text-sm text-gray-600">Name: {customerName}</p>
                <p className="text-sm text-gray-600">Contact: {contactNumber}</p>
                <p className="text-sm text-gray-600">
                  Service: {serviceType === 'pickup' ? 'PICK-UP' : serviceType === 'store-delivery' ? 'STORE DELIVERY RIDER' : 'LALAMOVE'}
                </p>
                {serviceType === 'store-delivery' && selectedSubdivision && (
                  <>
                    <p className="text-sm text-gray-600">Subdivision: {selectedSubdivision.name}</p>
                    <p className="text-sm text-gray-600">
                      Address: Phase {phase}, Block {block}, Lot {lot}, {streetName}
                    </p>
                    {pinAddress && <p className="text-sm text-gray-600">Pin: {pinAddress}</p>}
                    {deliveryLandmark && <p className="text-sm text-gray-600">Landmark: {deliveryLandmark}</p>}
                    <p className="text-sm text-pet-orange font-medium">
                      Delivery Fee: {globalSettings.free_delivery_promo ? 'FREE (Promo)' : `₱${deliveryFee.toFixed(2)}`}
                    </p>
                  </>
                )}
                {serviceType === 'lalamove' && (
                  <>
                    <p className="text-sm text-gray-600">Address: {lalamoveAddress}</p>
                    {lalamoveNote && <p className="text-sm text-gray-600">Note: {lalamoveNote}</p>}
                  </>
                )}
                {serviceType === 'pickup' && (
                  <p className="text-sm text-gray-600">
                    Pickup Time: {pickupTime === 'custom' ? customTime : `${pickupTime} minutes`}
                  </p>
                )}
              </div>

              {cartItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-2 border-b border-pet-beige">
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

            <div className="border-t border-pet-orange/20 pt-4 mb-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>Subtotal:</span>
                  <span>₱{totalPrice.toFixed(2)}</span>
                </div>
                {qrphFee > 0 && (
                  <div className="flex items-center justify-between text-sm text-orange-600">
                    <span>QR PH Fee (1%):</span>
                    <span>₱{qrphFee.toFixed(2)}</span>
                  </div>
                )}
                {serviceType === 'store-delivery' && selectedSubdivision && (
                  <div className="flex items-center justify-between text-sm text-pet-orange">
                    <span className="flex items-center gap-1">
                      <Truck className="h-4 w-4" />
                      Delivery Fee ({selectedSubdivision.name}):
                    </span>
                    <span>{globalSettings.free_delivery_promo ? <span className="text-green-600 font-medium">FREE</span> : `₱${deliveryFee.toFixed(2)}`}</span>
                  </div>
                )}
                {voucherDiscount > 0 && (
                  <div className="flex items-center justify-between text-sm text-green-600 font-semibold">
                    <span className="flex items-center gap-1">
                      <Tag className="h-4 w-4" />
                      Voucher Discount ({appliedVoucher?.code}):
                    </span>
                    <span>-₱{voucherDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-2xl font-noto font-semibold text-black pt-2 border-t border-pet-beige">
                  <span>Total:</span>
                  <span className="font-bold text-lg">₱{finalTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <button
              onClick={handlePlaceOrder}
              disabled={
                isProcessing ||
                (paymentMethod === 'cash' && (!cashAmountPaid || parseFloat(cashAmountPaid) < finalTotal))
              }
              className={`w-full py-4 rounded-xl font-medium text-lg transition-all duration-200 transform ${isProcessing ||
                (paymentMethod === 'cash' && (!cashAmountPaid || parseFloat(cashAmountPaid) < finalTotal))
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-pet-orange text-white hover:bg-pet-orange-dark hover:scale-[1.02]'
                }`}
            >
              {isProcessing ? 'Processing Order...' : 'Place Order via Messenger'}
            </button>

            <p className="text-xs text-gray-500 text-center mt-3">
              You'll be redirected to Facebook Messenger to confirm your order. Don't forget to attach your payment screenshot!
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Success Step
  return (
    <div className="max-w-md mx-auto px-4 py-16 text-center">
      <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-pet-orange flex flex-col items-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 className="h-10 w-10 text-green-600" />
        </div>
        <h1 className="text-3xl font-display font-bold text-pet-brown mb-2">Order Created!</h1>
        <p className="text-pet-gray-medium mb-6">
          Order number: <strong className="text-pet-orange-dark text-lg">#{createdOrderNumber}</strong>
        </p>

        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 mb-6 text-left w-full space-y-2">
          <div className="flex items-center space-x-2 text-sm text-green-800 font-bold">
            <ClipboardList className="h-5 w-5" />
            <p>Order Details Copied!</p>
          </div>
          <p className="text-xs text-green-700 leading-relaxed">
            The complete order summary has been automatically copied. Once Messenger opens, simply <strong>Paste (Ctrl+V or Long Press)</strong> in the chat to send your order.
          </p>
        </div>

        <button
          onClick={() => {
            if (navigator.clipboard) {
              navigator.clipboard.writeText(createdOrderDetails);
              setCopied(true);
            }
            window.open(generatedMessengerUrl, '_blank');
          }}
          className="w-full bg-gradient-to-r from-pet-orange to-pet-orange-dark text-white py-4 rounded-xl font-bold text-lg hover:from-pet-orange-dark hover:to-pet-orange hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-lg mb-4 flex items-center justify-center space-x-2"
        >
          <MessageSquare className="h-5 w-5" />
          <span>Open Facebook Messenger</span>
        </button>

        {copied && (
          <p className="text-sm text-green-600 font-semibold mb-4 animate-bounce">
            ✓ Copied to clipboard! Ready to paste.
          </p>
        )}

        <p className="text-xs text-gray-500">
          Didn't open?{" "}
          <a
            href={generatedMessengerUrl}
            onClick={() => {
              if (navigator.clipboard) {
                navigator.clipboard.writeText(createdOrderDetails);
              }
            }}
            target="_blank"
            rel="noopener noreferrer"
            className="text-pet-orange hover:underline font-semibold"
          >
            Click here to retry
          </a>
        </p>
      </div>
    </div>
  );
};

export default Checkout;