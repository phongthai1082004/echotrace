"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useTranslation } from "react-i18next";
import { SkeletonGrid } from "@/components/skeleton";
import { neoBtnPrimary } from "@/lib/styles";
import { YesNoPopup } from "@/components/yes-no-popup";
import { useMyBooks, type JournalBook } from "../_hooks/use-my-books";
import { JournalCard } from "./journal-card";

// data lần đầu từ server (initialJournals) nên không còn waterfall session → fetch.
export function MyJournalsClient({
  initialJournals,
  initialError,
}: {
  initialJournals?: JournalBook[];
  initialError?: string | null;
}) {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const accessToken = (session as any)?.accessToken;

  const { journals, fetchError, loading, deleteTarget, setDeleteTarget, deleting, handleDelete } =
    useMyBooks(accessToken, initialJournals, initialError);

  return (
    <>
      <div className="pb-8">
        {fetchError && journals.length === 0 && !loading && (
          <p suppressHydrationWarning className="text-[10px] text-red-500 mb-3">
            {t("customer.myJournals.error", { message: fetchError })}
          </p>
        )}
        {journals.length === 0 && !fetchError ? (
          loading ? (
            <SkeletonGrid count={8} variant="journal" />
          ) : (
            <div className="flex flex-col items-center justify-center py-20">
              <p suppressHydrationWarning className="text-xl font-bold mb-2">
                {t("customer.myJournals.emptyTitle")}
              </p>
              <p suppressHydrationWarning className="text-sm mb-6 text-[#999]">
                {t("customer.myJournals.emptyDesc")}
              </p>
              <Link
                href="/studio"
                className={`${neoBtnPrimary} font-mono text-[10px] font-bold tracking-widest uppercase px-6 py-3`}
              >
                {t("customer.myJournals.openStudio")}
              </Link>
            </div>
          )
        ) : loading ? (
          <SkeletonGrid count={8} variant="journal" />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
            {journals.map((j) => (
              <JournalCard key={j.id} j={j} onDelete={setDeleteTarget} />
            ))}
          </div>
        )}
      </div>

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
    </>
  );
}
