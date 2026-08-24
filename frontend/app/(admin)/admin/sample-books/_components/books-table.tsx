"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Eye, Pencil, PenTool } from "lucide-react";
import { SampleBookDTO } from "@echotrace/shared";
import { chip, neoBtn } from "@/lib/styles";
import { AdminList } from "@/components/admin-list";
import { AdminPagination } from "@/components/admin-pagination";
import { EmptyStateMinimal } from "@/components/ui/empty-state";

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-[#e8e6e0] text-[#666]",
  published: "bg-[#1565c0] text-white",
  archive: "bg-[#FFD93D] text-[#222]",
};

export function BooksTable({
  items,
  loading,
  fetchError,
  hasNext,
  hasPrevious,
  onNext,
  onPrevious,
  onEdit,
}: {
  items: SampleBookDTO[];
  loading: boolean;
  fetchError: string | null;
  hasNext: boolean;
  hasPrevious: boolean;
  onNext: () => void;
  onPrevious: () => void;
  onEdit: (s: SampleBookDTO) => void;
}) {
  const { t } = useTranslation();

  const studioHref = (s: SampleBookDTO) =>
    s.paperWidth && s.paperHeight
      ? `/admin/studio?id=${s.id}&w=${s.paperWidth * 4}&h=${s.paperHeight * 4}`
      : `/admin/studio?id=${s.id}`;

  return (
    <AdminList
      columns={[
        { key: "name", label: t("admin.sampleBooks.name"), width: "2fr" },
        { key: "type", label: t("admin.sampleBooks.type"), width: "0.7fr", align: "center" },
        { key: "category", label: t("admin.sampleBooks.category"), width: "0.9fr", align: "center" },
        { key: "quantity", label: t("admin.sampleBooks.quantity"), width: "0.5fr" },
        { key: "pages", label: t("admin.sampleBooks.pages"), width: "0.5fr" },
        { key: "status", label: t("admin.sampleBooks.status"), width: "110px", align: "center" },
        { key: "action", label: t("common.action"), width: "140px", align: "center" },
      ]}
      data={items}
      loading={loading}
      rowKey={(s) => s.id}
      empty={
        fetchError ? (
          <EmptyStateMinimal title={t("admin.sampleBooks.fetchFailed")} />
        ) : (
          <EmptyStateMinimal title={t("admin.sampleBooks.noItems")} />
        )
      }
      footer={
        <AdminPagination hasNext={hasNext} hasPrevious={hasPrevious} onNext={onNext} onPrevious={onPrevious} />
      }
      renderRow={(s: SampleBookDTO) => (
        <>
          <div className="px-2 text-sm font-bold whitespace-nowrap min-w-0 truncate">{s.name || "Untitled"}</div>
          <div className="px-2 flex justify-center">
            <span className={`${chip} ${s.type === "ALBUM" ? "bg-[#FFD93D] text-[#222]" : "bg-[#e8e6e0] text-[#444]"}`}>
              {t(`admin.sampleBooks.${s.type === "ALBUM" ? "kindAlbum" : "kindTemplate"}`)}
            </span>
          </div>
          <div className="px-2 flex justify-center">
            <span className={`${chip} bg-[#FFF7D6] text-[#222]`}>{s.category ?? "—"}</span>
          </div>
          <div className="px-2 font-mono text-[9px] font-bold text-[#666] whitespace-nowrap">{s.quantity ?? "—"}</div>
          <div className="px-2 font-mono text-[9px] font-bold text-[#666] whitespace-nowrap">
            {s.pageCount} {t("admin.sampleBooks.pg")}
          </div>
          <div className="px-2 flex justify-center">
            <span className={`${chip} inline-flex items-center gap-1 ${STATUS_STYLE[s.status] ?? STATUS_STYLE.draft}`}>
              {t(`admin.sampleBooks.${s.status}`)}
            </span>
          </div>
          <div className="px-2 flex items-center justify-center gap-1.5">
            <Link
              href={studioHref(s)}
              title={s.status === "published" ? t("admin.sampleBooks.publishedLocked") : t("admin.sampleBooks.edit")}
              className={`${neoBtn} p-1.5 ${s.status === "published" ? "opacity-40 pointer-events-none" : ""}`}
            >
              <PenTool size={14} />
            </Link>
            {s.status === "published" ? (
              <Link href={`/studio/preview?id=${s.id}`} title={t("admin.sampleBooks.preview")} className={`${neoBtn} p-1.5`}>
                <Eye size={14} />
              </Link>
            ) : (
              <button
                disabled
                title={t("admin.sampleBooks.preview")}
                className={`${neoBtn} p-1.5 opacity-30 cursor-not-allowed`}
              >
                <Eye size={14} />
              </button>
            )}
            <button onClick={() => onEdit(s)} title={t("admin.sampleBooks.editInfo")} className={`${neoBtn} p-1.5`}>
              <Pencil size={14} />
            </button>
          </div>
        </>
      )}
    />
  );
}
