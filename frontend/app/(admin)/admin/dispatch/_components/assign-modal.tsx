"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Search, Check } from "lucide-react";
import { CloseButton } from "@/components/ui/close-button";
import { label, card, input, neoBtnPrimary } from "@/lib/styles";
import { StatusBadge } from "@/components/status-badge";
import type { Order } from "@/lib/mock-dispatch";
import { unassignedOrders } from "@/lib/mock-dispatch";
import { formatCurrency } from "../_lib/utils";

export function AssignModal({
  supplierName,
  onClose,
}: {
  supplierName: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [assignSearch, setAssignSearch] = useState("");
  const [assignChecked, setAssignChecked] = useState<Set<string>>(new Set());

  const assignFiltered = unassignedOrders.filter((o: Order) => {
    const q = assignSearch.toLowerCase();
    return !q || o.id.toLowerCase().includes(q) || o.product.toLowerCase().includes(q);
  });

  const toggleAssign = (id: string) => {
    setAssignChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center">
      <div className={`${card} w-[520px] max-h-[80vh] flex flex-col`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b-[3px] border-[#222]">
          <div>
            <p className="font-bold text-sm">{t("admin.dispatch.assignOrders")}</p>
            <p className={`${label} text-[#999] mt-0.5`}>
              {assignChecked.size} {t("admin.dispatch.selected", { count: assignChecked.size })}
            </p>
          </div>
          <CloseButton onClick={onClose} />
        </div>
        <div className="px-6 py-3 border-b-2 border-[#222]/10">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999]" />
            <input
              type="text"
              value={assignSearch}
              onChange={(e) => setAssignSearch(e.target.value)}
              placeholder={t("admin.dispatch.assignSearch")}
              className={`${input} pl-9 py-2 text-xs`}
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-3 space-y-1 min-h-0">
          {assignFiltered.length === 0 ? (
            <p className="text-center py-8 text-[#999] font-bold">{t("admin.dispatch.noResults")}</p>
          ) : (
            assignFiltered.map((o) => {
              const isChecked = assignChecked.has(o.id);
              return (
                <label
                  key={o.id}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                    isChecked ? "bg-[#222] text-white" : "hover:bg-[#FFF7D6]"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                      isChecked ? "bg-white border-white" : "border-[#222]"
                    }`}
                  >
                    {isChecked && <Check size={10} className="text-[#222]" />}
                  </div>
                  <input type="checkbox" checked={isChecked} onChange={() => toggleAssign(o.id)} className="hidden" />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold ${isChecked ? "text-white" : "text-[#222]"}`}>{o.product}</p>
                    <p className={`font-mono text-[10px] ${isChecked ? "text-white/60" : "text-[#999]"}`}>
                      {o.id} &middot; {formatCurrency(o.amount)}
                    </p>
                  </div>
                  <StatusBadge status={o.status} />
                </label>
              );
            })
          )}
        </div>
        <div className="px-6 py-4 border-t-[3px] border-[#222]">
          <button
            disabled={assignChecked.size === 0}
            onClick={() => {
              alert(
                t("admin.dispatch.assignSuccess", {
                  count: assignChecked.size,
                  name: supplierName || t("admin.dispatch.supplier"),
                }),
              );
              onClose();
            }}
            className={`${neoBtnPrimary} w-full flex items-center justify-center gap-2 ${
              assignChecked.size === 0 ? "opacity-40 pointer-events-none" : ""
            }`}
          >
            <Check size={14} />
            {t("admin.dispatch.confirmAssignment", { count: assignChecked.size })}
          </button>
        </div>
      </div>
    </div>
  );
}
