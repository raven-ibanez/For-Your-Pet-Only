import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Announcement } from '../types';

export const useAnnouncements = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      
      const { data, error: fetchError } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setAnnouncements(data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching announcements:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch announcements');
    } finally {
      setLoading(false);
    }
  };

  const getActiveAnnouncements = (): Announcement[] => {
    const now = new Date();
    return announcements.filter(announcement => {
      if (!announcement.active) return false;
      
      const startDate = announcement.start_date ? new Date(announcement.start_date) : null;
      const endDate = announcement.end_date ? new Date(announcement.end_date) : null;
      
      if (startDate && now < startDate) return false;
      if (endDate && now > endDate) return false;
      
      return true;
    });
  };

  const addAnnouncement = async (announcement: Omit<Announcement, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error: insertError } = await supabase
        .from('announcements')
        .insert({
          title: announcement.title,
          message: announcement.message,
          type: announcement.type,
          active: announcement.active,
          start_date: announcement.start_date || null,
          end_date: announcement.end_date || null
        })
        .select()
        .single();

      if (insertError) throw insertError;

      await fetchAnnouncements();
      return data;
    } catch (err) {
      console.error('Error adding announcement:', err);
      throw err;
    }
  };

  const updateAnnouncement = async (id: string, updates: Partial<Announcement>) => {
    try {
      const { error: updateError } = await supabase
        .from('announcements')
        .update({
          title: updates.title,
          message: updates.message,
          type: updates.type,
          active: updates.active,
          start_date: updates.start_date || null,
          end_date: updates.end_date || null
        })
        .eq('id', id);

      if (updateError) throw updateError;

      await fetchAnnouncements();
    } catch (err) {
      console.error('Error updating announcement:', err);
      throw err;
    }
  };

  const deleteAnnouncement = async (id: string) => {
    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchAnnouncements();
    } catch (err) {
      console.error('Error deleting announcement:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  return {
    announcements,
    activeAnnouncements: getActiveAnnouncements(),
    loading,
    error,
    addAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    refetch: fetchAnnouncements
  };
};

