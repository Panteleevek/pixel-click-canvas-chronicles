
import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { calculateTotalPixels, calculateCanvasDimensions } from '@/utils/pixelCalculations';
import { generateMeaningfulImage } from '@/utils/imageGeneration';
import { useGameState } from '@/hooks/useGameState';

export const GameCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();
  const {
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
  } = useGameState();

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
