import { useCallback, useRef, useState } from "react";
import {
  exportChartAsImage,
  exportDataAsCSV,
  exportDataAsJSON,
  copyDataToClipboard,
} from "../utils/exportUtils";
import type {
  ChartDataPoint,
  ExportOptions,
  DataExportOptions,
} from "../types";

interface UseChartExportReturn {
  chartRef: React.RefObject<HTMLDivElement | null>;
  isExporting: boolean;
  exportAsImage: (options?: ExportOptions) => Promise<void>;
  exportAsCSV: (options?: DataExportOptions) => void;
  exportAsJSON: (options?: DataExportOptions) => void;
  copyToClipboard: () => Promise<void>;
}

export const useChartExport = (
  data: ChartDataPoint[]
): UseChartExportReturn => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const exportAsImage = useCallback(async (options?: ExportOptions) => {
    if (!chartRef.current) return;

    setIsExporting(true);
    try {
      await exportChartAsImage(chartRef.current, options);
    } finally {
      setIsExporting(false);
    }
  }, []);

  const exportAsCSV = useCallback(
    (options?: DataExportOptions) => {
      exportDataAsCSV(data, options);
    },
    [data]
  );

  const exportAsJSON = useCallback(
    (options?: DataExportOptions) => {
      exportDataAsJSON(data, options);
    },
    [data]
  );

  const copyToClipboard = useCallback(async () => {
    await copyDataToClipboard(data);
  }, [data]);

  return {
    chartRef,
    isExporting,
    exportAsImage,
    exportAsCSV,
    exportAsJSON,
    copyToClipboard,
  };
};
