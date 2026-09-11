"use client";

import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";
import { useToast } from "@/components/toast";
import { neoBtn } from "@/lib/styles";
import { itemThumb, itemPrice, priceText } from "../_lib/utils";

function TickBox({
  checked,
  onToggle,
  label,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={`shrink-0 w-5 h-5 rounded-[5px] border-[3px] border-[#222] flex items-center justify-center transition-colors ${
        checked ? "bg-[#222] text-white" : "bg-white hover:bg-[#FFF7D6]"
      }`}
    >
      {checked && <Check size={12} strokeWidth={3} />}
    </button>
  );
}

export function CartStep({
  items,
  selected,
  selectedCount,
  onToggleItem,
  onToggleAll,
  describe,
  onChangeQty,
  onDelete,
  onEdit,
}: {
  items: any[];
  selected: Set<number>;
  selectedCount: number;
  onToggleItem: (bookId: number) => void;
  onToggleAll: () => void;
  describe: (item: any) => string;
  onChangeQty: (bookId: number, quantity: number) => void;
  onDelete: (bookId: number) => void;
  onEdit: (index: number) => void;
}) {
  const { t } = useTranslation();
  const { showToast } = useToast();

  if (items.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-2xl font-bold mb-2">{t("customer.checkout.emptyTitle")}</p>
        <p className="font-mono text-[10px] font-bold tracking-widest uppercase text-[#999]">
          {t("customer.checkout.emptyDesc")}
        </p>
      </div>
    );
  }

  const allChecked = selectedCount === items.length;

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-3">
        <h2 className="text-2xl font-bold">{t("customer.checkout.orderList")}</h2>
        <button
          type="button"
          onClick={onToggleAll}
          role="checkbox"
          aria-checked={allChecked}
          className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-widest uppercase text-[#666] hover:text-[#222] transition-colors shrink-0"
        >
          <span
            aria-hidden
            className={`w-5 h-5 rounded-[5px] border-[3px] border-[#222] flex items-center justify-center transition-colors ${
              allChecked ? "bg-[#222] text-white" : "bg-white"
            }`}
          >
            {allChecked && <Check size={12} strokeWidth={3} />}
          </span>
          {t("customer.checkout.selectedCount", { count: selectedCount, total: items.length })}
        </button>
      </div>
      <p className="font-mono text-[10px] font-semibold text-[#999] mb-3 tracking-widest uppercase">
        {t("customer.checkout.cartItemHint")}
      </p>
      <div className="space-y-4">
        {items.map((item, i) => {
          const checked = selected.has(item.bookId);
          return (
            <div
              key={i}
              className={`relative flex items-start gap-4 p-4 bg-[#FFF7D6] rounded-[10px] border-[3px] border-[#222] shadow-[2px_2px_0_#222] cursor-pointer transition-[transform,box-shadow,opacity] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#222] ${
                checked ? "" : "opacity-50"
              }`}
              onClick={() => onEdit(i)}
            >
              <button
                type="button"
                aria-label={t("common.delete")}
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(item.bookId);
                }}
                className="absolute -top-3 -right-3 w-8 h-8 sm:w-6 sm:h-6 rounded-full border-2 border-[#B54843] bg-[#FFF7D6] text-[#B54843] font-mono text-[11px] font-bold flex items-center justify-center hover:bg-[#B54843] hover:text-white transition-colors z-10"
              >
                ✕
              </button>
              <div className="w-16 h-20 bg-[#e8e6e0] rounded-[10px] border-[3px] border-[#222] shrink-0 overflow-hidden">
                {itemThumb(item) && <img src={itemThumb(item)!} alt="" className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-lg font-bold leading-tight">{item.title}</p>
                <p className="font-mono text-[10px] text-[#999] mt-1">{describe(item)}</p>
                <div className="flex items-center gap-1 mt-2">
                  <button
                    type="button"
                    aria-label={t("customer.checkout.decrease")}
                    onClick={(e) => {
                      e.stopPropagation();
                      if ((item.quantity || 1) <= 1) {
                        showToast(t("customer.checkout.minQuantity"), "error");
                        return;
                      }
                      onChangeQty(item.bookId, (item.quantity || 1) - 1);
                    }}
                    className={`${neoBtn} w-8 h-8 sm:w-6 sm:h-6 rounded font-mono text-xs font-bold flex items-center justify-center`}
                  >
                    −
                  </button>
                  <span className="font-mono text-xs font-bold w-5 text-center">{item.quantity || 1}</span>
                  <button
                    type="button"
                    aria-label={t("customer.checkout.increase")}
                    onClick={(e) => {
                      e.stopPropagation();
                      onChangeQty(item.bookId, (item.quantity || 1) + 1);
                    }}
                    className={`${neoBtn} w-8 h-8 sm:w-6 sm:h-6 rounded font-mono text-xs font-bold flex items-center justify-center`}
                  >
                    +
                  </button>
                </div>
              </div>
              {/* ── Cột phải: giá + chọn cho order ── */}
              <div className="shrink-0 self-stretch flex flex-col items-end justify-between gap-3">
                <p className="font-mono text-sm font-bold whitespace-nowrap">
                  {priceText(itemPrice(item), t("customer.checkout.unknown"))}
                </p>
                <TickBox
                  checked={checked}
                  onToggle={() => onToggleItem(item.bookId)}
                  label={t("customer.checkout.selectForOrder")}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
