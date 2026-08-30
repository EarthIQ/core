import { Dropdown, IconButton } from "@packages/ui";
import {
  Download,
  Eye,
  Map,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { isVectorized } from "./helpers";
import type { DatasetItem } from "./types";

interface Props {
  d: DatasetItem;
  onInspect: (ds: DatasetItem) => void;
  onEdit: (ds: DatasetItem) => void;
  onDownload: (ds: DatasetItem) => void;
  onOpenTileUrl: (ds: DatasetItem) => void;
  onRequestDelete: (id: string, name: string) => void;
}

/**
 * Compact per-row action menu (UI Dropdown + lucide icons).
 * Replaces the previous row of 5–6 inline buttons.
 */
export default function RowActions({
  d,
  onInspect,
  onEdit,
  onDownload,
  onOpenTileUrl,
  onRequestDelete,
}: Props) {
  const items = [
    {
      key: "inspect",
      label: "Inspect & Preview",
      icon: <Eye size={16} />,
      onClick: () => onInspect(d),
    },
    {
      key: "edit",
      label: "Edit metadata",
      icon: <Pencil size={16} />,
      onClick: () => onEdit(d),
    },
    {
      key: "download",
      label: "Download",
      icon: <Download size={16} />,
      onClick: () => onDownload(d),
    },
    ...(isVectorized(d)
      ? [
          {
            key: "tiles",
            label: "MVT tile URL",
            icon: <Map size={16} />,
            onClick: () => onOpenTileUrl(d),
          },
        ]
      : []),
    { key: "sep", label: "", divider: true, onClick: () => {} },
    {
      key: "delete",
      label: "Delete",
      icon: <Trash2 size={16} />,
      danger: true,
      onClick: () => onRequestDelete(d.id, d.name),
    },
  ];

  return (
    <Dropdown
      placement="bottom-end"
      trigger={
        <IconButton
          icon={<MoreHorizontal size={16} />}
          label={`Actions for ${d.name}`}
          variant="ghost"
          size="sm"
        />
      }
      items={items}
    />
  );
}
