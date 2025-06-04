
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface GameProgress {
  id: string;
  total_clicks: number;
  current_level: number;
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
        // Преобразуем Json в number[]
        let currentPixels: number[] = [];
        if (Array.isArray(data.current_pixels)) {
          currentPixels = data.current_pixels.filter((pixel): pixel is number => 
            typeof pixel === 'number'
          );
        }

        setProgress({
          ...data,
          current_level: data.completed_images || 1, // Используем completed_images как current_level для совместимости
          current_pixels: currentPixels
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
      // Маппим current_level обратно в completed_images для совместимости с БД
      const dbUpdates = {
        ...updates,
        completed_images: updates.current_level,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('game_progress')
        .update(dbUpdates)
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
