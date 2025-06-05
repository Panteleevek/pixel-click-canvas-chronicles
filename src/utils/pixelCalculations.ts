
// Функция для вычисления общего количества пикселей для уровня
export const calculateTotalPixels = (level: number) => {
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
export const calculateCanvasDimensions = (totalPixels: number) => {
  // Делаем холст примерно квадратным
  const side = Math.ceil(Math.sqrt(totalPixels));
  return { width: side, height: Math.ceil(totalPixels / side) };
};
