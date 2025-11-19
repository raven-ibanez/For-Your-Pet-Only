import React, { useState } from 'react';
import { Plus, Minus, X, ShoppingCart } from 'lucide-react';
import { MenuItem, Variation, AddOn } from '../types';

interface MenuItemCardProps {
  item: MenuItem;
  onAddToCart: (item: MenuItem, quantity?: number, variation?: Variation, addOns?: AddOn[]) => void;
  quantity: number;
  onUpdateQuantity: (id: string, quantity: number) => void;
}

const MenuItemCard: React.FC<MenuItemCardProps> = ({ 
  item, 
  onAddToCart, 
  quantity, 
  onUpdateQuantity 
}) => {
  const [showCustomization, setShowCustomization] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [selectedVariation, setSelectedVariation] = useState<Variation | undefined>(
    item.variations?.[0]
  );
  const [selectedAddOns, setSelectedAddOns] = useState<(AddOn & { quantity: number })[]>([]);
  const [customizationQuantity, setCustomizationQuantity] = useState(1);

  const calculatePrice = (qty: number = customizationQuantity) => {
    // Use effective price (discounted or regular) as base
    let price = item.effectivePrice || item.basePrice;
    if (selectedVariation) {
      price = (item.effectivePrice || item.basePrice) + selectedVariation.price;
    }
    selectedAddOns.forEach(addOn => {
      price += addOn.price * addOn.quantity;
    });
    return price * qty;
  };

  const handleAddToCart = () => {
    if (item.variations?.length || item.addOns?.length) {
      setShowCustomization(true);
    } else {
      setShowQuantityModal(true);
      setSelectedQuantity(1);
    }
  };

  const handleQuantityAddToCart = () => {
    // Check stock availability
    if (item.isTracked && item.currentStock !== undefined) {
      if (item.currentStock <= 0) {
        alert(`Sorry, ${item.name} is out of stock.`);
        return;
      }
      if (selectedQuantity > item.currentStock) {
        alert(`Sorry, only ${item.currentStock} ${item.currentStock === 1 ? 'piece' : 'pieces'} available for ${item.name}.`);
        return;
      }
    }
    onAddToCart(item, selectedQuantity);
    setShowQuantityModal(false);
    setSelectedQuantity(1);
  };

  const handleCustomizedAddToCart = () => {
    // Check stock availability
    if (item.isTracked && item.currentStock !== undefined) {
      if (item.currentStock <= 0) {
        alert(`Sorry, ${item.name} is out of stock.`);
        return;
      }
      if (customizationQuantity > item.currentStock) {
        alert(`Sorry, only ${item.currentStock} ${item.currentStock === 1 ? 'piece' : 'pieces'} available for ${item.name}.`);
        return;
      }
    }
    // Convert selectedAddOns back to regular AddOn array for cart
    const addOnsForCart: AddOn[] = selectedAddOns.flatMap(addOn => 
      Array(addOn.quantity).fill({ ...addOn, quantity: undefined })
    );
    // Add multiple items based on customizationQuantity
    for (let i = 0; i < customizationQuantity; i++) {
      onAddToCart(item, 1, selectedVariation, addOnsForCart);
    }
    setShowCustomization(false);
    setSelectedAddOns([]);
    setCustomizationQuantity(1);
  };

  const handleIncrement = () => {
    // Check stock availability before incrementing
    if (item.isTracked && item.currentStock !== undefined) {
      const newQuantity = quantity + 1;
      if (item.currentStock <= 0) {
        alert(`Sorry, ${item.name} is out of stock.`);
        return;
      }
      if (newQuantity > item.currentStock) {
        alert(`Sorry, only ${item.currentStock} ${item.currentStock === 1 ? 'piece' : 'pieces'} available for ${item.name}.`);
        return;
      }
    }
    onUpdateQuantity(item.id, quantity + 1);
  };

  const handleDecrement = () => {
    if (quantity > 0) {
      onUpdateQuantity(item.id, quantity - 1);
    }
  };

  const updateAddOnQuantity = (addOn: AddOn, quantity: number) => {
    setSelectedAddOns(prev => {
      const existingIndex = prev.findIndex(a => a.id === addOn.id);
      
      if (quantity === 0) {
        // Remove add-on if quantity is 0
        return prev.filter(a => a.id !== addOn.id);
      }
      
      if (existingIndex >= 0) {
        // Update existing add-on quantity
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], quantity };
        return updated;
      } else {
        // Add new add-on with quantity
        return [...prev, { ...addOn, quantity }];
      }
    });
  };

  const groupedAddOns = item.addOns?.reduce((groups, addOn) => {
    const category = addOn.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(addOn);
    return groups;
  }, {} as Record<string, AddOn[]>);

  return (
    <>
      <div className={`bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden group animate-scale-in border border-gray-100 ${!item.available ? 'opacity-60' : ''}`}>
        {/* Image Container with Badges */}
        <div className="relative h-48 bg-gradient-to-br from-gray-50 to-gray-100">
          {item.image ? (
            <img
              src={item.image}
              alt={item.name}
              className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105 cursor-pointer"
              loading="lazy"
              decoding="async"
              onClick={() => setShowImageModal(true)}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : null}
          <div className={`absolute inset-0 flex items-center justify-center ${item.image ? 'hidden' : ''}`}>
            <div className="text-6xl opacity-20 text-pet-orange">🐾</div>
          </div>
          
          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-2">
            {item.isOnDiscount && item.discountPrice && (
              <div className="bg-gradient-to-r from-pet-orange to-pet-orange-dark text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg animate-pulse">
                🏷️ SALE
              </div>
            )}
            {item.popular && (
              <div className="bg-gradient-to-r from-yellow-500 to-pet-orange text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                ⭐ BESTSELLER
              </div>
            )}
          </div>
          
          {!item.available && (
            <div className="absolute top-3 right-3 bg-pet-gray-dark text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
              OUT OF STOCK
            </div>
          )}
          {item.available && item.isTracked && item.currentStock !== undefined && item.currentStock > 0 && item.currentStock <= 1 && (
            <div className="absolute top-3 right-3 bg-yellow-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
              ONLY {item.currentStock} LEFT
            </div>
          )}
          
          {/* Discount Percentage Badge */}
          {item.isOnDiscount && item.discountPrice && (
            <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm text-pet-orange-dark text-xs font-bold px-2 py-1 rounded-full shadow-lg">
              {Math.round(((item.basePrice - item.discountPrice) / item.basePrice) * 100)}% OFF
            </div>
          )}
        </div>
        
        {/* Content */}
        <div className="p-5">
          <div className="flex items-start justify-between mb-3">
            <h4 className="text-lg font-semibold text-gray-900 leading-tight flex-1 pr-2">{item.name}</h4>
            {item.variations && item.variations.length > 0 && (
              <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full whitespace-nowrap">
                {item.variations.length} sizes
              </div>
            )}
          </div>
          
          <p className={`text-sm mb-4 leading-relaxed ${!item.available ? 'text-gray-400' : 'text-gray-600'}`}>
            {!item.available ? 'Currently Unavailable' : item.description}
          </p>
          
          {/* Pricing Section */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1">
              {item.isOnDiscount && item.discountPrice ? (
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl font-bold text-pet-orange-dark">
                      ₱{item.discountPrice.toFixed(2)}
                    </span>
                    <span className="text-sm text-gray-500 line-through">
                      ₱{item.basePrice.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-xs text-pet-orange">
                    Save ₱{(item.basePrice - item.discountPrice).toFixed(2)}
                  </div>
                </div>
              ) : (
                <div className="text-2xl font-bold text-pet-brown">
                  ₱{item.basePrice.toFixed(2)}
                </div>
              )}
              
              {item.variations && item.variations.length > 0 && (
                <div className="text-xs text-gray-500 mt-1">
                  Starting price
                </div>
              )}
            </div>
            
            {/* Action Buttons */}
            <div className="flex-shrink-0">
              {!item.available ? (
                <button
                  disabled
                  className="bg-gray-200 text-gray-500 px-4 py-2.5 rounded-xl cursor-not-allowed font-medium text-sm"
                >
                  Unavailable
                </button>
              ) : quantity === 0 ? (
                <button
                  onClick={handleAddToCart}
                  className="bg-gradient-to-r from-pet-orange to-pet-orange-dark text-white px-6 py-2.5 rounded-xl hover:from-pet-orange-dark hover:to-pet-orange transition-all duration-200 transform hover:scale-105 font-medium text-sm shadow-lg hover:shadow-xl"
                >
                  {item.variations?.length || item.addOns?.length ? '⚙️ Customize' : '🛒 Add to Cart'}
                </button>
              ) : (
                <div className="flex items-center space-x-2 bg-gradient-to-r from-pet-beige to-pet-cream rounded-xl p-1 border-2 border-pet-orange">
                  <button
                    onClick={handleDecrement}
                    className="p-2 hover:bg-pet-orange hover:text-white rounded-lg transition-colors duration-200 hover:scale-110"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="font-bold text-pet-brown min-w-[28px] text-center text-sm">{quantity}</span>
                  <button
                    onClick={handleIncrement}
                    className="p-2 hover:bg-pet-orange hover:text-white rounded-lg transition-colors duration-200 hover:scale-110"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Add-ons indicator */}
          {item.addOns && item.addOns.length > 0 && (
            <div className="flex items-center space-x-1 text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-lg">
              <span>+</span>
              <span>{item.addOns.length} add-on{item.addOns.length > 1 ? 's' : ''} available</span>
            </div>
          )}
        </div>
      </div>

      {/* Customization Modal */}
      {showCustomization && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between rounded-t-2xl">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Customize {item.name}</h3>
                <p className="text-sm text-gray-500 mt-1">Choose your preferences</p>
              </div>
              <button
                onClick={() => setShowCustomization(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6">
              {/* Size Variations */}
              {item.variations && item.variations.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-4">Choose Size</h4>
                  <div className="space-y-3">
                    {item.variations.map((variation) => (
                      <label
                        key={variation.id}
                        className={`flex items-center justify-between p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                          selectedVariation?.id === variation.id
                            ? 'border-pet-orange bg-pet-beige'
                            : 'border-gray-200 hover:border-pet-orange hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <input
                            type="radio"
                            name="variation"
                            checked={selectedVariation?.id === variation.id}
                            onChange={() => setSelectedVariation(variation)}
                            className="text-pet-orange focus:ring-pet-orange"
                          />
                          <span className="font-medium text-gray-900">{variation.name}</span>
                        </div>
                        <span className="text-pet-brown font-semibold">
                          ₱{((item.effectivePrice || item.basePrice) + variation.price).toFixed(2)}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Add-ons */}
              {groupedAddOns && Object.keys(groupedAddOns).length > 0 && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-4">Add-ons</h4>
                  {Object.entries(groupedAddOns).map(([category, addOns]) => (
                    <div key={category} className="mb-4">
                      <h5 className="text-sm font-medium text-gray-700 mb-3 capitalize">
                        {category.replace('-', ' ')}
                      </h5>
                      <div className="space-y-3">
                        {addOns.map((addOn) => (
                          <div
                            key={addOn.id}
                            className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all duration-200"
                          >
                            <div className="flex-1">
                              <span className="font-medium text-gray-900">{addOn.name}</span>
                              <div className="text-sm text-gray-600">
                                {addOn.price > 0 ? `₱${addOn.price.toFixed(2)} each` : 'Free'}
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              {selectedAddOns.find(a => a.id === addOn.id) ? (
                                <div className="flex items-center space-x-2 bg-pet-beige rounded-xl p-1 border-2 border-pet-orange">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const current = selectedAddOns.find(a => a.id === addOn.id);
                                      updateAddOnQuantity(addOn, (current?.quantity || 1) - 1);
                                    }}
                                    className="p-1.5 hover:bg-pet-orange hover:text-white rounded-lg transition-colors duration-200"
                                  >
                                    <Minus className="h-3 w-3 text-pet-orange-dark" />
                                  </button>
                                  <span className="font-semibold text-pet-brown min-w-[24px] text-center text-sm">
                                    {selectedAddOns.find(a => a.id === addOn.id)?.quantity || 0}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const current = selectedAddOns.find(a => a.id === addOn.id);
                                      updateAddOnQuantity(addOn, (current?.quantity || 0) + 1);
                                    }}
                                    className="p-1.5 hover:bg-pet-orange hover:text-white rounded-lg transition-colors duration-200"
                                  >
                                    <Plus className="h-3 w-3 text-pet-orange-dark" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => updateAddOnQuantity(addOn, 1)}
                                  className="flex items-center space-x-1 px-4 py-2 bg-gradient-to-r from-pet-orange to-pet-orange-dark text-white rounded-xl hover:from-pet-orange-dark hover:to-pet-orange transition-all duration-200 text-sm font-medium shadow-lg"
                                >
                                  <Plus className="h-3 w-3" />
                                  <span>Add</span>
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Quantity Selection */}
              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-4">Quantity</h4>
                <div className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-xl bg-gray-50">
                  <span className="font-medium text-gray-900">Quantity:</span>
                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={() => setCustomizationQuantity(Math.max(1, customizationQuantity - 1))}
                      className="p-2 hover:bg-pet-orange hover:text-white rounded-lg transition-colors duration-200 border-2 border-pet-orange"
                    >
                      <Minus className="h-4 w-4 text-pet-orange-dark" />
                    </button>
                    <span className="font-bold text-pet-brown min-w-[40px] text-center text-lg">
                      {customizationQuantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (item.isTracked && item.currentStock !== undefined) {
                          if (item.currentStock <= 0) {
                            alert(`Sorry, ${item.name} is out of stock.`);
                            return;
                          }
                          if (customizationQuantity + 1 > item.currentStock) {
                            alert(`Sorry, only ${item.currentStock} ${item.currentStock === 1 ? 'piece' : 'pieces'} available.`);
                            return;
                          }
                        }
                        setCustomizationQuantity(customizationQuantity + 1);
                      }}
                      className="p-2 hover:bg-pet-orange hover:text-white rounded-lg transition-colors duration-200 border-2 border-pet-orange"
                    >
                      <Plus className="h-4 w-4 text-pet-orange-dark" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Price Summary */}
              <div className="border-t-2 border-pet-orange pt-4 mb-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-lg text-gray-600">
                    <span>Price per item:</span>
                    <span>₱{calculatePrice(1).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-2xl font-bold text-gray-900">
                    <span>Total:</span>
                    <span className="text-pet-orange-dark">₱{calculatePrice().toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleCustomizedAddToCart}
                className="w-full bg-gradient-to-r from-pet-orange to-pet-orange-dark text-white py-4 rounded-xl hover:from-pet-orange-dark hover:to-pet-orange transition-all duration-200 font-semibold flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <ShoppingCart className="h-5 w-5" />
                <span>Add {customizationQuantity} to Cart - ₱{calculatePrice().toFixed(2)}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quantity Selection Modal */}
      {showQuantityModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
            <div className="border-b border-gray-200 p-6 flex items-center justify-between rounded-t-2xl">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Select Quantity</h3>
                <p className="text-sm text-gray-500 mt-1">{item.name}</p>
              </div>
              <button
                onClick={() => {
                  setShowQuantityModal(false);
                  setSelectedQuantity(1);
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6">
              {/* Quantity Selector */}
              <div className="mb-6">
                <div className="flex items-center justify-between p-6 border-2 border-pet-orange rounded-xl bg-pet-beige">
                  <span className="font-semibold text-gray-900 text-lg">Quantity:</span>
                  <div className="flex items-center space-x-4">
                    <button
                      type="button"
                      onClick={() => setSelectedQuantity(Math.max(1, selectedQuantity - 1))}
                      className="p-3 hover:bg-pet-orange hover:text-white rounded-lg transition-colors duration-200 border-2 border-pet-orange bg-white"
                    >
                      <Minus className="h-5 w-5 text-pet-orange-dark" />
                    </button>
                    <span className="font-bold text-pet-brown min-w-[50px] text-center text-2xl">
                      {selectedQuantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (item.isTracked && item.currentStock !== undefined) {
                          if (item.currentStock <= 0) {
                            alert(`Sorry, ${item.name} is out of stock.`);
                            return;
                          }
                          if (selectedQuantity + 1 > item.currentStock) {
                            alert(`Sorry, only ${item.currentStock} ${item.currentStock === 1 ? 'piece' : 'pieces'} available.`);
                            return;
                          }
                        }
                        setSelectedQuantity(selectedQuantity + 1);
                      }}
                      className="p-3 hover:bg-pet-orange hover:text-white rounded-lg transition-colors duration-200 border-2 border-pet-orange bg-white"
                    >
                      <Plus className="h-5 w-5 text-pet-orange-dark" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Price Summary */}
              <div className="border-t-2 border-pet-orange pt-4 mb-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-lg text-gray-600">
                    <span>Price per item:</span>
                    <span>₱{(item.effectivePrice || item.basePrice).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-2xl font-bold text-gray-900">
                    <span>Total:</span>
                    <span className="text-pet-orange-dark">
                      ₱{((item.effectivePrice || item.basePrice) * selectedQuantity).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleQuantityAddToCart}
                className="w-full bg-gradient-to-r from-pet-orange to-pet-orange-dark text-white py-4 rounded-xl hover:from-pet-orange-dark hover:to-pet-orange transition-all duration-200 font-semibold flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <ShoppingCart className="h-5 w-5" />
                <span>Add {selectedQuantity} to Cart - ₱{((item.effectivePrice || item.basePrice) * selectedQuantity).toFixed(2)}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Modal */}
      {showImageModal && item.image && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowImageModal(false)}
        >
          <div className="relative max-w-4xl w-full max-h-[90vh] flex items-center justify-center">
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-4 right-4 bg-white/90 hover:bg-white text-gray-800 p-2 rounded-full shadow-lg transition-colors duration-200 z-10"
              aria-label="Close image"
            >
              <X className="h-6 w-6" />
            </button>
            <img
              src={item.image}
              alt={item.name}
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default MenuItemCard;