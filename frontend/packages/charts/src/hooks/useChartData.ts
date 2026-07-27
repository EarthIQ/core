import { useState, useMemo, useCallback } from 'react';
import type { ChartDataPoint } from '../types';

interface UseChartDataOptions {
  initialHiddenSeries?: string[];
}

interface UseChartDataReturn {
  visibleData: ChartDataPoint[];
  hiddenSeries: Set<string>;
  toggleSeries: (dataKey: string) => void;
  showAllSeries: () => void;
  hideAllSeries: (allKeys: string[]) => void;
  isSeriesToVisible: (dataKey: string) => boolean;
}

export const useChartData = (
  data: ChartDataPoint[],
  options: UseChartDataOptions = {}
): UseChartDataReturn => {
  const { initialHiddenSeries = [] } = options;
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(
    new Set(initialHiddenSeries)
  );

  const visibleData = useMemo(() => {
    if (hiddenSeries.size === 0) return data;

    return data.map((item) => {
      const filteredItem: ChartDataPoint = { name: item.name };
      Object.keys(item).forEach((key) => {
        if (key === 'name' || !hiddenSeries.has(key)) {
          filteredItem[key] = item[key];
        }
      });
      return filteredItem;
    });
  }, [data, hiddenSeries]);

  const toggleSeries = useCallback((dataKey: string) => {
    setHiddenSeries((prev) => {
      const next = new Set(prev);
      if (next.has(dataKey)) {
        next.delete(dataKey);
      } else {
        next.add(dataKey);
      }
      return next;
    });
  }, []);

  const showAllSeries = useCallback(() => {
    setHiddenSeries(new Set());
  }, []);

  const hideAllSeries = useCallback((allKeys: string[]) => {
    setHiddenSeries(new Set(allKeys));
  }, []);

  const isSeriesToVisible = useCallback(
    (dataKey: string) => !hiddenSeries.has(dataKey),
    [hiddenSeries]
  );

  return {
    visibleData,
    hiddenSeries,
    toggleSeries,
    showAllSeries,
    hideAllSeries,
    isSeriesToVisible,
  };
};