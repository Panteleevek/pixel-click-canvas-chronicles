
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface GameProgress {
  id: string;
  total_clicks: number;
  completed_images: number;
  current_image_url: string | null;
  current_pixels: number[];
}

export const useGameProgress = () => {
  const [progress, setProgress] = useState<GameProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadProgress();
    }
  }, [user]);

  const loadProgress = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('game_progress')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading progress:', error);
        return;
      }

      if (data) {
        setProgress({
          ...data,
          current_pixels: Array.isArray(data.current_pixels) ? data.current_pixels : []
        });
      }
    } catch (error) {
      console.error('Error loading progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateProgress = async (updates: Partial<GameProgress>) => {
    if (!user || !progress) return;

    try {
      const { error } = await supabase
        .from('game_progress')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating progress:', error);
        return;
      }

      setProgress(prev => prev ? { ...prev, ...updates } : null);
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  return {
    progress,
    loading,
    updateProgress,
    loadProgress
  };
};
