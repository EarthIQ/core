import React, { useState, useCallback, type ReactNode } from "react";

import { Button } from "../../primitives/Button/Button";
import { Modal, ModalFooter } from "../Modal/Modal";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description?: string;
  children?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "danger";
  loading?: boolean;
  icon?: ReactNode;
}

export const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  children,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  loading = false,
  icon,
}: ConfirmDialogProps) => {
  const handleConfirm = async () => {
    await onConfirm();
    onClose();
  };

  const defaultIcon =
    variant === "danger" ? (
      <div
        className="mb-4 flex h-12 w-12 items-center justify-center rounded-full"
        style={{ backgroundColor: "var(--error-bg)" }}
      >
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          style={{ color: "var(--error)" }}
          viewBox="0 0 24 24"
        >
          <path
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
          />
        </svg>
      </div>
    ) : (
      <div
        className="mb-4 flex h-12 w-12 items-center justify-center rounded-full"
        style={{ backgroundColor: "var(--info-bg)" }}
      >
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          style={{ color: "var(--primary)" }}
          viewBox="0 0 24 24"
        >
          <path
            d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
          />
        </svg>
      </div>
    );

  return (
    <Modal
      isOpen={isOpen}
      showCloseButton={false}
      size="sm"
      onClose={onClose}
    >
      <div className="text-center">
        <div className="flex justify-center">{icon || defaultIcon}</div>

        <h3
          className="mb-2 text-lg font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          {title}
        </h3>

        {description ? <p
            className="mb-4 text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            {description}
          </p> : null}

        {children}
      </div>

      <ModalFooter className="justify-center">
        <Button
          disabled={loading}
          variant="ghost"
          onClick={onClose}
        >
          {cancelLabel}
        </Button>
        <Button
          loading={loading}
          variant={variant === "danger" ? "error" : "primary"}
          onClick={handleConfirm}
        >
          {confirmLabel}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

// Hook for easier confirmation dialog usage
interface UseConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "danger";
}

export function useConfirm(options: UseConfirmOptions) {
  const [isOpen, setIsOpen] = useState(false);
  const [resolveRef, setResolveRef] = useState<
    ((value: boolean) => void) | null
  >(null);

  const confirm = useCallback((): Promise<boolean> => {
    setIsOpen(true);
    return new Promise((resolve) => {
      setResolveRef(() => resolve);
    });
  }, []);

  const handleConfirm = useCallback(() => {
    resolveRef?.(true);
    setIsOpen(false);
  }, [resolveRef]);

  const handleCancel = useCallback(() => {
    resolveRef?.(false);
    setIsOpen(false);
  }, [resolveRef]);

  const ConfirmDialogComponent = () => (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={handleCancel}
      onConfirm={handleConfirm}
      {...options}
    />
  );

  return { confirm, ConfirmDialog: ConfirmDialogComponent };
}
