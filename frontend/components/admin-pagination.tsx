"use client";

interface Props {
  page: number;
  totalPages: number;
  total: number;
  perPage: number;
  onPageChange: (p: number) => void;
}

export function AdminPagination({ page, totalPages, total, perPage, onPageChange }: Props) {
  return (
    <div className="px-6 py-3 border-t-[3px] border-[#222] flex items-center justify-between bg-[#FFF7D6] shrink-0">
      <p className="font-mono text-[9px] font-bold text-[#666]">
        Showing {total === 0 ? 0 : page * perPage + 1}–{Math.min((page + 1) * perPage, total)} of {total}
      </p>
      <div className="flex gap-2">
        <button onClick={() => onPageChange(Math.max(0, page - 1))} disabled={page === 0}
          className="font-mono text-[9px] font-bold tracking-widest uppercase px-3 py-1.5 rounded-md border-2 transition-[border-color,color,background-color] disabled:border-[#ccc] disabled:text-[#ccc] enabled:border-[#222] enabled:text-[#666] enabled:hover:bg-[#e8e6e0]">
          Previous
        </button>
        <button onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}
          className="font-mono text-[9px] font-bold tracking-widest uppercase px-3 py-1.5 rounded-md border-2 transition-[border-color,color,background-color] disabled:border-[#ccc] disabled:text-[#ccc] enabled:border-[#222] enabled:text-[#666] enabled:hover:bg-[#e8e6e0]">
          Next
        </button>
      </div>
    </div>
  );
}
