import { useMemo } from "react";
import { PermissionSummary } from "./types";

interface PermissionMatrixProps {
  permissions: PermissionSummary[];
  selectedPermissionIds: string[];
  onChange: (nextPermissionIds: string[]) => void;
}

const ACTIONS: Array<{ key: "view" | "add" | "edit" | "delete"; label: string; icon: string }> = [
  { key: "view", label: "View", icon: "🔍" },
  { key: "add", label: "Add", icon: "➕" },
  { key: "edit", label: "Edit", icon: "✏️" },
  { key: "delete", label: "Delete", icon: "🗑️" },
];

export function PermissionMatrix({
  permissions,
  selectedPermissionIds,
  onChange,
}: PermissionMatrixProps) {
  // Parse permissions into components map
  const matrixData = useMemo(() => {
    const compMap: Record<string, Record<string, string>> = {};

    permissions.forEach((p) => {
      if (p.name.includes(":")) {
        const [comp, act] = p.name.split(":");
        if (!compMap[comp]) compMap[comp] = {};
        compMap[comp][act] = p.id;
      }
    });

    return compMap;
  }, [permissions]);

  const components = useMemo(() => Object.keys(matrixData).sort(), [matrixData]);
  const selectedSet = useMemo(() => new Set(selectedPermissionIds), [selectedPermissionIds]);

  const togglePermission = (id: string) => {
    const next = new Set(selectedSet);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onChange(Array.from(next));
  };

  const toggleRow = (comp: string) => {
    const rowIds = Object.values(matrixData[comp] || {});
    const allSelected = rowIds.every((id) => selectedSet.has(id));

    const next = new Set(selectedSet);
    rowIds.forEach((id) => {
      if (allSelected) {
        next.delete(id);
      } else {
        next.add(id);
      }
    });
    onChange(Array.from(next));
  };

  if (components.length === 0) {
    return (
      <div className="p-4 rounded-lg bg-surface border border-border-primary text-xs text-text-tertiary">
        No component permissions registered yet. Start services to auto-seed permissions.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-border-primary rounded-xl bg-surface">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="border-b border-border-primary bg-surface-hover/60">
            <th className="py-2.5 px-3 font-bold text-text-primary capitalize">Component / Module</th>
            {ACTIONS.map((a) => (
              <th key={a.key} className="py-2.5 px-2 font-bold text-text-primary text-center">
                <span className="inline-flex items-center gap-1">
                  <span>{a.icon}</span> {a.label}
                </span>
              </th>
            ))}
            <th className="py-2.5 px-2 font-bold text-text-tertiary text-center">Toggle Row</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle">
          {components.map((comp) => {
            const rowMap = matrixData[comp];
            const rowIds = Object.values(rowMap);
            const isRowFull = rowIds.length > 0 && rowIds.every((id) => selectedSet.has(id));

            return (
              <tr key={comp} className="hover:bg-surface-hover/30 transition-colors">
                <td className="py-2 px-3 font-semibold text-text-primary capitalize">
                  {comp.replace("-", " ")}
                </td>
                {ACTIONS.map((act) => {
                  const permId = rowMap[act.key];
                  if (!permId) {
                    return (
                      <td key={act.key} className="py-2 px-2 text-center text-text-quaternary">
                        —
                      </td>
                    );
                  }
                  const checked = selectedSet.has(permId);
                  return (
                    <td key={act.key} className="py-2 px-2 text-center">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePermission(permId)}
                        className="cursor-pointer accent-primary w-4 h-4 rounded border-border-primary"
                      />
                    </td>
                  );
                })}
                <td className="py-2 px-2 text-center">
                  <button
                    type="button"
                    onClick={() => toggleRow(comp)}
                    className="text-[0.7rem] font-medium text-primary hover:underline"
                  >
                    {isRowFull ? "Deselect" : "Select All"}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
