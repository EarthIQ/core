import React, {
  useState,
  useRef,
  useCallback,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../../utils/cn";
import { Button } from "../../primitives/Button/Button";
import { Progress } from "../../feedback/Progress/Progress";

interface FileInfo {
  file: File;
  id: string;
  progress: number;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
  preview?: string;
}

interface FileUploadProps {
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // in bytes
  maxFiles?: number;
  onUpload?: (files: File[]) => Promise<void> | void;
  onRemove?: (fileId: string) => void;
  disabled?: boolean;
  showPreview?: boolean;
  variant?: "default" | "compact" | "avatar";
  className?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

function getFileIcon(type: string): string {
  if (type.startsWith("image/")) return "🖼️";
  if (type.startsWith("video/")) return "🎬";
  if (type.startsWith("audio/")) return "🎵";
  if (type.includes("pdf")) return "📄";
  if (type.includes("word") || type.includes("document")) return "📝";
  if (type.includes("sheet") || type.includes("excel")) return "📊";
  if (type.includes("zip") || type.includes("rar") || type.includes("archive"))
    return "📦";
  return "📎";
}

export function FileUpload({
  accept,
  multiple = false,
  maxSize = 10 * 1024 * 1024,
  maxFiles = 5,
  onUpload,
  onRemove,
  disabled = false,
  showPreview = true,
  variant = "default",
  className,
}: FileUploadProps) {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (maxSize && file.size > maxSize)
      return `File size exceeds ${formatFileSize(maxSize)}`;

    if (accept) {
      const acceptedTypes = accept.split(",").map((t) => t.trim());
      const fileType = file.type;
      const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();

      const isAccepted = acceptedTypes.some((type) => {
        if (type.startsWith(".")) return fileExtension === type.toLowerCase();
        if (type.endsWith("/*"))
          return fileType.startsWith(type.replace("/*", "/"));
        return fileType === type;
      });

      if (!isAccepted) return "File type not accepted";
    }

    return null;
  };

  const createPreview = (file: File): Promise<string | undefined> =>
    new Promise((resolve) => {
      if (!file.type.startsWith("image/")) return resolve(undefined);
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(undefined);
      reader.readAsDataURL(file);
    });

  const addFiles = useCallback(
    async (newFiles: FileList | File[]) => {
      const fileArray = Array.from(newFiles);

      if (!multiple && fileArray.length > 1) fileArray.length = 1;

      if (files.length + fileArray.length > maxFiles) {
        alert(`Maximum ${maxFiles} files allowed`);
        return;
      }

      const fileInfos: FileInfo[] = await Promise.all(
        fileArray.map(async (file) => {
          const error = validateFile(file);
          const preview = showPreview ? await createPreview(file) : undefined;

          return {
            file,
            id: generateId(),
            progress: 0,
            status: error ? "error" : "pending",
            error: error || undefined,
            preview,
          };
        })
      );

      setFiles((prev) => (multiple ? [...prev, ...fileInfos] : fileInfos));

      const validFiles = fileInfos
        .filter((f) => f.status === "pending")
        .map((f) => f.file);

      if (validFiles.length > 0 && onUpload) {
        fileInfos.forEach(
          (fi) => fi.status === "pending" && simulateUpload(fi.id)
        );
        try {
          await onUpload(validFiles);
        } catch {
          // optionally set error statuses here
        }
      }
    },
    [files.length, maxFiles, multiple, onUpload, showPreview]
  );

  const simulateUpload = (fileId: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, status: "uploading" } : f))
    );

    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 20;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileId ? { ...f, progress: 100, status: "success" } : f
          )
        );
      } else {
        setFiles((prev) =>
          prev.map((f) => (f.id === fileId ? { ...f, progress } : f))
        );
      }
    }, 200);
  };

  const removeFile = (fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
    onRemove?.(fileId);
  };

  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) addFiles(droppedFiles);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) addFiles(selectedFiles);
    if (inputRef.current) inputRef.current.value = "";
  };

  const draggingBgStyle = isDragging
    ? { backgroundColor: "oklch(from var(--primary) l c h / 0.10)" }
    : undefined;

  // Avatar variant
  if (variant === "avatar") {
    const currentFile = files[0];

    return (
      <div className={cn("relative inline-block", className)}>
        <input
          ref={inputRef}
          type="file"
          accept={accept || "image/*"}
          onChange={handleInputChange}
          disabled={disabled}
          className="hidden"
        />

        <div
          onClick={() => !disabled && inputRef.current?.click()}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          style={draggingBgStyle}
          className={cn(
            "h-24 w-24 overflow-hidden rounded-full",
            "flex items-center justify-center",
            "cursor-pointer transition-colors",
            "border-2 border-dashed bg-[var(--surface)]",
            isDragging
              ? "border-[var(--primary)]"
              : "border-[var(--border-secondary)]",
            !isDragging &&
              "hover:border-[var(--border-primary)] hover:bg-[var(--surface-hover)]",
            disabled && "cursor-not-allowed opacity-60"
          )}
        >
          {currentFile?.preview ? (
            <img
              src={currentFile.preview}
              alt="Avatar preview"
              className="h-full w-full object-cover"
            />
          ) : (
            <svg
              className="h-8 w-8 text-[var(--text-tertiary)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          )}
        </div>

        {currentFile && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              removeFile(currentFile.id);
            }}
            className={cn(
              "absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full",
              "bg-[var(--error)] text-[var(--text-on-primary)] transition-opacity hover:opacity-90"
            )}
            aria-label="Remove file"
          >
            <svg
              className="h-3 w-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    );
  }

  // Compact variant
  if (variant === "compact") {
    return (
      <div className={cn("space-y-2", className)}>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleInputChange}
          disabled={disabled}
          className="hidden"
        />

        <Button
          type="button"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          leftIcon={
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          }
        >
          Choose Files
        </Button>

        {files.length > 0 && (
          <div className="space-y-1">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-2 text-sm text-[var(--text-secondary)]"
              >
                <span aria-hidden="true">{getFileIcon(file.file.type)}</span>
                <span className="flex-1 truncate">{file.file.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(file.id)}
                  className="text-[var(--text-tertiary)] transition-colors hover:text-[var(--error)]"
                  aria-label="Remove file"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Default variant
  return (
    <div className={cn("space-y-4", className)}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleInputChange}
        disabled={disabled}
        className="hidden"
      />

      {/* Drop Zone */}
      <div
        onClick={() => !disabled && inputRef.current?.click()}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        style={draggingBgStyle}
        className={cn(
          "relative cursor-pointer text-center",
          "rounded-[var(--radius-2xl)] border-2 border-dashed p-8 transition-colors",
          "bg-[var(--surface)]",
          isDragging
            ? "border-[var(--primary)]"
            : "border-[var(--border-secondary)]",
          !isDragging &&
            "hover:border-[var(--border-primary)] hover:bg-[var(--surface-hover)]",
          disabled && "cursor-not-allowed opacity-60"
        )}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface-hover)]">
            <svg
              className="h-6 w-6 text-[var(--text-secondary)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>

          <div>
            <p className="text-base font-medium text-[var(--text-primary)]">
              {isDragging ? "Drop files here" : "Drag & drop files here"}
            </p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              or <span className="text-[var(--primary)]">browse</span> to upload
            </p>
          </div>

          <p className="text-xs text-[var(--text-tertiary)]">
            {accept && `Accepted: ${accept}`}
            {maxSize && ` • Max size: ${formatFileSize(maxSize)}`}
            {multiple && maxFiles && ` • Max files: ${maxFiles}`}
          </p>
        </div>
      </div>

      {/* File List */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            {files.map((fileInfo) => (
              <motion.div
                key={fileInfo.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className={cn(
                  "flex items-center gap-3 rounded-xl border p-3",
                  "border-[var(--border-secondary)] bg-[var(--surface)]",
                  fileInfo.status === "error" &&
                    "border-[var(--error-border)] bg-[var(--error-bg)]"
                )}
              >
                {/* Preview / Icon */}
                {fileInfo.preview ? (
                  <img
                    src={fileInfo.preview}
                    alt={fileInfo.file.name}
                    className="h-10 w-10 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--surface-hover)] text-lg">
                    <span aria-hidden="true">
                      {getFileIcon(fileInfo.file.type)}
                    </span>
                  </div>
                )}

                {/* File Info */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                    {fileInfo.file.name}
                  </p>

                  <p className="text-xs text-[var(--text-secondary)]">
                    {formatFileSize(fileInfo.file.size)}
                    {fileInfo.error && (
                      <span className="ml-2 text-[var(--error-text)]">
                        {fileInfo.error}
                      </span>
                    )}
                  </p>

                  {fileInfo.status === "uploading" && (
                    <Progress
                      value={fileInfo.progress}
                      size="sm"
                      className="mt-2"
                    />
                  )}
                </div>

                {/* Status / Actions */}
                <div className="flex items-center gap-2">
                  {fileInfo.status === "success" && (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--success-bg)]">
                      <svg
                        className="h-4 w-4 text-[var(--success)]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                  )}

                  {fileInfo.status === "error" && (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--error-bg)]">
                      <svg
                        className="h-4 w-4 text-[var(--error)]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => removeFile(fileInfo.id)}
                    className={cn(
                      "rounded-lg p-1 transition-colors",
                      "hover:bg-[var(--surface-hover)]",
                      "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                    )}
                    aria-label="Remove file"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
