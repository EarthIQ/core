export const defaultChartColors = [
  'hsl(var(--chart-1, 221 83% 53%))',
  'hsl(var(--chart-2, 142 76% 36%))',
  'hsl(var(--chart-3, 38 92% 50%))',
  'hsl(var(--chart-4, 280 65% 60%))',
  'hsl(var(--chart-5, 346 77% 49%))',
  'hsl(var(--chart-6, 199 89% 48%))',
];

export const getColor = (index: number, customColors?: string[]): string => {
  const colors = customColors || defaultChartColors;
  return colors[index % colors.length];
};

export const hexToRgba = (hex: string, alpha: number): string => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return hex;
  
  return `rgba(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}, ${alpha})`;
};

export const generateGradientId = (baseId: string, index: number): string => {
  return `${baseId}-gradient-${index}`;
};