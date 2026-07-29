import { Avatar } from "./Avatar";
import { RoleSelect } from "./RoleSelect";
import type { AccessEntry, Role } from "./types";

interface PersonRowProps {
  entry: AccessEntry;
  canManage: boolean;
  busy?: boolean;
  onRoleChange: (role: Role) => void;
  onRemove: () => void;
  onTransferOwnership: () => void;
}

export function PersonRow({
  entry,
  canManage,
  busy,
  onRoleChange,
  onRemove,
  onTransferOwnership,
}: PersonRowProps) {
  return (
    <div
      className={`flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-surface-hover/60 transition-colors ${
        busy ? "opacity-60 pointer-events-none" : ""
      }`}
    >
      <Avatar
        email={entry.email}
        name={entry.name}
        src={entry.avatarUrl}
        size={32}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[0.82rem] font-medium text-text-primary truncate">
            {entry.name ?? entry.email}
            {entry.isYou && (
              <span className="text-text-tertiary font-normal"> (you)</span>
            )}
          </span>
          {entry.pending && (
            <span className="text-[0.6rem] px-1.5 py-0.5 rounded-full bg-warning/15 text-warning border border-warning/25 shrink-0">
              Pending
            </span>
          )}
        </div>
        <div className="text-[0.7rem] text-text-tertiary truncate">
          {entry.email}
        </div>
      </div>

      <RoleSelect
        value={entry.role}
        onChange={onRoleChange}
        disabled={!canManage || entry.isYou}
        onRemove={canManage && !entry.isYou ? onRemove : undefined}
        onTransferOwnership={
          canManage && !entry.isYou && entry.role !== "owner" && !entry.pending
            ? onTransferOwnership
            : undefined
        }
      />
    </div>
  );
}
