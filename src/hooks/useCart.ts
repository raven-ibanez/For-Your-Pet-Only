import { useState, useCallback } from 'react';
import { CartItem, MenuItem, Variation, AddOn } from '../types';

export const useCart = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const calculateItemPrice = (item: MenuItem, variation?: Variation, addOns?: AddOn[]) => {
    let price = item.basePrice;
    if (variation) {
      price += variation.price;
    }
    if (addOns) {
      addOns.forEach(addOn => {
        price += addOn.price;
      });
    }
    return price;
  };

  const addToCart = useCallback((item: MenuItem, quantity: number = 1, variation?: Variation, addOns?: AddOn[]) => {
    // Check stock availability
    if (item.isTracked && item.currentStock !== undefined) {
      if (item.currentStock <= 0) {
        alert(`Sorry, ${item.name} is out of stock.`);
        return;
      }
      
      // Calculate total quantity of this item already in cart (across all variations/add-ons)
      setCartItems(prev => {
        // Filter by base menu item id (all cart items for this product start with the same UUID)
        const totalInCart = prev
          .filter(cartItem => cartItem.id.startsWith(item.id))
          .reduce((sum, cartItem) => sum + cartItem.quantity, 0);
        
        const newTotal = totalInCart + quantity;
        if (newTotal > item.currentStock!) {
          alert(`Sorry, only ${item.currentStock} ${item.currentStock === 1 ? 'piece' : 'pieces'} available for ${item.name}. You already have ${totalInCart} in your cart.`);
          return prev;
        }
        
        // Proceed with adding to cart
        const totalPrice = calculateItemPrice(item, variation, addOns);
        
        // Group add-ons by name and sum their quantities
        const groupedAddOns = addOns?.reduce((groups, addOn) => {
          const existing = groups.find(g => g.id === addOn.id);
          if (existing) {
            existing.quantity = (existing.quantity || 1) + 1;
          } else {
            groups.push({ ...addOn, quantity: 1 });
          }
          return groups;
        }, [] as (AddOn & { quantity: number })[]);
        
        const existingItem = prev.find(cartItem => 
          cartItem.id === item.id && 
          cartItem.selectedVariation?.id === variation?.id &&
          JSON.stringify(cartItem.selectedAddOns?.map(a => `${a.id}-${a.quantity || 1}`).sort()) === JSON.stringify(groupedAddOns?.map(a => `${a.id}-${a.quantity}`).sort())
        );
        
        if (existingItem) {
          return prev.map(cartItem =>
            cartItem === existingItem
              ? { ...cartItem, quantity: cartItem.quantity + quantity }
              : cartItem
          );
        } else {
          const uniqueId = `${item.id}-${variation?.id || 'default'}-${addOns?.map(a => a.id).join(',') || 'none'}`;
          return [...prev, { 
            ...item,
            id: uniqueId,
            quantity,
            selectedVariation: variation,
            selectedAddOns: groupedAddOns || [],
            totalPrice
          }];
        }
      });
    } else {
      // No stock tracking, proceed normally
      const totalPrice = calculateItemPrice(item, variation, addOns);
      
      // Group add-ons by name and sum their quantities
      const groupedAddOns = addOns?.reduce((groups, addOn) => {
        const existing = groups.find(g => g.id === addOn.id);
        if (existing) {
          existing.quantity = (existing.quantity || 1) + 1;
        } else {
          groups.push({ ...addOn, quantity: 1 });
        }
        return groups;
      }, [] as (AddOn & { quantity: number })[]);
      
      setCartItems(prev => {
        const existingItem = prev.find(cartItem => 
          cartItem.id === item.id && 
          cartItem.selectedVariation?.id === variation?.id &&
          JSON.stringify(cartItem.selectedAddOns?.map(a => `${a.id}-${a.quantity || 1}`).sort()) === JSON.stringify(groupedAddOns?.map(a => `${a.id}-${a.quantity}`).sort())
        );
        
        if (existingItem) {
          return prev.map(cartItem =>
            cartItem === existingItem
              ? { ...cartItem, quantity: cartItem.quantity + quantity }
              : cartItem
          );
        } else {
          const uniqueId = `${item.id}-${variation?.id || 'default'}-${addOns?.map(a => a.id).join(',') || 'none'}`;
          return [...prev, { 
            ...item,
            id: uniqueId,
            quantity,
            selectedVariation: variation,
            selectedAddOns: groupedAddOns || [],
            totalPrice
          }];
        }
      });
    }
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }
    
    setCartItems(prev => {
      const cartItem = prev.find(item => item.id === id);
      if (!cartItem) return prev;
      
      // Check stock availability
      if (cartItem.isTracked && cartItem.currentStock !== undefined) {
        if (cartItem.currentStock <= 0) {
          alert(`Sorry, ${cartItem.name} is out of stock.`);
          return prev;
        }
        
        // Extract base menu item id from cart item id (format: baseId-variationId-addOnIds)
        // The base menu item id is the first part before the first '-default-' or before variation/addon info
        // For UUIDs, we need to extract the base id differently
        // Since cart item id format is: `${item.id}-${variation?.id || 'default'}-...`
        // We can find items with the same base menu item by checking if they start with the same UUID
        // Actually, the simplest is to extract the UUID (36 chars) from the start
        const baseMenuItemId = id.substring(0, 36); // UUIDs are 36 characters
        
        // Calculate total quantity of this item already in cart (excluding current item being updated)
        const totalInCart = prev
          .filter(item => item.id.startsWith(baseMenuItemId) && item.id !== id)
          .reduce((sum, item) => sum + item.quantity, 0);
        
        const newTotal = totalInCart + quantity;
        if (newTotal > cartItem.currentStock) {
          alert(`Sorry, only ${cartItem.currentStock} ${cartItem.currentStock === 1 ? 'piece' : 'pieces'} available for ${cartItem.name}.`);
          return prev;
        }
      }
      
      return prev.map(item =>
        item.id === id ? { ...item, quantity } : item
      );
    });
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  const getTotalPrice = useCallback(() => {
    return cartItems.reduce((total, item) => total + (item.totalPrice * item.quantity), 0);
  }, [cartItems]);

  const getTotalItems = useCallback(() => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  }, [cartItems]);

  const openCart = useCallback(() => setIsCartOpen(true), []);
  const closeCart = useCallback(() => setIsCartOpen(false), []);

  return {
    cartItems,
    isCartOpen,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    getTotalPrice,
    getTotalItems,
    openCart,
    closeCart
  };
};