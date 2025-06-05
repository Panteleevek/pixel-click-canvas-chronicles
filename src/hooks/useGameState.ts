
import { useState, useEffect } from 'react';
import { calculateTotalPixels, calculateCanvasDimensions } from '@/utils/pixelCalculations';
import { generateMeaningfulImage } from '@/utils/imageGeneration';
import { useGameProgress } from '@/hooks/useGameProgress';

export const useGameState = () => {
  const [currentImage, setCurrentImage] = useState<ImageData | null>(null);
  const [revealedPixels, setRevealedPixels] = useState<Set<number>>(new Set());
  const [canvasWidth, setCanvasWidth] = useState(10);
  const [canvasHeight, setCanvasHeight] = useState(10);
  const [totalPixels, setTotalPixels] = useState(10);
  const { progress, updateProgress, loading } = useGameProgress();

  // Инициализация игры
  useEffect(() => {
    console.log('Game initialization:', { loading, progress });
    if (!loading && progress) {
      const currentLevel = progress.current_level || 1;
      const pixels = calculateTotalPixels(currentLevel);
      const dimensions = calculateCanvasDimensions(pixels);
      
      console.log('Setting up level:', currentLevel, 'pixels:', pixels, 'dimensions:', dimensions);
      
      setTotalPixels(pixels);
      setCanvasWidth(dimensions.width);
      setCanvasHeight(dimensions.height);
      
      const newImage = generateMeaningfulImage(dimensions.width, dimensions.height, currentLevel);
      setCurrentImage(newImage);
      
      // Восстанавливаем прогресс из базы данных
      if (progress.current_pixels && Array.isArray(progress.current_pixels)) {
        setRevealedPixels(new Set(progress.current_pixels));
      } else {
        setRevealedPixels(new Set());
      }
    }
  }, [loading, progress]);

  const resetGame = async () => {
    if (!progress) return;

    console.log('Resetting game');
    
    await updateProgress({
      total_clicks: 0,
      current_level: 1,
      current_pixels: []
    });

    const newPixels = calculateTotalPixels(1);
    const newDimensions = calculateCanvasDimensions(newPixels);
    
    setTotalPixels(newPixels);
    setCanvasWidth(newDimensions.width);
    setCanvasHeight(newDimensions.height);
    setRevealedPixels(new Set());
    setCurrentImage(generateMeaningfulImage(newDimensions.width, newDimensions.height, 1));
  };

  return {
    currentImage,
    revealedPixels,
    canvasWidth,
    canvasHeight,
    totalPixels,
    progress,
    loading,
    setCurrentImage,
    setRevealedPixels,
    setCanvasWidth,
    setCanvasHeight,
    setTotalPixels,
    updateProgress,
    resetGame
  };
};
