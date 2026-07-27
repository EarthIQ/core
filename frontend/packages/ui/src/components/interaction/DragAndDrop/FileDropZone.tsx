"use client";

import React, { useCallback, useState } from "react";
import { useDrop } from "react-dnd";
import { NativeTypes } from "react-dnd-html5-backend";
import { cn } from "../../../utils/cn";

export interface FileDropZoneProps {
  accept?: string[];
  maxFiles?: number;
  maxSize?: number; // bytes
  multiple?: boolean;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode | ((state: FileDropState) => React.ReactNode);
  onFilesAccepted: (files: File[]) => void;
  onFilesRejected?: (rejections: FileRejection[]) => void;
  validator?: (file: File) => string | null;
}

export interface FileDropState {
  isOver: boolean;
  canDrop: boolean;
  isDragActive: boolean;
  acceptedFiles: File[];
  rejectedFiles: FileRejection[];
}

export interface FileRejection {
  file: File;
  reason: string;
}

export const FileDropZone: React.FC<FileDropZoneProps> = ({
  accept = ["image/*", "application/pdf", ".doc", ".docx"],
  maxFiles = 10,
  maxSize = 10 * 1024 * 1024, // 10MB
  multiple = true,
  disabled = false,
  className,
  children,
  onFilesAccepted,
  onFilesRejected,
  validator,
}) => {
  const [acceptedFiles, setAcceptedFiles] = useState<File[]>([]);
  const [rejectedFiles, setRejectedFiles] = useState<FileRejection[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);

  const validateFile = useCallback(
    (file: File): string | null => {
      // Custom validator
      if (validator) {
        const error = validator(file);
        if (error) return error;
      }

      // Size check
      if (file.size > maxSize) {
        return `File exceeds ${formatBytes(maxSize)} limit`;
      }

      // Type check
      if (accept.length > 0) {
        const isAccepted = accept.some((type) => {
          if (type.startsWith(".")) {
            return file.name.toLowerCase().endsWith(type.toLowerCase());
          }
          if (type.endsWith("/*")) {
            return file.type.startsWith(type.replace("/*", "/"));
          }
          return file.type === type;
        });
        if (!isAccepted) {
          return `File type "${file.type || "unknown"}" not accepted`;
        }
      }

      return null;
    },
    [accept, maxSize, validator]
  );

  const processFiles = useCallback(
    (files: File[]) => {
      const toProcess = multiple ? files : files.slice(0, 1);
      const accepted: File[] = [];
      const rejected: FileRejection[] = [];

      for (const file of toProcess) {
        if (!multiple && acceptedFiles.length + accepted.length >= 1) {
          rejected.push({ file, reason: "Only one file allowed" });
          continue;
        }
        if (acceptedFiles.length + accepted.length >= maxFiles) {
          rejected.push({
            file,
            reason: `Maximum ${maxFiles} files allowed`,
          });
          continue;
        }

        const error = validateFile(file);
        if (error) {
          rejected.push({ file, reason: error });
        } else {
          accepted.push(file);
        }
      }

      if (accepted.length > 0) {
        setAcceptedFiles((prev) => [...prev, ...accepted]);
        onFilesAccepted(accepted);
      }
      if (rejected.length > 0) {
        setRejectedFiles(rejected);
        onFilesRejected?.(rejected);
      }
    },
    [
      acceptedFiles,
      maxFiles,
      multiple,
      onFilesAccepted,
      onFilesRejected,
      validateFile,
    ]
  );

  const [{ isOver, canDrop }, drop] = useDrop({
    accept: [NativeTypes.FILE],
    drop: (item: { files: File[] }) => {
      if (!disabled) {
        processFiles(item.files);
        setIsDragActive(false);
      }
    },
    hover: () => {
      if (!isDragActive) setIsDragActive(true);
    },
    canDrop: () => !disabled,
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(Array.from(e.target.files));
    }
  };

  const removeFile = (index: number) => {
    setAcceptedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    setAcceptedFiles([]);
    setRejectedFiles([]);
  };

  const dropState: FileDropState = {
    isOver,
    canDrop,
    isDragActive,
    acceptedFiles,
    rejectedFiles,
  };

  return (
    <div className="space-y-4">
      <div
        ref={drop}
        className={cn(
          "relative flex min-h-[200px] flex-col items-center justify-center",
          "rounded-xl border-2 border-dashed p-8 transition-all duration-300",
          "border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-900/50",
          isOver &&
            canDrop &&
            "scale-[1.01] border-blue-400 bg-blue-50 dark:bg-blue-950/30",
          isOver && !canDrop && "border-red-400 bg-red-50 dark:bg-red-950/30",
          disabled && "cursor-not-allowed opacity-50",
          !disabled && "cursor-pointer hover:border-gray-400 hover:bg-gray-100",
          className
        )}
        onClick={() => {
          if (!disabled) {
            document.getElementById("file-drop-input")?.click();
          }
        }}
      >
        <input
          id="file-drop-input"
          type="file"
          className="hidden"
          multiple={multiple}
          accept={accept.join(",")}
          onChange={handleInputChange}
          disabled={disabled}
        />

        {typeof children === "function" ? (
          children(dropState)
        ) : children ? (
          children
        ) : (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
              {isOver ? (
                <svg
                  className="h-8 w-8 animate-bounce text-blue-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 14l-7 7m0 0l-7-7m7 7V3"
                  />
                </svg>
              ) : (
                <svg
                  className="h-8 w-8 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              )}
            </div>
            <p className="text-base font-medium text-gray-700 dark:text-gray-300">
              {isOver ? "Drop files here" : "Drag & drop files here"}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              or <span className="text-blue-500 underline">browse</span>
            </p>
            <p className="mt-2 text-xs text-gray-400">
              Max {formatBytes(maxSize)} per file · Up to {maxFiles} files
            </p>
          </div>
        )}
      </div>

      {/* Accepted Files */}
      {acceptedFiles.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {acceptedFiles.length} file(s) selected
            </span>
            <button
              onClick={clearAll}
              className="text-xs text-red-500 hover:text-red-700"
            >
              Clear all
            </button>
          </div>
          {acceptedFiles.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex items-center justify-between rounded-lg border bg-white p-3 dark:bg-gray-800"
            >
              <div className="flex items-center gap-3">
                <FileIcon type={file.type} />
                <div>
                  <p className="max-w-[200px] truncate text-sm font-medium">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {formatBytes(file.size)}
                  </p>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(index);
                }}
                className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Rejected Files */}
      {rejectedFiles.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:bg-red-950/30">
          <p className="text-sm font-medium text-red-700 dark:text-red-400">
            Some files were rejected:
          </p>
          {rejectedFiles.map((rejection, index) => (
            <p
              key={index}
              className="mt-1 text-xs text-red-600 dark:text-red-400"
            >
              • {rejection.file.name}: {rejection.reason}
            </p>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Helpers ──────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

const FileIcon: React.FC<{ type: string }> = ({ type }) => {
  const iconMap: Record<string, string> = {
    "image/": "🖼️",
    "application/pdf": "📄",
    "application/msword": "📝",
    "text/": "📃",
    "video/": "🎬",
    "audio/": "🎵",
  };

  const icon =
    Object.entries(iconMap).find(([key]) => type.startsWith(key))?.[1] ?? "📎";

  return <span className="text-2xl">{icon}</span>;
};
