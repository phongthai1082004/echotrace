"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { card, neoBtnPrimary } from "@/lib/styles";
import { AdminHeader } from "@/components/admin-header";
import { AdminFilterTabs } from "@/components/admin-filter-tabs";
import { YesNoPopup } from "@/components/yes-no-popup";
import { PrintOption } from "@/models/print-option/print-option";
import { L10NText } from "@echotrace/shared";
import { usePrintOptions } from "../_hooks/use-print-options";
import { OptionsTable } from "./options-table";
import { OptionFormModal } from "./option-form-modal";

export function PrintOptionsClient({ initialOptions }: { initialOptions?: PrintOption[] }) {
  const { t, i18n } = useTranslation();

  const {
    filtered,
    loading,
    filter,
    setFilter,
    confirmDel,
    setConfirmDel,
    deleteOption,
    saveOption,
  } = usePrintOptions(initialOptions);

  const [modal, setModal] = useState<{ option: PrintOption | null } | null>(null);

  const lng = ((i18n.resolvedLanguage || i18n.language || "vi").split("-")[0] as keyof L10NText) || "vi";

  return (
    <div className="h-screen flex flex-col">
      <AdminHeader label={t("admin.printOptions.label")} title={t("admin.printOptions.title")}>
        <button
          suppressHydrationWarning
          onClick={() => setModal({ option: null })}
          className={`${neoBtnPrimary} font-mono text-[9px] font-bold tracking-widest uppercase px-4 py-2.5 shrink-0`}
        >
          {t("admin.printOptions.createBtn")}
        </button>
      </AdminHeader>

      <div className="flex-1 flex flex-col px-8 max-[1600px]:px-6 max-[1440px]:px-5 max-[1280px]:px-4 py-6 max-[1600px]:py-5 max-[1440px]:py-4 max-[1280px]:py-3 gap-6 min-h-0 overflow-hidden">
        <AdminFilterTabs
          tabs={[
            { key: "all", label: t("admin.filterTabs.all") },
            { key: "paperSize", label: t("admin.printOptions.types.paperSize") },
            { key: "paper", label: t("admin.printOptions.types.paper") },
            { key: "cover", label: t("admin.printOptions.types.cover") },
          ]}
          selected={filter}
          onChange={setFilter}
        />

        <div className={`${card} flex-1 flex flex-col min-h-0`}>
          <OptionsTable
            filtered={filtered}
            loading={loading}
            lng={lng}
            onEdit={(o) => setModal({ option: o })}
            onDelete={setConfirmDel}
          />
        </div>
      </div>

      {modal && (
        <OptionFormModal
          option={modal.option}
          onSave={(option, form) => saveOption(option, form)}
          onClose={() => setModal(null)}
        />
      )}

      <YesNoPopup
        open={confirmDel !== null}
        onConfirm={deleteOption}
        onCancel={() => setConfirmDel(null)}
        title={t("admin.printOptions.deleteConfirmTitle")}
        message={t("admin.printOptions.deleteConfirmText")}
        confirmLabel={t("common.delete")}
      />
    </div>
  );
}
