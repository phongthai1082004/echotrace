"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { cloudinaryUrl } from "@echotrace/shared";
import { Trash2, X } from "lucide-react";
import { SkeletonCardRow } from "@/components/skeleton";
import { useVisibleCards } from "@/lib/use-container-query";
import { apiFetch } from "@/lib/api.fetch";
import { neoBtn, neoBtnPrimary } from "@/lib/styles";
import { AdminHeader } from "@/components/admin-header";
import { useToast } from "@/components/toast";
import { SampleBookDTO } from "@echotrace/shared";

function firstPageThumb(s: SampleBookDTO): string | null {
  return s.thumbnailUrl ?? s.coverUrl ?? null;
}

export default function AdminSampleBooksPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { data: session } = useSession();
  const accessToken = (session as any)?.accessToken;
  const { ref: skeletonRef, visibleCount } = useVisibleCards<HTMLDivElement>(280, 20);

  const [items, setItems] = useState<SampleBookDTO[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<SampleBookDTO | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [publishingId, setPublishingId] = useState<number | null>(null);

  const toggleStatus = async (s: SampleBookDTO) => {
    if (!accessToken) return;
    setPublishingId(s.id);
    const next = s.status === "published" ? "draft" : "published";
    try {
      await apiFetch(`/api/admin/sample-books/${s.id}`, accessToken, { method: "PATCH", body: JSON.stringify({ status: next }) });
      setItems((prev) => prev.map((b) => (b.id === s.id ? { ...b, status: next } : b)));
      showToast(t("admin.sampleBooks.statusUpdated"), "success");
    } catch { showToast(t("admin.sampleBooks.statusUpdateFailed"), "error"); }
    finally { setPublishingId(null); }
  };

  const handleDelete = async () => {
    if (!deleteTarget || !accessToken) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/admin/sample-books/${deleteTarget.id}`, accessToken, { method: "DELETE" });
      setItems((prev) => prev.filter((b) => b.id !== deleteTarget.id));
      setDeleteTarget(null);
      showToast(t("admin.sampleBooks.deleteSuccess"), "success");
    } catch { showToast(t("admin.sampleBooks.deleteFailed"), "error"); }
    finally { setDeleting(false); }
  };

  useEffect(() => {
    if (!accessToken) return;
    setLoading(true);
    setFetchError(null);
    apiFetch<SampleBookDTO[]>("/api/admin/sample-books", accessToken)
      .then(d => setItems(d || []))
      .catch((err) => {
        console.warn("[admin sample-books] fetch failed:", err);
        setFetchError(String(err));
      }).finally(() => setLoading(false));
  }, [accessToken]);

  return (
    <div className="h-screen flex flex-col">
      <AdminHeader label={t("admin.sampleBooks.label")} title={t("admin.sampleBooks.title")}>
        <Link href="/admin/studio" suppressHydrationWarning
          className={`${neoBtnPrimary} font-mono text-[9px] font-bold tracking-widest uppercase px-4 py-2.5 shrink-0`}>
          {t("admin.sampleBooks.addNew")}
        </Link>
      </AdminHeader>

      <div className="flex-1 overflow-y-auto px-8 max-[1600px]:px-6 max-[1440px]:px-5 max-[1280px]:px-4 py-10 max-[1600px]:py-8 max-[1440px]:py-6">
        {fetchError && <p suppressHydrationWarning className="text-[10px] text-red-500 mb-3">{t("admin.sampleBooks.fetchFailed")}</p>}
        {items.length === 0 && !fetchError ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p suppressHydrationWarning className="text-xl font-bold mb-2">{t("customer.myJournals.emptyTitle")}</p>
            <p suppressHydrationWarning className="text-sm mb-6 text-[#999]">{t("customer.myJournals.emptyDesc")}</p>
            <Link href="/admin/studio"
              className={`${neoBtnPrimary} font-mono text-[10px] font-bold tracking-widest uppercase px-6 py-3`}>
              {t("admin.sampleBooks.addNew")}
            </Link>
          </div>
        ) : loading ? (
          <div className="overflow-x-auto -mx-8 px-8 pb-8" style={{ scrollbarWidth: "none" }} ref={skeletonRef}>
            <SkeletonCardRow count={Math.max(visibleCount, 2)} aspect="portrait" />
          </div>
        ) : (
          <div className="overflow-x-auto -mx-8 px-8 pb-8" style={{ scrollbarWidth: "none" }}>
            <div className="flex gap-5" style={{ width: "max-content" }}>
              {items.map((s) => (
                <div key={s.id} className="shrink-0 w-64 group bg-[#FFF7D6] rounded-[10px] border-[3px] border-[#222] shadow-[4px_4px_0_#222] overflow-hidden hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#222] transition-all">
                  <Link href={`/admin/studio?id=${s.id}`} className="block">
                    <div className="relative overflow-hidden bg-[#e8e6e0] aspect-[3/4]">
                      {firstPageThumb(s) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={cloudinaryUrl(firstPageThumb(s)!)} alt={s.name ?? ""} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span suppressHydrationWarning className="font-mono text-[9px] font-bold tracking-widest uppercase text-[#999]">{t("customer.myJournals.noCover")}</span>
                        </div>
                      )}
                      <div className="absolute top-2 left-2">
                        <span
                          className={`font-mono text-[8px] font-bold tracking-widest uppercase px-2 py-1 rounded-md border-2 border-[#222] ${
                            s.status === "published" ? "bg-[#2e7d32] text-white" : "bg-[#FFF7D6] text-[#666]"
                          }`}>
                          {s.status === "published" ? t("admin.sampleBooks.published") : t("admin.sampleBooks.draft")}
                        </span>
                      </div>
                      <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteTarget(s); }}
                        className="absolute top-2 right-2 p-1.5 bg-[#B54843] text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#943a36] cursor-pointer z-10">
                        <Trash2 size={14} />
                      </button>
                      <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleStatus(s); }} disabled={publishingId === s.id}
                        className="absolute bottom-2 right-2 font-mono text-[8px] font-bold tracking-widest uppercase px-2.5 py-1.5 rounded-md border-2 border-[#222] opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-40 cursor-pointer z-10 bg-[#222] text-white hover:bg-[#FFF7D6] hover:text-[#222]">
                        {publishingId === s.id ? t("common.loading") : s.status === "published" ? t("admin.sampleBooks.moveToDraft") : t("admin.sampleBooks.publish")}
                      </button>
                    </div>
                    <div className="p-4 border-t-[3px] border-[#222]">
                      <h3 className="text-lg font-bold mb-1 leading-tight">{s.name || "Untitled"}</h3>
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="font-mono text-[9px] font-bold tracking-widest uppercase text-[#999]">{s.type}</span>
                        <span className="text-[#222]">·</span>
                        <span suppressHydrationWarning className="font-mono text-[9px] font-bold text-[#999]">{s.pageCount} {t("customer.myJournals.pg")}</span>
                      </div>
                      <p className="font-mono text-[9px] font-bold text-[#999]">{s.createdAt?.slice(0, 10)}</p>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center" onClick={() => !deleting && setDeleteTarget(null)}>
          <div className="bg-[#F8F2E5] rounded-[10px] border-[3px] border-[#222] shadow-[4px_4px_0_#222] w-80 p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <p suppressHydrationWarning className="font-bold text-lg">{t("admin.sampleBooks.deleteTitle")}</p>
              <button onClick={() => setDeleteTarget(null)} disabled={deleting} className="p-1.5 hover:bg-[#e8e6e0] rounded-lg border-2 border-[#222]"><X size={16} /></button>
            </div>
            <p suppressHydrationWarning className="text-sm text-[#666] mb-5">
              {t("admin.sampleBooks.deleteConfirm", { title: deleteTarget.name || "Untitled" })}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} disabled={deleting}
                className={`${neoBtn} flex-1 font-mono text-[9px] font-bold tracking-widest uppercase px-4 py-2.5 disabled:opacity-40`}>
                {t("common.cancel")}
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className={`${neoBtnPrimary} flex-1 font-mono text-[9px] font-bold tracking-widest uppercase px-4 py-2.5 bg-[#B54843] border-[#B54843] shadow-[2px_2px_0_#B54843] disabled:opacity-40`}>
                {deleting ? t("admin.sampleBooks.deleting") : t("admin.sampleBooks.delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}