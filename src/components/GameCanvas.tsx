
import { useState, useEffect, useRef } from 'react';
import { useGameProgress } from '@/hooks/useGameProgress';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const CANVAS_SIZE = 500;
const TOTAL_PIXELS = CANVAS_SIZE * CANVAS_SIZE;

export const GameCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentImage, setCurrentImage] = useState<ImageData | null>(null);
  const [revealedPixels, setRevealedPixels] = useState<Set<number>>(new Set());
  const [clicksSinceLastSave, setClicksSinceLastSave] = useState(0);
  const { progress, updateProgress, loading } = useGameProgress();
  const { toast } = useToast();

  // Генерация случайной картинки
  const generateRandomImage = (): ImageData => {
    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
    const ctx = canvas.getContext('2d')!;
    
    const imageData = ctx.createImageData(CANVAS_SIZE, CANVAS_SIZE);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.floor(Math.random() * 256);     // Red
      data[i + 1] = Math.floor(Math.random() * 256); // Green
      data[i + 2] = Math.floor(Math.random() * 256); // Blue
      data[i + 3] = 255; // Alpha
    }
    
    return imageData;
  };

  // Инициализация игры
  useEffect(() => {
    if (!loading && progress) {
      const newImage = generateRandomImage();
      setCurrentImage(newImage);
      
      // Восстанавливаем прогресс из базы данных
      if (progress.current_pixels && Array.isArray(progress.current_pixels)) {
        setRevealedPixels(new Set(progress.current_pixels));
      }
      
      drawCanvas();
    }
  }, [loading, progress]);

  useEffect(() => {
    drawCanvas();
  }, [currentImage, revealedPixels]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !currentImage) return;

    const ctx = canvas.getContext('2d')!;
    
    // Очищаем холст (делаем серым)
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    
    // Рисуем открытые пиксели
    const imageData = ctx.createImageData(CANVAS_SIZE, CANVAS_SIZE);
    const sourceData = currentImage.data;
    const destData = imageData.data;
    
    for (let i = 0; i < TOTAL_PIXELS; i++) {
      const dataIndex = i * 4;
      if (revealedPixels.has(i)) {
        destData[dataIndex] = sourceData[dataIndex];         // Red
        destData[dataIndex + 1] = sourceData[dataIndex + 1]; // Green
        destData[dataIndex + 2] = sourceData[dataIndex + 2]; // Blue
        destData[dataIndex + 3] = sourceData[dataIndex + 3]; // Alpha
      } else {
        destData[dataIndex] = 128;     // Gray
        destData[dataIndex + 1] = 128;
        destData[dataIndex + 2] = 128;
        destData[dataIndex + 3] = 255;
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
  };

  const handleCanvasClick = async (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!currentImage || !progress) return;

    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(event.clientX - rect.left);
    const y = Math.floor(event.clientY - rect.top);
    
    if (x < 0 || x >= CANVAS_SIZE || y < 0 || y >= CANVAS_SIZE) return;

    const pixelIndex = y * CANVAS_SIZE + x;
    
    if (revealedPixels.has(pixelIndex)) return; // Пиксель уже открыт

    // Добавляем новый пиксель
    const newRevealedPixels = new Set(revealedPixels);
    newRevealedPixels.add(pixelIndex);
    setRevealedPixels(newRevealedPixels);

    const newTotalClicks = progress.total_clicks + 1;
    const newClicksSinceLastSave = clicksSinceLastSave + 1;

    // Сохраняем каждый 10-й клик
    if (newClicksSinceLastSave >= 10) {
      await updateProgress({
        total_clicks: newTotalClicks,
        current_pixels: Array.from(newRevealedPixels)
      });
      setClicksSinceLastSave(0);
    } else {
      setClicksSinceLastSave(newClicksSinceLastSave);
    }

    // Проверяем, заполнена ли картинка
    if (newRevealedPixels.size >= TOTAL_PIXELS) {
      const newCompletedImages = progress.completed_images + 1;
      
      toast({
        title: 'Картинка завершена!',
        description: `Вы завершили ${newCompletedImages} картинок!`
      });

      // Сохраняем завершенную картинку и начинаем новую
      await updateProgress({
        total_clicks: newTotalClicks,
        completed_images: newCompletedImages,
        current_pixels: []
      });

      // Начинаем новую картинку
      setRevealedPixels(new Set());
      setCurrentImage(generateRandomImage());
      setClicksSinceLastSave(0);
    }
  };

  const resetGame = async () => {
    if (!progress) return;

    await updateProgress({
      total_clicks: 0,
      completed_images: 0,
      current_pixels: []
    });

    setRevealedPixels(new Set());
    setCurrentImage(generateRandomImage());
    setClicksSinceLastSave(0);

    toast({
      title: 'Игра сброшена',
      description: 'Прогресс обнулен, начинаем заново!'
    });
  };

  if (loading) {
    return <div className="text-center">Загрузка...</div>;
  }

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Пиксель-Кликер</h1>
        <div className="flex gap-6 text-lg">
          <span>Кликов: {progress?.total_clicks || 0}</span>
          <span>Завершенных картинок: {progress?.completed_images || 0}</span>
        </div>
        <div className="text-sm text-gray-600">
          Открыто пикселей: {revealedPixels.size} / {TOTAL_PIXELS}
        </div>
      </div>
      
      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        onClick={handleCanvasClick}
        className="border-2 border-gray-300 cursor-crosshair"
        style={{ maxWidth: '100%', height: 'auto' }}
      />
      
      <Button onClick={resetGame} variant="outline">
        Сбросить игру
      </Button>
    </div>
  );
};
