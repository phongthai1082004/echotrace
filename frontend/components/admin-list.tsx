import type { ReactNode } from "react";
import Link from "next/link";
import { label } from "@/lib/styles";
import { ResponsiveTable } from "@/components/responsive-table";
import { TableSkeletonRow } from "@/components/ui/loading-skeleton";

export interface AdminListColumn {
  key: string;
  label: string;
  width: string;
  align?: "left" | "center";
}

interface AdminListProps<T> {
  columns: AdminListColumn[];
  data: T[];
  loading?: boolean;
  skeletonRows?: number;
  rowKey: (row: T, index: number) => string | number;
  renderRow: (row: T) => ReactNode;
  empty?: ReactNode;
  footer?: ReactNode;
  rowHref?: (row: T) => string;
  onRowClick?: (row: T) => void;
  rowClassName?: string;
}

export function AdminList<T>({
  columns,
  data,
  loading,
  skeletonRows = 8,
  rowKey,
  renderRow,
  empty,
  footer,
  rowHref,
  onRowClick,
  rowClassName = "hover:bg-[#e8e6e0]",
}: AdminListProps<T>) {
  const gridCols = columns.map((c) => c.width).join(" ");

  if (loading) {
    return (
      <div className="shrink-0 border-b-[3px] border-[#222]">
        {Array.from({ length: skeletonRows }).map((_, i) => (
          <TableSkeletonRow key={i} columns={columns.length} animated />
        ))}
      </div>
    );
  }

  const rowClasses = `grid transition-colors border-b-[2px] border-[#222]/10 items-center py-3 ${rowClassName}`;
  const rowStyle = { gridTemplateColumns: gridCols };

  return (
    <>
      <ResponsiveTable
        header={
          <div className="grid shrink-0 border-b-[3px] border-[#222]" style={{ gridTemplateColumns: gridCols }}>
            {columns.map((c) => (
              <div key={c.key} className={`px-2 py-3 ${label} text-[#666] whitespace-nowrap ${c.align === "center" ? "text-center" : ""}`}>
                {c.label}
              </div>
            ))}
          </div>
        }
        gridCols={gridCols}
      >
        {data.length === 0 ? (
          empty ?? (
            <div className="py-10 text-center">
              <p className="font-bold text-[#999]">&nbsp;</p>
            </div>
          )
        ) : (
          data.map((row, i) => {
            const content = renderRow(row);
            const key = rowKey(row, i);
            if (rowHref) {
              return (
                <Link key={key} href={rowHref(row)} className={rowClasses} style={rowStyle}>
                  {content}
                </Link>
              );
            }
            return (
              <div key={key} className={rowClasses} style={rowStyle} onClick={onRowClick ? () => onRowClick(row) : undefined}>
                {content}
              </div>
            );
          })
        )}
      </ResponsiveTable>
      {footer}
    </>
  );
}