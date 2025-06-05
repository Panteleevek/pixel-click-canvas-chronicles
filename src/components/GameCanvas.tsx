
import { useState, useEffect, useRef } from 'react';
import { useGameProgress } from '@/hooks/useGameProgress';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const BASE_SIZE = 10; // Базовый размер для первого уровня
const SIZE_INCREMENT = 50; // Увеличение размера на каждый уровень

export const GameCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentImage, setCurrentImage] = useState<ImageData | null>(null);
  const [revealedPixels, setRevealedPixels] = useState<Set<number>>(new Set());
  const [canvasSize, setCanvasSize] = useState(BASE_SIZE);
  const { progress, updateProgress, loading } = useGameProgress();
  const { toast } = useToast();

  // Вычисляем размер холста на основе уровня
  const calculateCanvasSize = (level: number) => {
    return BASE_SIZE + (level - 1) * SIZE_INCREMENT;
  };

  // Генерация простого изображения (например, круг или квадрат)
  const generateMeaningfulImage = (size: number): ImageData => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    
    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;
    
    // Заполняем фон серым цветом
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 200;     // Red
      data[i + 1] = 200; // Green
      data[i + 2] = 200; // Blue
      data[i + 3] = 255; // Alpha
    }
    
    const centerX = Math.floor(size / 2);
    const centerY = Math.floor(size / 2);
    const radius = Math.floor(size / 3);
    
    // Создаем простые геометрические фигуры в зависимости от уровня
    const level = progress?.current_level || 1;
    const shapes = ['circle', 'square', 'triangle', 'heart', 'star'];
    const shapeType = shapes[(level - 1) % shapes.length];
    
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const index = (y * size + x) * 4;
        let isPartOfShape = false;
        
        switch (shapeType) {
          case 'circle':
            const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
            isPartOfShape = distance <= radius;
            break;
          case 'square':
            isPartOfShape = Math.abs(x - centerX) <= radius && Math.abs(y - centerY) <= radius;
            break;
          case 'triangle':
            isPartOfShape = y >= centerY - radius && 
              Math.abs(x - centerX) <= (radius * (centerY + radius - y)) / radius;
            break;
          case 'heart':
            const dx = x - centerX;
            const dy = y - centerY;
            const equation = Math.pow(dx * dx + dy * dy - radius * radius, 3) - dx * dx * dy * dy * dy;
            isPartOfShape = equation <= 0 && dy <= radius / 2;
            break;
          case 'star':
            const angle = Math.atan2(y - centerY, x - centerX);
            const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
            const starRadius = radius * (0.5 + 0.5 * Math.cos(5 * angle));
            isPartOfShape = dist <= starRadius;
            break;
        }
        
        if (isPartOfShape) {
          // Цветная фигура
          data[index] = 50 + (level * 20) % 200;      // Red
          data[index + 1] = 100 + (level * 30) % 150; // Green
          data[index + 2] = 150 + (level * 40) % 100; // Blue
          data[index + 3] = 255;                      // Alpha
        }
      }
    }
    
    return imageData;
  };

  // Инициализация игры
  useEffect(() => {
    if (!loading && progress) {
      const currentLevel = progress.current_level || 1;
      const size = calculateCanvasSize(currentLevel);
      setCanvasSize(size);
      
      const newImage = generateMeaningfulImage(size);
      setCurrentImage(newImage);
      
      // Восстанавливаем прогресс из базы данных
      if (progress.current_pixels && Array.isArray(progress.current_pixels)) {
        setRevealedPixels(new Set(progress.current_pixels));
      }
    }
  }, [loading, progress]);

  useEffect(() => {
    drawCanvas();
  }, [currentImage, revealedPixels, canvasSize]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !currentImage) return;

    const ctx = canvas.getContext('2d')!;
    canvas.width = canvasSize;
    canvas.height = canvasSize;
    
    // Очищаем холст (делаем серым для неоткрытых пикселей)
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, canvasSize, canvasSize);
    
    // Рисуем открытые пиксели
    const imageData = ctx.createImageData(canvasSize, canvasSize);
    const sourceData = currentImage.data;
    const destData = imageData.data;
    
    const totalPixels = canvasSize * canvasSize;
    
    for (let i = 0; i < totalPixels; i++) {
      const dataIndex = i * 4;
      if (revealedPixels.has(i)) {
        // Показываем оригинальный цвет пикселя
        destData[dataIndex] = sourceData[dataIndex];         // Red
        destData[dataIndex + 1] = sourceData[dataIndex + 1]; // Green
        destData[dataIndex + 2] = sourceData[dataIndex + 2]; // Blue
        destData[dataIndex + 3] = sourceData[dataIndex + 3]; // Alpha
      } else {
        // Серый цвет для неоткрытых пикселей
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
    
    // Правильно вычисляем координаты клика
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = Math.floor((event.clientX - rect.left) * scaleX);
    const y = Math.floor((event.clientY - rect.top) * scaleY);
    
    if (x < 0 || x >= canvasSize || y < 0 || y >= canvasSize) return;

    const pixelIndex = y * canvasSize + x;
    
    // Обновляем счетчик кликов при каждом клике
    const newTotalClicks = progress.total_clicks + 1;
    
    if (revealedPixels.has(pixelIndex)) {
      // Пиксель уже открыт, только увеличиваем счетчик кликов
      await updateProgress({
        total_clicks: newTotalClicks
      });
      return;
    }

    // Открываем новый пиксель
    const newRevealedPixels = new Set(revealedPixels);
    newRevealedPixels.add(pixelIndex);
    setRevealedPixels(newRevealedPixels);

    // Обновляем прогресс в базе данных
    await updateProgress({
      total_clicks: newTotalClicks,
      current_pixels: Array.from(newRevealedPixels)
    });

    // Проверяем, заполнен ли весь холст
    const totalPixels = canvasSize * canvasSize;
    if (newRevealedPixels.size >= totalPixels) {
      const newLevel = progress.current_level + 1;
      
      toast({
        title: 'Уровень завершен!',
        description: `Поздравляем! Вы достигли ${newLevel} уровня!`
      });

      // Сохраняем новый уровень и начинаем новый холст
      await updateProgress({
        total_clicks: newTotalClicks,
        current_level: newLevel,
        current_pixels: []
      });

      // Начинаем новый уровень
      const newSize = calculateCanvasSize(newLevel);
      setCanvasSize(newSize);
      setRevealedPixels(new Set());
      setCurrentImage(generateMeaningfulImage(newSize));
    }
  };

  const resetGame = async () => {
    if (!progress) return;

    await updateProgress({
      total_clicks: 0,
      current_level: 1,
      current_pixels: []
    });

    const newSize = calculateCanvasSize(1);
    setCanvasSize(newSize);
    setRevealedPixels(new Set());
    setCurrentImage(generateMeaningfulImage(newSize));

    toast({
      title: 'Игра сброшена',
      description: 'Прогресс обнулен, начинаем с первого уровня!'
    });
  };

  if (loading) {
    return <div className="text-center">Загрузка...</div>;
  }

  const totalPixels = canvasSize * canvasSize;
  const currentLevel = progress?.current_level || 1;

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Пиксель-Кликер</h1>
        <div className="flex gap-6 text-lg">
          <span>Кликов: {progress?.total_clicks || 0}</span>
          <span>Уровень: {currentLevel}</span>
        </div>
        <div className="text-sm text-gray-600">
          Открыто пикселей: {revealedPixels.size} / {totalPixels}
        </div>
        <div className="text-xs text-gray-500">
          Размер холста: {canvasSize}×{canvasSize} пикселей
        </div>
      </div>
      
      <canvas
        ref={canvasRef}
        width={canvasSize}
        height={canvasSize}
        onClick={handleCanvasClick}
        className="border-2 border-gray-300 cursor-crosshair"
        style={{ 
          maxWidth: '500px', 
          maxHeight: '500px',
          width: '100%',
          height: 'auto',
          imageRendering: 'pixelated'
        }}
      />
      
      <Button onClick={resetGame} variant="outline">
        Сбросить игру
      </Button>
    </div>
  );
};
