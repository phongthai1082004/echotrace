"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslation } from "react-i18next";
import { SkeletonCardRow } from "@/components/skeleton";
import { useVisibleCards } from "@/lib/use-container-query";
import { apiFetch } from "@/lib/api.fetch";
import { neoBtnPrimary } from "@/lib/styles";
import { YesNoPopup } from "@/components/yes-no-popup";
import { useMyBooks } from "./_hooks/use-my-books";
import { JournalCard } from "./_components/journal-card";
import { SizeModal } from "./_components/size-modal";

export default function MyJournalsPage() {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const accessToken = (session as any)?.accessToken;
  const { ref: skeletonRef, visibleCount } = useVisibleCards<HTMLDivElement>(280, 20);

  const { journals, fetchError, loading, deleteTarget, setDeleteTarget, deleting, handleDelete } =
    useMyBooks(accessToken);

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
                <JournalCard key={j.id} j={j} onDelete={setDeleteTarget} />
              ))}
            </div>
          </div>
        )}
      </div>

      {showSize && <SizeModal sizes={sizes} loading={sizesLoading} onClose={() => setShowSize(false)} />}

      {deleteTarget && (
        <YesNoPopup
          open
          busy={deleting}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          title={t("customer.myJournals.deleteTitle")}
          message={t("customer.myJournals.deleteConfirm", { title: deleteTarget.title })}
          confirmLabel={deleting ? t("customer.myJournals.deleting") : t("customer.myJournals.delete")}
        />
      )}
    </div>
  );
}
