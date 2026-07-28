"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { cloudinaryUrl } from "@/lib/cloudinary";
import { SkeletonCardRow } from "@/components/skeleton";
import { useVisibleCards } from "@/lib/use-container-query";

interface JournalBook {
  id: number; title: string; coverUrl: string | null; pages: number; style: string;
  cover: string; status: string; createdAt: string;
}

const statusBg: Record<string, string> = { DRAFT: "#FFF7D6", PUBLISHED: "#5A8F4A", ARCHIVED: "#999" };
const statusText: Record<string, string> = { DRAFT: "#222", PUBLISHED: "#fff", ARCHIVED: "#fff" };

export default function MyJournalsPage() {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const accessToken = (session as any)?.accessToken;
  const { ref: skeletonRef, visibleCount } = useVisibleCards<HTMLDivElement>(280, 20);

  const [journals, setJournals] = useState<JournalBook[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<JournalBook | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteTarget || !accessToken) return;
    setDeleting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/books/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error("Delete failed");
      setJournals((prev) => prev.filter((b) => b.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch { } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    if (!accessToken) return;
    setLoading(true);
    setFetchError(null);
    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user/my-books`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }).then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status} ${r.statusText}`);
      return r.json();
    }).then(d => {
      setJournals(d.data || []);
    }).catch((err) => {
      console.warn("[my-journals] fetch failed:", err);
      setFetchError(String(err));
    }).finally(() => setLoading(false));
  }, [accessToken]);

  return (
    <div className="min-h-screen pt-15">
      <div className="px-8 max-[1600px]:px-6 max-[1440px]:px-5 max-[1280px]:px-4 py-10 max-[1600px]:py-8 max-[1440px]:py-6 flex items-end justify-between border-b-[3px] border-[#222]">
        <div>
          <h1 className="text-3xl max-[1600px]:text-2xl max-[1440px]:text-xl max-[1280px]:text-lg font-bold" suppressHydrationWarning>{t("customer.myJournals.title")}</h1>
          <p className="text-sm mt-1 text-[#666]" suppressHydrationWarning>{t("customer.myJournals.subtitle")}</p>
        </div>
        <Link href="/studio" suppressHydrationWarning
          className="font-mono text-[10px] font-bold tracking-widest uppercase px-5 py-3 bg-[#222] text-white rounded-[10px] border-[3px] border-[#222] shadow-[4px_4px_0_#222] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#222] transition-all shrink-0">
          {t("customer.myJournals.newJournal")}
        </Link>
      </div>

      <div className="px-8 max-[1600px]:px-6 max-[1440px]:px-5 max-[1280px]:px-4 py-10 max-[1600px]:py-8 max-[1440px]:py-6">
        <p suppressHydrationWarning className="font-mono text-[9px] font-bold tracking-widest uppercase mb-5 text-[#666]">{t("customer.myJournals.history")}</p>
        {fetchError && <p suppressHydrationWarning className="text-[10px] text-red-500 mb-3">{t("customer.myJournals.error", { message: fetchError })}</p>}
        {journals.length === 0 && !fetchError ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p suppressHydrationWarning className="text-xl font-bold mb-2">{t("customer.myJournals.emptyTitle")}</p>
            <p suppressHydrationWarning className="text-sm mb-6 text-[#999]">{t("customer.myJournals.emptyDesc")}</p>
            <Link href="/studio"
              className="font-mono text-[10px] font-bold tracking-widest uppercase px-6 py-3 bg-[#222] text-white rounded-[10px] border-[3px] border-[#222] shadow-[4px_4px_0_#222] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#222] transition-all">
              {t("customer.myJournals.openStudio")}
            </Link>
          </div>
        ) : loading ? (
          <div className="overflow-x-auto -mx-8 px-8 pb-8" style={{ scrollbarWidth: "none" }} ref={skeletonRef}>
            <SkeletonCardRow count={Math.max(visibleCount, 2)} aspect="portrait" />
          </div>
        ) : (
          <div className="overflow-x-auto -mx-8 px-8 pb-8" style={{ scrollbarWidth: "none" }}>
            <div className="flex gap-5" style={{ width: "max-content" }}>
              {journals.map((j) => (
                  <div key={j.id} className="shrink-0 w-64 group bg-[#FFF7D6] rounded-[10px] border-[3px] border-[#222] shadow-[4px_4px_0_#222] overflow-hidden hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#222] transition-all">
                  <Link href={`/studio?id=${j.id}`} className="block">
                  <div className="relative overflow-hidden bg-[#e8e6e0] aspect-[3/4]">
                    {j.coverUrl ? (
                      <img src={j.coverUrl.startsWith("data:") ? j.coverUrl : cloudinaryUrl(j.coverUrl)} alt={j.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span suppressHydrationWarning className="font-mono text-[9px] font-bold tracking-widest uppercase text-[#999]">{t("customer.myJournals.noCover")}</span>
                      </div>
                    )}
                    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteTarget(j); }}
                      className="absolute top-2 right-2 p-1.5 bg-[#B54843] text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#943a36] cursor-pointer z-10">
                      <Trash2 size={14} />
                    </button>
                    <div className="absolute top-3 left-3">
                      <span className="font-mono text-[8px] font-bold tracking-widest uppercase px-2 py-1 rounded-md"
                        style={{ background: statusBg[j.status] || "#999", color: statusText[j.status] || "#222" }}>
                        {t(`customer.myJournals.${j.status.toLowerCase()}`) || j.status}
                      </span>
                    </div>
                  </div>
                  <div className="p-4 border-t-[3px] border-[#222]">
                    <h3 className="text-lg font-bold mb-1 leading-tight">{j.title}</h3>
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="font-mono text-[9px] font-bold tracking-widest uppercase text-[#999]">{j.style}</span>
                      <span className="text-[#222]">·</span>
                      <span suppressHydrationWarning className="font-mono text-[9px] font-bold text-[#999]">{j.pages} {t("customer.myJournals.pg")}</span>
                    </div>
                    <p className="font-mono text-[9px] font-bold text-[#999]">{j.createdAt?.slice(0, 10)}</p>
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
          <div className="bg-[#FFF7D6] rounded-[10px] border-[3px] border-[#222] shadow-[4px_4px_0_#222] w-80 p-5" onClick={(e) => e.stopPropagation()}>
            <p suppressHydrationWarning className="font-bold text-lg mb-1">{t("customer.myJournals.deleteTitle")}</p>
            <p suppressHydrationWarning className="text-sm text-[#666] mb-5">
              {t("customer.myJournals.deleteConfirm", { title: deleteTarget.title })}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} disabled={deleting}
                className="flex-1 font-mono text-[9px] font-bold tracking-widest uppercase px-4 py-2.5 rounded-[10px] border-[3px] border-[#222] shadow-[2px_2px_0_#222] hover:translate-x-px hover:translate-y-px hover:shadow-[1px_1px_0_#222] transition-all disabled:opacity-40 cursor-pointer">
                {t("customer.myJournals.cancel")}
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 font-mono text-[9px] font-bold tracking-widest uppercase px-4 py-2.5 rounded-[10px] bg-[#B54843] text-white border-[3px] border-[#B54843] shadow-[2px_2px_0_#B54843] hover:translate-x-px hover:translate-y-px hover:shadow-[1px_1px_0_#B54843] transition-all disabled:opacity-40 cursor-pointer">
                {deleting ? t("customer.myJournals.deleting") : t("customer.myJournals.delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
