"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2, X } from "lucide-react";
import { SkeletonCardRow } from "@/components/skeleton";
import { useVisibleCards } from "@/lib/use-container-query";
import { apiFetch } from "@/lib/api.fetch";
import { neoBtn, neoBtnPrimary } from "@/lib/styles";

interface JournalBook {
  id: number;
  title: string;
  coverUrl: string | null;
  thumbnailUrl: string | null;
  pages: number;
  style: string;
  cover: string;
  content: string | null;
  createdAt: string;
}

function firstPageThumb(j: JournalBook): string | null {
  return j.thumbnailUrl ?? j.coverUrl ?? null;
}

export default function MyJournalsPage() {
  const { t, i18n } = useTranslation();
  const { data: session } = useSession();
  const accessToken = (session as any)?.accessToken;
  const router = useRouter();
  const { ref: skeletonRef, visibleCount } = useVisibleCards<HTMLDivElement>(280, 20);

  const [journals, setJournals] = useState<JournalBook[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<JournalBook | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showSize, setShowSize] = useState(false);
  const [sizes, setSizes] = useState<any[]>([]);
  const [sizesLoading, setSizesLoading] = useState(false);

  const openNewJournal = () => {
    setShowSize(true);
    if (!sizes.length && accessToken) {
      setSizesLoading(true);
      apiFetch<any>("/api/user/suppliers/options", accessToken)
        .then((d) => setSizes(d?.sizes ?? []))
        .catch(() => setSizes([]))
        .finally(() => setSizesLoading(false));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || !accessToken) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/books/${deleteTarget.id}`, accessToken, { method: "DELETE" });
      setJournals((prev) => prev.filter((b) => b.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    if (!accessToken) return;
    setLoading(true);
    setFetchError(null);
    apiFetch<any[]>("/api/user/my-books", accessToken)
      .then((d) => {
        setJournals(d || []);
      })
      .catch((err) => {
        console.warn("[my-journals] fetch failed:", err);
        setFetchError(String(err));
      })
      .finally(() => setLoading(false));
  }, [accessToken]);

  return (
    <div className="min-h-screen pt-15">
      <div className="px-8 max-[1600px]:px-6 max-[1440px]:px-5 max-[1280px]:px-4 py-10 max-[1600px]:py-8 max-[1440px]:py-6 flex items-end justify-between border-b-[3px] border-[#222]">
        <div>
          <h1
            className="text-3xl max-[1600px]:text-2xl max-[1440px]:text-xl max-[1280px]:text-lg font-bold"
            suppressHydrationWarning
          >
            {t("customer.myJournals.title")}
          </h1>
          <p className="text-sm mt-1 text-[#666]" suppressHydrationWarning>
            {t("customer.myJournals.subtitle")}
          </p>
        </div>
        <button
          onClick={openNewJournal}
          suppressHydrationWarning
          className={`${neoBtnPrimary} font-mono text-[10px] font-bold tracking-widest uppercase px-5 py-3 shrink-0`}
        >
          {t("customer.myJournals.newJournal")}
        </button>
      </div>

      <div className="px-8 max-[1600px]:px-6 max-[1440px]:px-5 max-[1280px]:px-4 py-10 max-[1600px]:py-8 max-[1440px]:py-6">
        <p
          suppressHydrationWarning
          className="font-mono text-[9px] font-bold tracking-widest uppercase mb-5 text-[#666]"
        >
          {t("customer.myJournals.history")}
        </p>
        {fetchError && (
          <p suppressHydrationWarning className="text-[10px] text-red-500 mb-3">
            {t("customer.myJournals.error", { message: fetchError })}
          </p>
        )}
        {journals.length === 0 && !fetchError ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p suppressHydrationWarning className="text-xl font-bold mb-2">
              {t("customer.myJournals.emptyTitle")}
            </p>
            <p suppressHydrationWarning className="text-sm mb-6 text-[#999]">
              {t("customer.myJournals.emptyDesc")}
            </p>
            <button
              onClick={openNewJournal}
              className={`${neoBtnPrimary} font-mono text-[10px] font-bold tracking-widest uppercase px-6 py-3`}
            >
              {t("customer.myJournals.openStudio")}
            </button>
          </div>
        ) : loading ? (
          <div className="overflow-x-auto -mx-8 px-8 pb-8" style={{ scrollbarWidth: "none" }} ref={skeletonRef}>
            <SkeletonCardRow count={Math.max(visibleCount, 2)} aspect="portrait" />
          </div>
        ) : (
          <div className="overflow-x-auto -mx-8 px-8 pb-8" style={{ scrollbarWidth: "none" }}>
            <div className="flex gap-5" style={{ width: "max-content" }}>
              {journals.map((j) => (
                <div
                  key={j.id}
                  className="shrink-0 w-64 group bg-[#FFF7D6] rounded-[10px] border-[3px] border-[#222] shadow-[4px_4px_0_#222] overflow-hidden hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#222] transition-all"
                >
                  <Link href={`/studio?id=${j.id}`} className="block">
                    <div className="relative overflow-hidden bg-[#e8e6e0] aspect-[3/4]">
                      {(firstPageThumb(j) ?? j.coverUrl) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={firstPageThumb(j) ?? j.coverUrl!}
                          alt={j.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span
                            suppressHydrationWarning
                            className="font-mono text-[9px] font-bold tracking-widest uppercase text-[#999]"
                          >
                            {t("customer.myJournals.noCover")}
                          </span>
                        </div>
                      )}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDeleteTarget(j);
                        }}
                        className="absolute top-2 right-2 p-1.5 bg-[#B54843] text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#943a36] cursor-pointer z-10"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="p-4 border-t-[3px] border-[#222]">
                      <h3 className="text-lg font-bold mb-1 leading-tight">{j.title}</h3>
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="font-mono text-[9px] font-bold tracking-widest uppercase text-[#999]">
                          {j.style}
                        </span>
                        <span className="text-[#222]">·</span>
                        <span suppressHydrationWarning className="font-mono text-[9px] font-bold text-[#999]">
                          {j.pages} {t("customer.myJournals.pg")}
                        </span>
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

      {showSize && (
        <div
          className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center"
          onClick={() => setShowSize(false)}
        >
          <div
            className="bg-[#FFF7D6] rounded-[10px] border-[3px] border-[#222] shadow-[4px_4px_0_#222] w-[360px] p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <p suppressHydrationWarning className="font-bold text-lg">
                {t("customer.myJournals.chooseSize")}
              </p>
              <button
                onClick={() => setShowSize(false)}
                className="p-1.5 hover:bg-[#e8e6e0] rounded-lg border-2 border-[#222]"
              >
                <X size={16} />
              </button>
            </div>
            <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
              {sizesLoading ? (
                <p suppressHydrationWarning className="font-mono text-[10px] font-bold text-[#999]">
                  {t("common.loading")}
                </p>
              ) : sizes.length === 0 ? (
                <p suppressHydrationWarning className="font-mono text-[10px] font-bold text-[#999]">
                  {t("customer.myJournals.noSize")}
                </p>
              ) : (
                sizes.map((s) => {
                  const lang = (i18n.language || "en").slice(0, 2) as "vi" | "en" | "es";
                  const label = s.name?.[lang] || s.name?.en || s.code;
                  const desc = s.description?.[lang] || s.description?.en || "";
                  const cm = s.width && s.height ? `${s.width / 10}×${s.height / 10} cm` : "";
                  return (
                    <button
                      key={s.code}
                      onClick={() =>
                        router.push(
                          `/studio?format=${s.code}&w=${s.width ? s.width * 4 : ""}&h=${s.height ? s.height * 4 : ""}`,
                        )
                      }
                      className="w-full text-left px-4 py-3 rounded-[8px] border-2 border-[#222] bg-white hover:bg-[#FFF7D6] hover:shadow-[2px_2px_0_#222] transition-all cursor-pointer"
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold">{label}</span>
                        {cm && <span className="font-mono text-[9px] text-[#999]">{cm}</span>}
                      </span>
                      {desc && (
                        <span suppressHydrationWarning className="block text-[11px] leading-snug text-[#666] mt-1">
                          {desc}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center"
          onClick={() => !deleting && setDeleteTarget(null)}
        >
          <div
            className="bg-[#FFF7D6] rounded-[10px] border-[3px] border-[#222] shadow-[4px_4px_0_#222] w-80 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <p suppressHydrationWarning className="font-bold text-lg mb-1">
              {t("customer.myJournals.deleteTitle")}
            </p>
            <p suppressHydrationWarning className="text-sm text-[#666] mb-5">
              {t("customer.myJournals.deleteConfirm", { title: deleteTarget.title })}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className={`${neoBtn} flex-1 font-mono text-[9px] font-bold tracking-widest uppercase px-4 py-2.5 disabled:opacity-40`}
              >
                {t("customer.myJournals.cancel")}
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className={`${neoBtnPrimary} flex-1 font-mono text-[9px] font-bold tracking-widest uppercase px-4 py-2.5 bg-[#B54843] border-[#B54843] shadow-[2px_2px_0_#B54843] disabled:opacity-40`}
              >
                {deleting ? t("customer.myJournals.deleting") : t("customer.myJournals.delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
