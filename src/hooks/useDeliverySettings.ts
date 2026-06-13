import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { DeliverySubdivision, DeliveryGlobalSettings } from '../types';

export function useDeliverySettings() {
  const [subdivisions, setSubdivisions] = useState<DeliverySubdivision[]>([]);
  const [globalSettings, setGlobalSettings] = useState<DeliveryGlobalSettings>({
    id: 'global',
    free_delivery_promo: false,
    updated_at: new Date().toISOString()
  });
  const [loading, setLoading] = useState(true);

  const fetchSubdivisions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('delivery_subdivisions')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      setSubdivisions(data || []);
    } catch (err) {
      console.error('Error fetching subdivisions:', err);
    }
  }, []);

  const fetchGlobalSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('delivery_settings')
        .select('*')
        .eq('id', 'global')
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        setGlobalSettings(data);
      }
    } catch (err) {
      console.error('Error fetching delivery settings:', err);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchSubdivisions(), fetchGlobalSettings()]);
      setLoading(false);
    };
    load();

    const deliveryChannel = supabase
      .channel('delivery_settings_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'delivery_subdivisions' },
        () => {
          console.log('🔄 Real-time update: delivery_subdivisions changed');
          fetchSubdivisions();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'delivery_settings' },
        () => {
          console.log('🔄 Real-time update: delivery_settings changed');
          fetchGlobalSettings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(deliveryChannel);
    };
  }, [fetchSubdivisions, fetchGlobalSettings]);

  const addSubdivision = async (name: string, deliveryFee: number) => {
    try {
      const maxOrder = subdivisions.length > 0
        ? Math.max(...subdivisions.map(s => s.sort_order))
        : 0;
      const { data, error } = await supabase
        .from('delivery_subdivisions')
        .insert({ name, delivery_fee: deliveryFee, sort_order: maxOrder + 1 })
        .select()
        .single();
      if (error) throw error;
      setSubdivisions(prev => [...prev, data]);
      return data;
    } catch (err) {
      console.error('Error adding subdivision:', err);
      throw err;
    }
  };

  const updateSubdivision = async (id: string, updates: Partial<Pick<DeliverySubdivision, 'name' | 'delivery_fee' | 'active' | 'sort_order'>>) => {
    try {
      const { error } = await supabase
        .from('delivery_subdivisions')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      setSubdivisions(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    } catch (err) {
      console.error('Error updating subdivision:', err);
      throw err;
    }
  };

  const deleteSubdivision = async (id: string) => {
    try {
      const { error } = await supabase
        .from('delivery_subdivisions')
        .delete()
        .eq('id', id);
      if (error) throw error;
      setSubdivisions(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error('Error deleting subdivision:', err);
      throw err;
    }
  };

  const toggleFreeDeliveryPromo = async (enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('delivery_settings')
        .upsert({ id: 'global', free_delivery_promo: enabled, updated_at: new Date().toISOString() });
      if (error) throw error;
      setGlobalSettings(prev => ({ ...prev, free_delivery_promo: enabled }));
    } catch (err) {
      console.error('Error toggling free delivery promo:', err);
      throw err;
    }
  };

  return {
    subdivisions,
    globalSettings,
    loading,
    addSubdivision,
    updateSubdivision,
    deleteSubdivision,
    toggleFreeDeliveryPromo,
    refetch: async () => {
      await Promise.all([fetchSubdivisions(), fetchGlobalSettings()]);
    }
  };
}
