import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { MenuItem } from '../types';

export const useMenu = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMenuItems = async () => {
    try {
      setLoading(true);

      // Fetch menu items with their variations, add-ons, and inventory
      const { data: items, error: itemsError } = await supabase
        .from('menu_items')
        .select(`
          *,
          variations (*),
          add_ons (*),
          inventory (
            current_stock,
            is_tracked,
            is_out_of_stock,
            sku
          )
        `)
        .order('created_at', { ascending: true });

      if (itemsError) throw itemsError;

      const formattedItems: MenuItem[] = items?.map(item => {
        // Calculate if discount is currently active
        const now = new Date();
        const discountStart = item.discount_start_date ? new Date(item.discount_start_date) : null;
        const discountEnd = item.discount_end_date ? new Date(item.discount_end_date) : null;

        const isDiscountActive = item.discount_active &&
          (!discountStart || now >= discountStart) &&
          (!discountEnd || now <= discountEnd);

        // Calculate effective price
        const effectivePrice = isDiscountActive && item.discount_price ? item.discount_price : item.base_price;

        // Get inventory data (can be array or single object)
        const inventory = Array.isArray(item.inventory)
          ? item.inventory[0]
          : item.inventory;

        // Determine availability: if tracked and out of stock, mark as unavailable
        const isOutOfStock = inventory?.is_tracked && (inventory?.is_out_of_stock || (inventory?.current_stock ?? 0) <= 0);
        const available = item.available ?? true;
        const finalAvailable = isOutOfStock ? false : available;

        return {
          id: item.id,
          name: item.name,
          description: item.description,
          basePrice: item.base_price,
          category: item.category,
          sku: inventory?.sku || undefined,
          popular: item.popular,
          available: finalAvailable,
          image: item.image_url || undefined,
          discountPrice: item.discount_price || undefined,
          discountStartDate: item.discount_start_date || undefined,
          discountEndDate: item.discount_end_date || undefined,
          discountActive: item.discount_active || false,
          effectivePrice,
          isOnDiscount: isDiscountActive,
          variations: item.variations?.map(v => ({
            id: v.id,
            name: v.name,
            price: v.price
          })) || [],
          addOns: item.add_ons?.map(a => ({
            id: a.id,
            name: a.name,
            price: a.price,
            category: a.category
          })) || [],
          // Stock information
          currentStock: inventory?.current_stock ?? undefined,
          isTracked: inventory?.is_tracked ?? false,
          isOutOfStock: inventory?.is_out_of_stock ?? false
        };
      }) || [];

      setMenuItems(formattedItems);
      setError(null);
    } catch (err) {
      console.error('Error fetching menu items:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch menu items');
    } finally {
      setLoading(false);
    }
  };

  const addMenuItem = async (item: Omit<MenuItem, 'id'>) => {
    try {
      // Insert menu item
      const { data: menuItem, error: itemError } = await supabase
        .from('menu_items')
        .insert({
          name: item.name,
          description: item.description,
          base_price: item.basePrice,
          category: item.category,
          popular: item.popular || false,
          available: item.available ?? true,
          image_url: item.image || null,
          discount_price: item.discountPrice || null,
          discount_start_date: item.discountStartDate || null,
          discount_end_date: item.discountEndDate || null,
          discount_active: item.discountActive || false
        })
        .select()
        .single();

      if (itemError) throw itemError;

      // Insert variations if any
      if (item.variations && item.variations.length > 0) {
        const { error: variationsError } = await supabase
          .from('variations')
          .insert(
            item.variations.map(v => ({
              menu_item_id: menuItem.id,
              name: v.name,
              price: v.price
            }))
          );

        if (variationsError) throw variationsError;
      }

      // Insert add-ons if any
      if (item.addOns && item.addOns.length > 0) {
        const { error: addOnsError } = await supabase
          .from('add_ons')
          .insert(
            item.addOns.map(a => ({
              menu_item_id: menuItem.id,
              name: a.name,
              price: a.price,
              category: a.category
            }))
          );

        if (addOnsError) throw addOnsError;
      }

      // Create inventory record with SKU
      // Note: We explicitly create this since there might not be a trigger
      const { error: inventoryError } = await supabase
        .from('inventory')
        .insert({
          menu_item_id: menuItem.id,
          current_stock: 0,
          minimum_stock: 10,
          is_tracked: true,
          is_out_of_stock: true,
          sku: item.sku || null
        });

      if (inventoryError) {
        console.error('Failed to create inventory record:', inventoryError);
        // We don't throw here to avoid rolling back the menu item creation, 
        // but arguably we should. For now, just log. 
        // If we threw, we'd need to delete the menu item to be atomic-ish.
      }

      await fetchMenuItems();
      return menuItem;
    } catch (err) {
      console.error('Error adding menu item:', err);
      throw err;
    }
  };

  const updateMenuItem = async (id: string, updates: Partial<MenuItem>) => {
    try {
      // Update menu item
      const { error: itemError } = await supabase
        .from('menu_items')
        .update({
          name: updates.name,
          description: updates.description,
          base_price: updates.basePrice,
          category: updates.category,
          popular: updates.popular,
          available: updates.available,
          image_url: updates.image || null,
          discount_price: updates.discountPrice || null,
          discount_start_date: updates.discountStartDate || null,
          discount_end_date: updates.discountEndDate || null,
          discount_active: updates.discountActive
        })
        .eq('id', id);

      if (itemError) throw itemError;

      // Delete existing variations and add-ons
      await supabase.from('variations').delete().eq('menu_item_id', id);
      await supabase.from('add_ons').delete().eq('menu_item_id', id);

      // Insert new variations
      if (updates.variations && updates.variations.length > 0) {
        const { error: variationsError } = await supabase
          .from('variations')
          .insert(
            updates.variations.map(v => ({
              menu_item_id: id,
              name: v.name,
              price: v.price
            }))
          );

        if (variationsError) throw variationsError;
      }

      // Insert new add-ons
      if (updates.addOns && updates.addOns.length > 0) {
        const { error: addOnsError } = await supabase
          .from('add_ons')
          .insert(
            updates.addOns.map(a => ({
              menu_item_id: id,
              name: a.name,
              price: a.price,
              category: a.category
            }))
          );

        if (addOnsError) throw addOnsError;
      }

      // Update inventory SKU if provided
      if (updates.sku !== undefined) {
        const { error: inventoryError } = await supabase
          .from('inventory')
          .update({ sku: updates.sku || null })
          .eq('menu_item_id', id);

        if (inventoryError) console.error('Error updating SKU:', inventoryError);
      }

      await fetchMenuItems();
    } catch (err) {
      console.error('Error updating menu item:', err);
      throw err;
    }
  };

  const deleteMenuItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchMenuItems();
    } catch (err) {
      console.error('Error deleting menu item:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchMenuItems();
  }, []);

  return {
    menuItems,
    loading,
    error,
    addMenuItem,
    updateMenuItem,
    deleteMenuItem,
    refetch: fetchMenuItems
  };
};