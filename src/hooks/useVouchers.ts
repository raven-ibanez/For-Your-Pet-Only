import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface Voucher {
  id: string;
  code: string;
  type: 'free_delivery' | 'percentage' | 'fixed';
  value: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export const useVouchers = () => {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchVouchers = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('vouchers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVouchers((data as Voucher[]) || []);
    } catch (err) {
      console.error('Error fetching vouchers:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const addVoucher = async (code: string, type: 'free_delivery' | 'percentage' | 'fixed', value: number) => {
    try {
      const { data, error } = await supabase
        .from('vouchers')
        .insert({
          code: code.trim().toUpperCase(),
          type,
          value: type === 'free_delivery' ? 0 : value,
          active: true
        })
        .select()
        .single();

      if (error) throw error;
      setVouchers(prev => [data as Voucher, ...prev]);
      return data as Voucher;
    } catch (err) {
      console.error('Error adding voucher:', err);
      throw err;
    }
  };

  const updateVoucher = async (id: string, updates: Partial<Omit<Voucher, 'id' | 'created_at' | 'updated_at'>>) => {
    try {
      const { error } = await supabase
        .from('vouchers')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      setVouchers(prev => prev.map(v => v.id === id ? { ...v, ...updates } : v));
    } catch (err) {
      console.error('Error updating voucher:', err);
      throw err;
    }
  };

  const deleteVoucher = async (id: string) => {
    try {
      const { error } = await supabase
        .from('vouchers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setVouchers(prev => prev.filter(v => v.id !== id));
    } catch (err) {
      console.error('Error deleting voucher:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchVouchers();
  }, [fetchVouchers]);

  return {
    vouchers,
    loading,
    addVoucher,
    updateVoucher,
    deleteVoucher,
    refetchVouchers: fetchVouchers
  };
};
