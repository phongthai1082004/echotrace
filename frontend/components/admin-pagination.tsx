"use client";

import { useTranslation } from "react-i18next";
import { neoBtn } from "@/lib/styles";

interface Props {
  hasNext: boolean;
  hasPrevious: boolean;
  onNext: () => void;
  onPrevious: () => void;
  count?: number;
}

export function AdminPagination({ hasNext, hasPrevious, onNext, onPrevious }: Props) {
  const { t } = useTranslation();

  return (
    <div className="px-6 py-3 border-t-[3px] border-[#222] flex items-center justify-between bg-[#FFF7D6] shrink-0">
      <div className="ml-auto flex gap-3">
        <button
          onClick={onPrevious}
          disabled={!hasPrevious}
          className={`${neoBtn} font-mono text-[9px] font-bold tracking-widest uppercase px-3 py-1.5 disabled:opacity-40`}
        >
          {t("admin.pagination.previous")}
        </button>
        <button
          onClick={onNext}
          disabled={!hasNext}
          className={`${neoBtn} font-mono text-[9px] font-bold tracking-widest uppercase px-3 py-1.5 disabled:opacity-40`}
        >
          {t("admin.pagination.next")}
        </button>
      </div>
    </div>
  );
}
