import React, { forwardRef } from "react";
import { cn } from "@packages/ui";
import { ChartToolbar } from "./ChartToolbar";
import { FullscreenModal } from "./FullscreenModal";
import { useChartExport } from "../../hooks/useChartExport";
import { useChartFullscreen } from "../../hooks/useChartFullscreen";
import { LoadingSpinner, ChartIcon } from "../../icons";
import type { ToolbarConfig } from "../../types";

interface ChartContainerProps {
  title?: string;
  description?: string;
  toolbar?: ToolbarConfig | boolean;
  loading?: boolean;
  loadingText?: string;
  empty?: boolean;
  emptyText?: string;
  error?: boolean;
  errorText?: string;
  onRetry?: () => void;
  data: any[];
  exportFilename?: string;
  className?: string;
  children: React.ReactNode;
}

export const ChartContainer = forwardRef<HTMLDivElement, ChartContainerProps>(
  (
    {
      title,
      description,
      toolbar = true,
      loading = false,
      loadingText = "Loading chart...",
      empty = false,
      emptyText = "No data available",
      error = false,
      errorText = "Failed to load chart",
      onRetry,
      data,
      exportFilename = "chart",
      className,
      children,
    },
    ref
  ) => {
    const {
      chartRef,
      isExporting,
      exportAsImage,
      exportAsCSV,
      exportAsJSON,
      copyToClipboard,
    } = useChartExport(data);
    const { isFullscreen, toggleFullscreen, closeFullscreen } =
      useChartFullscreen();

    const showToolbar = toolbar !== false && !loading && !empty && !error;
    const toolbarConfig: ToolbarConfig =
      typeof toolbar === "object" ? toolbar : { show: true };

    const handleDownloadImage = (format: "png" | "jpeg" | "svg") => {
      exportAsImage({ filename: exportFilename, format });
    };

    const handleDownloadData = (format: "csv" | "json") => {
      if (format === "csv") {
        exportAsCSV({ filename: exportFilename });
      } else {
        exportAsJSON({ filename: exportFilename });
      }
    };

    const renderContent = () => {
      if (loading) {
        return (
          <div className="chart-loading flex-col gap-3">
            <LoadingSpinner
              className="text-primary animate-spin"
              size={32}
            />
            <p className="text-muted text-sm">{loadingText}</p>
          </div>
        );
      }

      if (error) {
        return (
          <div className="chart-empty">
            <div
              className="chart-empty-icon flex items-center justify-center rounded-full"
              style={{
                backgroundColor: "var(--error-bg)",
                width: "3rem",
                height: "3rem",
              }}
            >
              <span
                className="text-xl font-bold"
                style={{ color: "var(--error)" }}
              >
                !
              </span>
            </div>
            <p className="chart-empty-text mt-3 text-base">{errorText}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="btn btn-secondary mt-4"
              >
                Try again
              </button>
            )}
          </div>
        );
      }

      if (empty || data.length === 0) {
        return (
          <div className="chart-empty">
            <div
              className="chart-empty-icon flex items-center justify-center rounded-full"
              style={{ backgroundColor: "var(--bg-tertiary)" }}
            >
              <ChartIcon
                className="text-subtle"
                size={24}
              />
            </div>
            <p className="chart-empty-text mt-3">{emptyText}</p>
          </div>
        );
      }

      return (
        <div className="animate-chart-fade-in h-full w-full">{children}</div>
      );
    };

    const chartContent = (
      <div
        ref={chartRef}
        className={cn("chart-card", className)}
      >
        {/* Header */}
        {(title || description || showToolbar) && (
          <div className="chart-card-header flex items-start justify-between">
            <div className="min-w-0 flex-1">
              {title && <h3 className="chart-card-title">{title}</h3>}
              {description && (
                <p className="chart-card-description">{description}</p>
              )}
            </div>
            {showToolbar && (
              <ChartToolbar
                config={toolbarConfig}
                onDownloadImage={handleDownloadImage}
                onDownloadData={handleDownloadData}
                onCopyData={copyToClipboard}
                onFullscreen={toggleFullscreen}
                isExporting={isExporting}
              />
            )}
          </div>
        )}

        {/* Chart Content */}
        <div
          className="chart-card-content"
          ref={ref}
        >
          {renderContent()}
        </div>
      </div>
    );

    return (
      <>
        {chartContent}
        <FullscreenModal
          isOpen={isFullscreen}
          onClose={closeFullscreen}
          title={title}
        >
          <div className="h-full w-full">{renderContent()}</div>
        </FullscreenModal>
      </>
    );
  }
);

ChartContainer.displayName = "ChartContainer";
