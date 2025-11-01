import React from 'react';
import { Trash2, Plus, Minus, ArrowLeft } from 'lucide-react';
import { CartItem } from '../types';

interface CartProps {
  cartItems: CartItem[];
  updateQuantity: (id: string, quantity: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  getTotalPrice: () => number;
  onContinueShopping: () => void;
  onCheckout: () => void;
}

const Cart: React.FC<CartProps> = ({
  cartItems,
  updateQuantity,
  removeFromCart,
  clearCart,
  getTotalPrice,
  onContinueShopping,
  onCheckout
}) => {
  if (cartItems.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center py-16">
          <div className="text-7xl mb-4">🛒</div>
          <h2 className="text-3xl font-display font-bold text-pet-orange-dark mb-2">Your cart is empty</h2>
          <p className="text-pet-gray-dark text-lg mb-6">Add some amazing pet products to get started! 🐾</p>
          <button
            onClick={onContinueShopping}
            className="bg-gradient-to-r from-pet-orange to-pet-orange-dark text-white px-8 py-4 rounded-full hover:from-pet-orange-dark hover:to-pet-orange transition-all duration-200 font-semibold shadow-lg"
          >
            Browse Products
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={onContinueShopping}
          className="flex items-center space-x-2 text-pet-orange hover:text-pet-orange-dark transition-colors duration-200 font-semibold"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Continue Shopping</span>
        </button>
        <h1 className="text-3xl font-display font-bold text-pet-orange-dark">🛒 Your Cart</h1>
        <button
          onClick={clearCart}
          className="text-pet-orange hover:text-pet-orange-dark transition-colors duration-200 font-semibold"
        >
          Clear All
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-8 border-2 border-pet-orange">
        {cartItems.map((item, index) => (
          <div key={item.id} className={`p-6 ${index !== cartItems.length - 1 ? 'border-b-2 border-pet-beige' : ''}`}>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-display font-semibold text-pet-brown mb-1">{item.name}</h3>
                {item.selectedVariation && (
                  <p className="text-sm text-gray-600 mb-1">Size: {item.selectedVariation.name}</p>
                )}
                {item.selectedAddOns && item.selectedAddOns.length > 0 && (
                  <p className="text-sm text-gray-600 mb-1">
                    Add-ons: {item.selectedAddOns.map(addOn => 
                      addOn.quantity && addOn.quantity > 1 
                        ? `${addOn.name} x${addOn.quantity}`
                        : addOn.name
                    ).join(', ')}
                  </p>
                )}
                <p className="text-lg font-bold text-pet-orange-dark">₱{item.totalPrice} each</p>
              </div>
              
              <div className="flex items-center space-x-4 ml-4">
                <div className="flex items-center space-x-3 bg-pet-beige rounded-full p-1 border-2 border-pet-orange">
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="p-2 hover:bg-pet-orange hover:text-white rounded-full transition-colors duration-200"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="font-bold text-pet-brown min-w-[32px] text-center">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="p-2 hover:bg-pet-orange hover:text-white rounded-full transition-colors duration-200"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                
                <div className="text-right">
                  <p className="text-lg font-bold text-pet-orange-dark">₱{item.totalPrice * item.quantity}</p>
                </div>
                
                <button
                  onClick={() => removeFromCart(item.id)}
                  className="p-2 text-pet-orange hover:text-pet-orange-dark hover:bg-pet-beige rounded-full transition-all duration-200"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-pet-orange">
        <div className="flex items-center justify-between text-3xl font-display font-bold text-pet-brown mb-6">
          <span>Total:</span>
          <span className="text-pet-orange-dark">₱{parseFloat(getTotalPrice() || 0).toFixed(2)}</span>
        </div>
        
        <button
          onClick={onCheckout}
          className="w-full bg-gradient-to-r from-pet-orange to-pet-orange-dark text-white py-4 rounded-xl hover:from-pet-orange-dark hover:to-pet-orange transition-all duration-200 transform hover:scale-[1.02] font-semibold text-lg shadow-lg"
        >
          🎉 Proceed to Checkout
        </button>
      </div>
    </div>
  );
};

export default Cart;