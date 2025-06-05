
// Генерация осмысленного изображения
export const generateMeaningfulImage = (width: number, height: number, level: number): ImageData => {
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
