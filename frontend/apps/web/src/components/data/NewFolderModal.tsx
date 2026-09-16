import { Button, Input, Modal, ModalFooter } from "@packages/ui";
import { Check, FolderPlus } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface Props {
  title: string;
  description?: string;
  confirmLabel: string;
  /** Pre-filled value (used for rename). */
  initialValue?: string;
  creating?: boolean;
  onClose: () => void;
  onConfirm: (name: string) => void;
}

/**
 * Small modal for creating or renaming a folder (Enter confirms, Escape
 * cancels). Reused for both the "New folder" command and folder rename.
 */
export default function NewFolderModal({
  title,
  description,
  confirmLabel,
  initialValue = "",
  creating,
  onClose,
  onConfirm,
}: Props) {
  const [name, setName] = useState(initialValue);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = window.setTimeout(() => ref.current?.select?.(), 60);
    return () => window.clearTimeout(t);
  }, []);

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed || creating) return;
    onConfirm(trimmed);
  };

  return (
    <Modal
      isOpen
      description={description}
      size="sm"
      title={title}
      onClose={() => !creating && onClose()}
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Input
          aria-label="Folder name"
          label="Folder name"
          placeholder="e.g. Hydrology"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
        />
        <ModalFooter>
          <Button
            disabled={creating}
            variant="ghost"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            disabled={!name.trim()}
            loading={creating}
            loadingText="Working…"
            type="submit"
            leftIcon={
              title.toLowerCase().includes("rename") ? (
                <Check size={16} />
              ) : (
                <FolderPlus size={16} />
              )
            }
          >
            {confirmLabel}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
