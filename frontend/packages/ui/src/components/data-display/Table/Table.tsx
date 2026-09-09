import React, { type ReactNode } from "react";

import { cn } from "../../../utils/cn";
import { Skeleton } from "../../feedback/Skeleton/Skeleton";
import { Checkbox } from "../../primitives/Checkbox/Checkbox";

// =========================================
// Types
// =========================================
interface Column<T> {
  key: string;
  title: ReactNode;
  dataIndex?: keyof T;
  render?: (value: any, record: T, index: number) => ReactNode;
  width?: string | number;
  align?: "left" | "center" | "right";
  sortable?: boolean;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: keyof T | ((record: T) => string);
  loading?: boolean;
  selectable?: boolean;
  selectedRows?: string[];
  onSelectChange?: (selectedKeys: string[]) => void;
  onRowClick?: (record: T) => void;
  emptyText?: ReactNode;
  className?: string;
  striped?: boolean;
  hoverable?: boolean;
}

// =========================================
// Sub-components
// =========================================
const TableHeader = ({
  children,
  align,
  width,
}: {
  children: ReactNode;
  align?: Column<any>["align"];
  width?: string | number;
}) => (
  <th
    className={cn(
      "px-4 py-3 text-left text-xs font-semibold tracking-wider uppercase",
      align === "center" && "text-center",
      align === "right" && "text-right"
    )}
    style={{
      width,
      color: "var(--text-secondary)",
      borderBottom: "1px solid var(--border-primary)",
    }}
  >
    {children}
  </th>
);

const TableCell = ({
  children,
  align,
  className,
  onClick,
}: {
  children: ReactNode;
  align?: Column<any>["align"];
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLTableCellElement>) => void;
}) => (
  <td
    style={{ color: "var(--text-secondary)" }}
    className={cn(
      "px-4 py-3 text-sm",
      align === "center" && "text-center",
      align === "right" && "text-right",
      className
    )}
    onClick={onClick}
  >
    {children}
  </td>
);

const EmptyRow = ({
  colSpan,
  emptyText,
}: {
  colSpan: number;
  emptyText: ReactNode;
}) => (
  <tr>
    <td
      className="px-4 py-16 text-center text-sm"
      colSpan={colSpan}
      style={{ color: "var(--text-tertiary)" }}
    >
      {emptyText}
    </td>
  </tr>
);

const SkeletonRows = ({
  count,
  columnCount,
  selectable,
}: {
  count: number;
  columnCount: number;
  selectable: boolean;
}) => (
  <>
    {Array.from({ length: count }).map((_, index) => (
      <tr
        key={index}
        style={{ borderBottom: "1px solid var(--border-secondary)" }}
      >
        {selectable ? (
          <td className="px-4 py-3">
            <Skeleton
              height={16}
              variant="rounded"
              width={16}
            />
          </td>
        ) : null}
        {Array.from({ length: columnCount }).map((_, colIndex) => (
          <td
            key={colIndex}
            className="px-4 py-3"
          >
            <Skeleton height={14} />
          </td>
        ))}
      </tr>
    ))}
  </>
);

// =========================================
// Main Component
// =========================================
export const Table = <T extends Record<string, any>>({
  columns,
  data,
  rowKey,
  loading = false,
  selectable = false,
  selectedRows = [],
  onSelectChange,
  onRowClick,
  emptyText = "No data",
  className,
  striped = false,
  hoverable = true,
}: TableProps<T>) => {
  // ---- Helpers ----
  const getRowKey = (record: T): string => {
    if (typeof rowKey === "function") return rowKey(record);
    return String(record[rowKey]);
  };

  const allSelected = data.length > 0 && selectedRows.length === data.length;
  const someSelected =
    selectedRows.length > 0 && selectedRows.length < data.length;

  // ---- Handlers ----
  const handleSelectAll = () => {
    if (allSelected) {
      onSelectChange?.([]);
    } else {
      onSelectChange?.(data.map(getRowKey));
    }
  };

  const handleSelectRow = (key: string) => {
    if (selectedRows.includes(key)) {
      onSelectChange?.(selectedRows.filter((k) => k !== key));
    } else {
      onSelectChange?.([...selectedRows, key]);
    }
  };

  return (
    <div
      className={cn("w-full overflow-auto rounded-xl", className)}
      style={{
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border-primary)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <table className="w-full border-collapse">
        {/* ---- Head ---- */}
        <thead>
          <tr style={{ backgroundColor: "var(--bg-tertiary)" }}>
            {selectable ? (
              <th
                className="w-12 px-4 py-3"
                style={{ borderBottom: "1px solid var(--border-primary)" }}
              >
                <Checkbox
                  checked={allSelected}
                  indeterminate={someSelected}
                  onChange={handleSelectAll}
                />
              </th>
            ) : null}
            {columns.map((column) => (
              <TableHeader
                key={column.key}
                align={column.align}
                width={column.width}
              >
                {column.title}
              </TableHeader>
            ))}
          </tr>
        </thead>

        {/* ---- Body ---- */}
        <tbody>
          {loading ? (
            <SkeletonRows
              columnCount={columns.length}
              count={5}
              selectable={selectable}
            />
          ) : data.length === 0 ? (
            <EmptyRow
              colSpan={columns.length + (selectable ? 1 : 0)}
              emptyText={emptyText}
            />
          ) : (
            data.map((record, index) => {
              const key = getRowKey(record);
              const isSelected = selectedRows.includes(key);
              const isEvenStripe = striped && index % 2 === 1;

              return (
                <tr
                  key={key}
                  className={cn(
                    "transition-colors duration-150",
                    hoverable && onRowClick && "cursor-pointer"
                  )}
                  style={{
                    borderBottom: "1px solid var(--border-secondary)",
                    backgroundColor: isSelected
                      ? "color-mix(in oklch, var(--primary) 8%, transparent)"
                      : isEvenStripe
                        ? "var(--bg-tertiary)"
                        : "transparent",
                  }}
                  onClick={() => onRowClick?.(record)}
                  onMouseEnter={(e) => {
                    if (hoverable) {
                      e.currentTarget.style.backgroundColor = isSelected
                        ? "color-mix(in oklch, var(--primary) 12%, transparent)"
                        : "var(--surface-hover)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = isSelected
                      ? "color-mix(in oklch, var(--primary) 8%, transparent)"
                      : isEvenStripe
                        ? "var(--bg-tertiary)"
                        : "transparent";
                  }}
                >
                  {selectable ? (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onChange={() => handleSelectRow(key)}
                      />
                    </TableCell>
                  ) : null}
                  {columns.map((column) => {
                    const value = column.dataIndex
                      ? record[column.dataIndex]
                      : undefined;
                    const content = column.render
                      ? column.render(value, record, index)
                      : value;

                    return (
                      <TableCell
                        key={column.key}
                        align={column.align}
                      >
                        {content}
                      </TableCell>
                    );
                  })}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};
