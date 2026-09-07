import { Button, Modal, ModalFooter, cn } from "@packages/ui";
import { Check, Folder, FolderInput, Inbox } from "lucide-react";
import { useMemo, useState } from "react";

import type { DatasetItem } from "./types";
import type { DataFolder } from "@/lib/datasets";

interface Props {
  datasets: DatasetItem[];
  folders: DataFolder[];
  moving: boolean;
  onClose: () => void;
  /** Move selected datasets; `null` = ungrouped (root level). */
  onMove: (folderId: string | null) => void;
}

interface FlatNode extends DataFolder {
  depth: number;
}

function flattenFolders(folders: DataFolder[]): FlatNode[] {
  const withDepth: FlatNode[] = folders.map((f) => ({ ...f, depth: 0 }));
  const byId = new Map(withDepth.map((f) => [f.id, f]));
  withDepth.forEach((node) => {
    let d = 0;
    let cursor = node;
    while (cursor.parent_id && byId.has(cursor.parent_id) && d < 20) {
      cursor = byId.get(cursor.parent_id)!;
      d += 1;
    }
    node.depth = d;
  });
  return withDepth.sort(
    (a, b) => a.depth - b.depth || a.name.localeCompare(b.name),
  );
}

/**
 * "Move to folder" picker: a nested (indented) list of real folders plus
 * the ungrouped destination. Works for single or bulk moves.
 */
export default function MoveModal({
  datasets,
  folders,
  moving,
  onClose,
  onMove,
}: Props) {
  const [target, setTarget] = useState<string | null | undefined>(undefined);
  const flat = useMemo(() => flattenFolders(folders), [folders]);
  const many = datasets.length > 1;

  return (
    <Modal
      isOpen
      size="sm"
      title={
        many
          ? `Move ${datasets.length} datasets to…`
          : `Move "${datasets[0]?.name ?? "dataset"}" to…`
      }
      onClose={onClose}
    >
      <div className="flex flex-col gap-1 max-h-[50vh] overflow-y-auto scrollbar-thin pr-1">
        {/* Ungrouped destination */}
        <button
          type="button"
          className={cn(
            "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium cursor-pointer transition-colors",
            target === null
              ? "bg-primary/[0.1] text-primary"
              : "text-text-secondary hover:bg-surface-hover",
          )}
          onClick={() => setTarget(null)}
        >
          <Inbox
            className={target === null ? "text-primary" : "text-text-tertiary"}
            size={14}
          />
          <span className="flex-1 truncate">Ungrouped (All Data)</span>
          {target === null && <Check className="text-primary shrink-0" size={13} />}
        </button>

        {flat.length === 0 && (
          <p className="px-2.5 py-2 text-xs text-text-tertiary leading-relaxed">
            No folders yet - create one from the Folders panel in the sidebar.
          </p>
        )}

        {flat.map((f) => (
          <button
            key={f.id}
            style={{ paddingLeft: `${10 + f.depth * 16}px` }}
            type="button"
            className={cn(
              "flex w-full items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium cursor-pointer transition-colors",
              target === f.id
                ? "bg-primary/[0.1] text-primary"
                : "text-text-secondary hover:bg-surface-hover",
            )}
            onClick={() => setTarget(f.id)}
          >
            {f.depth > 0 && (
              <span className="text-text-tertiary shrink-0 select-none">└</span>
            )}
            <Folder
              className={target === f.id ? "text-primary" : "text-secondary shrink-0"}
              size={14}
            />
            <span className="flex-1 truncate">{f.name}</span>
            <span className="shrink-0 text-[0.62rem] tabular-nums text-text-tertiary">
              {f.dataset_count}
            </span>
            {target === f.id && <Check className="text-primary shrink-0" size={13} />}
          </button>
        ))}
      </div>

      <ModalFooter>
        <Button disabled={moving} variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          disabled={target === undefined}
          leftIcon={<FolderInput size={15} />}
          loading={moving}
          loadingText="Moving…"
          variant="primary"
          onClick={() => {
            if (target !== undefined) onMove(target);
          }}
        >
          Move {many ? `${datasets.length} datasets` : "here"}
        </Button>
      </ModalFooter>
    </Modal>
  );
}