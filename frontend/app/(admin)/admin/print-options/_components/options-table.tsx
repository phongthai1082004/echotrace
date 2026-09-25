"use client";

import { useTranslation } from "react-i18next";
import { Pencil, Trash2 } from "lucide-react";
import { PrintOption } from "@/models/print-option/print-option";
import { L10NText } from "@echotrace/shared";
import { chip, neoBtn, neoBtnDanger } from "@/lib/styles";
import { AdminList } from "@/components/admin-list";
import { EmptyStateMinimal } from "@/components/ui/empty-state";

const TYPE_STYLE: Record<string, string> = {
  paperSize: "bg-[#FFD93D] text-[#222]",
  paper: "bg-[#D4EDDA] text-[#155724]",
  cover: "bg-[#FFF7D6] text-[#222]",
};

export function OptionsTable({
  filtered,
  loading,
  lng,
  onEdit,
  onDelete,
}: {
  filtered: PrintOption[];
  loading: boolean;
  lng: keyof L10NText;
  onEdit: (o: PrintOption) => void;
  onDelete: (o: PrintOption) => void;
}) {
  const { t } = useTranslation();
  return (
    <AdminList
      columns={[
        { key: "code", label: t("admin.printOptions.code"), width: "1.2fr" },
        { key: "name", label: t("admin.printOptions.name"), width: "1.8fr" },
        { key: "type", label: t("admin.printOptions.type"), width: "150px" },
        { key: "dim", label: t("admin.printOptions.dim"), width: "90px", align: "center" },
        { key: "price", label: t("admin.printOptions.price"), width: "110px" },
        { key: "action", label: t("common.action"), width: "110px", align: "center" },
      ]}
      data={filtered}
      loading={loading}
      rowKey={(o) => o.id}
      empty={<EmptyStateMinimal title={t("admin.printOptions.empty")} />}
      renderRow={(o) => {
        const name = o.name?.[lng] || o.name?.vi || o.name?.en || o.name?.es || o.code;
        return (
          <>
            <div className="px-2 text-sm font-bold font-mono whitespace-nowrap">{o.code}</div>
            <div className="px-2 text-sm text-[#555] whitespace-nowrap min-w-0 truncate">{name}</div>
            <div className="px-2 flex">
              <span className={`${chip} ${TYPE_STYLE[o.type] ?? TYPE_STYLE.cover}`}>
                {t(`admin.printOptions.types.${o.type}`)}
              </span>
            </div>
            <div className="px-2 font-mono text-[11px] font-bold text-[#666] whitespace-nowrap text-center">
              {o.type === "paperSize" && o.width && o.height ? `${o.width}×${o.height}` : "—"}
            </div>
            <div className="px-2 font-mono text-[11px] font-bold whitespace-nowrap">
              {o.price != null ? `₫${o.price.toLocaleString()}` : "—"}
            </div>
            <div className="px-2 flex items-center justify-center gap-1.5">
              <button onClick={() => onEdit(o)} title={t("common.edit")} aria-label={t("common.edit")} className={`${neoBtn} p-1.5`}>
                <Pencil size={14} />
              </button>
              <button
                onClick={() => onDelete(o)}
                title={t("common.delete")}
                aria-label={t("common.delete")}
                className={`${neoBtnDanger} p-1.5`}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </>
        );
      }}
    />
  );
}
