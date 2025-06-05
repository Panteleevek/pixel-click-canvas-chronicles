
import { useState, useEffect, useRef } from 'react';
import { useGameProgress } from '@/hooks/useGameProgress';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

// Функция для вычисления общего количества пикселей для уровня
const calculateTotalPixels = (level: number) => {
  if (level === 1) return 10; // Первый уровень: 10 пикселей
  if (level <= 10) {
    // Уровни 2-10: прогрессия от 12 до 100 пикселей
    return 10 + (level - 1) * 10;
  }
  
  // После 10 уровня: базовые 100 пикселей + по 20 за каждый дополнительный десяток
  let totalPixels = 100;
  const additionalLevels = level - 10;
  const additionalTens = Math.floor(additionalLevels / 10);
  const remainingLevels = additionalLevels % 10;
  
  totalPixels += additionalTens * 20 * 10; // Каждые 10 уровней добавляют по 20*10 пикселей
  totalPixels += remainingLevels * 20; // Оставшиеся уровни добавляют по 20 пикселей
  
  return totalPixels;
};

// Функция для вычисления размеров холста на основе количества пикселей
const calculateCanvasDimensions = (totalPixels: number) => {
  // Делаем холст примерно квадратным
  const side = Math.ceil(Math.sqrt(totalPixels));
  return { width: side, height: Math.ceil(totalPixels / side) };
};

export const GameCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentImage, setCurrentImage] = useState<ImageData | null>(null);
  const [revealedPixels, setRevealedPixels] = useState<Set<number>>(new Set());
  const [canvasWidth, setCanvasWidth] = useState(10);
  const [canvasHeight, setCanvasHeight] = useState(10);
  const [totalPixels, setTotalPixels] = useState(10);
  const { progress, updateProgress, loading } = useGameProgress();
  const { toast } = useToast();

  // Генерация осмысленного изображения
  const generateMeaningfulImage = (width: number, height: number, level: number): ImageData => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;
    
    // Заполняем фон серым цветом
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 200;     // Red
      data[i + 1] = 200; // Green
      data[i + 2] = 200; // Blue
      data[i + 3] = 255; // Alpha
    }
    
    const centerX = Math.floor(width / 2);
    const centerY = Math.floor(height / 2);
    const radius = Math.floor(Math.min(width, height) / 3);
    
    // Создаем простые геометрические фигуры в зависимости от уровня
    const shapes = ['circle', 'square', 'triangle', 'heart', 'star'];
    const shapeType = shapes[(level - 1) % shapes.length];
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4;
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
      const pixels = calculateTotalPixels(currentLevel);
      const dimensions = calculateCanvasDimensions(pixels);
      
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

  useEffect(() => {
    drawCanvas();
  }, [currentImage, revealedPixels, canvasWidth, canvasHeight]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !currentImage) return;

    const ctx = canvas.getContext('2d')!;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    
    // Очищаем холст (делаем серым для неоткрытых пикселей)
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    // Рисуем открытые пиксели
    const imageData = ctx.createImageData(canvasWidth, canvasHeight);
    const sourceData = currentImage.data;
    const destData = imageData.data;
    
    const actualPixels = canvasWidth * canvasHeight;
    
    for (let i = 0; i < actualPixels; i++) {
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
    
    if (x < 0 || x >= canvasWidth || y < 0 || y >= canvasHeight) return;

    const pixelIndex = y * canvasWidth + x;
    const currentLevel = progress.current_level || 1;
    
    // Обновляем счетчик кликов при каждом клике
    const newTotalClicks = progress.total_clicks + 1;
    
    const newRevealedPixels = new Set(revealedPixels);
    
    // Открываем пиксель на месте курсора (если еще не открыт)
    if (!newRevealedPixels.has(pixelIndex)) {
      newRevealedPixels.add(pixelIndex);
    }
    
    // Начиная со второго уровня, открываем дополнительный случайный пиксель
    if (currentLevel >= 2) {
      const actualPixels = canvasWidth * canvasHeight;
      const unopenedPixels = [];
      
      for (let i = 0; i < actualPixels; i++) {
        if (!newRevealedPixels.has(i)) {
          unopenedPixels.push(i);
        }
      }
      
      if (unopenedPixels.length > 0) {
        const randomIndex = Math.floor(Math.random() * unopenedPixels.length);
        const randomPixel = unopenedPixels[randomIndex];
        newRevealedPixels.add(randomPixel);
      }
    }
    
    setRevealedPixels(newRevealedPixels);

    // Проверяем, заполнен ли весь холст (проверяем по totalPixels)
    if (newRevealedPixels.size >= totalPixels) {
      const newLevel = currentLevel + 1;
      
      toast({
        title: 'Уровень завершен!',
        description: `Поздравляем! Вы достигли ${newLevel} уровня!`
      });

      // Вычисляем параметры для нового уровня
      const newPixels = calculateTotalPixels(newLevel);
      const newDimensions = calculateCanvasDimensions(newPixels);
      
      // Сначала обновляем состояние компонента
      setTotalPixels(newPixels);
      setCanvasWidth(newDimensions.width);
      setCanvasHeight(newDimensions.height);
      setRevealedPixels(new Set());
      setCurrentImage(generateMeaningfulImage(newDimensions.width, newDimensions.height, newLevel));

      // Затем сохраняем в базу данных с новыми параметрами
      await updateProgress({
        total_clicks: newTotalClicks,
        current_level: newLevel,
        current_pixels: []
      });
    } else {
      // Обычное обновление прогресса без смены уровня
      await updateProgress({
        total_clicks: newTotalClicks,
        current_pixels: Array.from(newRevealedPixels)
      });
    }
  };

  const resetGame = async () => {
    if (!progress) return;

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

    toast({
      title: 'Игра сброшена',
      description: 'Прогресс обнулен, начинаем с первого уровня!'
    });
  };

  if (loading) {
    return <div className="text-center">Загрузка...</div>;
  }

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
          Размер холста: {canvasWidth}×{canvasHeight} пикселей
        </div>
        {currentLevel >= 2 && (
          <div className="text-xs text-blue-500">
            На этом уровне каждый клик открывает 2 пикселя!
          </div>
        )}
      </div>
      
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
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
