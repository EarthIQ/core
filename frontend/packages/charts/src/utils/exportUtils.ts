import { toPng, toJpeg, toSvg } from "html-to-image";
import { saveAs } from "file-saver";
import type {
  ExportOptions,
  DataExportOptions,
  ChartDataPoint,
} from "../types";

export const exportChartAsImage = async (
  element: HTMLElement,
  options: ExportOptions = {}
): Promise<void> => {
  const {
    filename = "chart",
    format = "png",
    quality = 1,
    backgroundColor = "#ffffff",
    scale = 2,
  } = options;

  const exportOptions = {
    quality,
    backgroundColor,
    pixelRatio: scale,
    cacheBust: true,
  };

  try {
    let dataUrl: string;

    switch (format) {
      case "jpeg":
        dataUrl = await toJpeg(element, exportOptions);
        break;
      case "svg":
        dataUrl = await toSvg(element, exportOptions);
        break;
      case "png":
      default:
        dataUrl = await toPng(element, exportOptions);
        break;
    }

    saveAs(dataUrl, `${filename}.${format}`);
  } catch (error) {
    console.error("Failed to export chart:", error);
    throw error;
  }
};

export const exportDataAsCSV = (
  data: ChartDataPoint[],
  options: DataExportOptions = {}
): void => {
  const { filename = "chart-data", includeHeaders = true } = options;

  if (!data.length) return;

  const headers = Object.keys(data[0]);
  const csvRows: string[] = [];

  if (includeHeaders) {
    csvRows.push(headers.join(","));
  }

  data.forEach((row) => {
    const values = headers.map((header) => {
      const value = row[header];
      // Escape quotes and wrap in quotes if contains comma
      if (
        typeof value === "string" &&
        (value.includes(",") || value.includes('"'))
      ) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value ?? "";
    });
    csvRows.push(values.join(","));
  });

  const csvContent = csvRows.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  saveAs(blob, `${filename}.csv`);
};

export const exportDataAsJSON = (
  data: ChartDataPoint[],
  options: DataExportOptions = {}
): void => {
  const { filename = "chart-data" } = options;

  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: "application/json" });
  saveAs(blob, `${filename}.json`);
};

export const copyDataToClipboard = async (
  data: ChartDataPoint[]
): Promise<void> => {
  const headers = Object.keys(data[0] || {});
  const rows = data.map((row) => headers.map((h) => row[h] ?? "").join("\t"));
  const content = [headers.join("\t"), ...rows].join("\n");

  await navigator.clipboard.writeText(content);
};
