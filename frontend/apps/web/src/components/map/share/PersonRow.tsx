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

export const PersonRow = ({
  entry,
  canManage,
  busy,
  onRoleChange,
  onRemove,
  onTransferOwnership,
}: PersonRowProps) => {
  return (
    <div
      className={`hover:bg-surface-hover/60 flex items-center gap-3 rounded-lg px-2 py-2 transition-colors ${
        busy ? "pointer-events-none opacity-60" : ""
      }`}
    >
      <Avatar
        email={entry.email}
        name={entry.name}
        size={32}
        src={entry.avatarUrl}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-text-primary truncate text-[0.82rem] font-medium">
            {entry.name ?? entry.email}
            {entry.isYou ? (
              <span className="text-text-tertiary font-normal"> (you)</span>
            ) : null}
          </span>
          {entry.pending ? (
            <span className="bg-warning/15 text-warning border-warning/25 shrink-0 rounded-full border px-1.5 py-0.5 text-[0.6rem]">
              Pending
            </span>
          ) : null}
        </div>
        <div className="text-text-tertiary truncate text-[0.7rem]">
          {entry.email}
        </div>
      </div>

      <RoleSelect
        disabled={!canManage || entry.isYou}
        value={entry.role}
        onChange={onRoleChange}
        onRemove={canManage && !entry.isYou ? onRemove : undefined}
        onTransferOwnership={
          canManage && !entry.isYou && entry.role !== "owner" && !entry.pending
            ? onTransferOwnership
            : undefined
        }
      />
    </div>
  );
};
