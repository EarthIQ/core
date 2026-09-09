import { useMemo } from "react";

import { type PermissionSummary } from "./types";

interface PermissionMatrixProps {
  permissions: PermissionSummary[];
  selectedPermissionIds: string[];
  onChange: (nextPermissionIds: string[]) => void;
}

const ACTIONS: Array<{
  key: "view" | "add" | "edit" | "delete";
  label: string;
  icon: string;
}> = [
  { key: "view", label: "View", icon: "🔍" },
  { key: "add", label: "Add", icon: "➕" },
  { key: "edit", label: "Edit", icon: "✏️" },
  { key: "delete", label: "Delete", icon: "🗑️" },
];

export const PermissionMatrix = ({
  permissions,
  selectedPermissionIds,
  onChange,
}: PermissionMatrixProps) => {
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

  const components = useMemo(
    () => Object.keys(matrixData).sort(),
    [matrixData]
  );
  const selectedSet = useMemo(
    () => new Set(selectedPermissionIds),
    [selectedPermissionIds]
  );

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
      <div className="bg-surface border-border-primary text-text-tertiary rounded-lg border p-4 text-xs">
        No component permissions registered yet. Start services to auto-seed
        permissions.
      </div>
    );
  }

  return (
    <div className="border-border-primary bg-surface overflow-x-auto rounded-xl border">
      <table className="w-full border-collapse text-left text-xs">
        <thead>
          <tr className="border-border-primary bg-surface-hover/60 border-b">
            <th className="text-text-primary px-3 py-2.5 font-bold capitalize">
              Component / Module
            </th>
            {ACTIONS.map((a) => (
              <th
                key={a.key}
                className="text-text-primary px-2 py-2.5 text-center font-bold"
              >
                <span className="inline-flex items-center gap-1">
                  <span>{a.icon}</span> {a.label}
                </span>
              </th>
            ))}
            <th className="text-text-tertiary px-2 py-2.5 text-center font-bold">
              Toggle Row
            </th>
          </tr>
        </thead>
        <tbody className="divide-border-subtle divide-y">
          {components.map((comp) => {
            const rowMap = matrixData[comp];
            const rowIds = Object.values(rowMap);
            const isRowFull =
              rowIds.length > 0 && rowIds.every((id) => selectedSet.has(id));

            return (
              <tr
                key={comp}
                className="hover:bg-surface-hover/30 transition-colors"
              >
                <td className="text-text-primary px-3 py-2 font-semibold capitalize">
                  {comp.replace("-", " ")}
                </td>
                {ACTIONS.map((act) => {
                  const permId = rowMap[act.key];
                  if (!permId) {
                    return (
                      <td
                        key={act.key}
                        className="text-text-quaternary px-2 py-2 text-center"
                      >
                        -
                      </td>
                    );
                  }
                  const checked = selectedSet.has(permId);
                  return (
                    <td
                      key={act.key}
                      className="px-2 py-2 text-center"
                    >
                      <input
                        checked={checked}
                        className="accent-primary border-border-primary h-4 w-4 cursor-pointer rounded"
                        type="checkbox"
                        onChange={() => togglePermission(permId)}
                      />
                    </td>
                  );
                })}
                <td className="px-2 py-2 text-center">
                  <button
                    className="text-primary text-[0.7rem] font-medium hover:underline"
                    type="button"
                    onClick={() => toggleRow(comp)}
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
};
