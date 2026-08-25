"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Save, Trash2 } from "lucide-react";
import { DiscountType } from "@echotrace/shared";
import { label, neoBtn, neoBtnPrimary, neoBtnDanger, input } from "@/lib/styles";
import { CloseButton } from "@/components/ui/close-button";
import { StatusBadge } from "@/components/status-badge";
import { YesNoPopup } from "@/components/yes-no-popup";
import { Coupon, CouponForm, TYPE_OPTIONS, MIN_ORDER_OPTIONS, defaultForm, couponToForm } from "../_hooks/use-coupons";

export function CouponDrawer({
  coupon,
  saving,
  onCreate,
  onDeactivate,
  onClose,
}: {
  coupon: Coupon; 
  saving: boolean;
  onCreate: (form: CouponForm) => Promise<boolean>;
  onDeactivate: (c: Coupon) => Promise<boolean>;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const isCreating = coupon.id === 0;
  const [form, setForm] = useState<CouponForm>(() =>
    isCreating ? defaultForm() : couponToForm(coupon),
  );
  const [confirmDeact, setConfirmDeact] = useState(false);

  const handleSave = async () => {
    if (saving || !form.code.trim()) return;
    await onCreate(form);
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" />
      <div
        className="fixed top-0 right-0 bottom-0 z-50 bg-[#F8F2E5] flex flex-col overflow-hidden border-l-[3px] border-[#222]"
        style={{ width: 420 }}
      >
        <div className="flex items-center justify-between px-6 py-5 shrink-0 border-b-[3px] border-[#222]">
          <div>
            <p className={`${label} mb-1 text-[#666]`}>{t("admin.coupons.detailLabel")}</p>
            <h2 className="text-xl font-bold truncate max-w-[300px]">
              {isCreating ? t("admin.coupons.createTitle") : coupon.code}
            </h2>
          </div>
          <CloseButton onClick={onClose} />
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-none p-6 space-y-4">
          {/* Status — chỉ hiện khi đã tạo, không sửa trực tiếp */}
          {!isCreating && (
            <div>
              <h3 className="text-sm text-[#666] mb-3">{t("admin.coupons.status")}</h3>
              <StatusBadge
                status={form.isActive ? "active" : "default"}
                label={form.isActive ? t("admin.coupons.active") : t("admin.coupons.inactive")}
              />
            </div>
          )}

          <div>
            <div className={`${label} text-xs text-[#666] mb-1`}>{t("admin.coupons.code")}</div>
            <input
              className={input}
              value={form.code}
              disabled={!isCreating}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="SUMMER50"
            />
            <p className="text-[10px] text-[#999] mt-1">{t("admin.coupons.codeHint")}</p>
          </div>
          <div>
            <div className={`${label} text-xs text-[#666] mb-1`}>{t("admin.coupons.type")}</div>
            <div className="flex gap-2">
              {TYPE_OPTIONS.map((tp) => (
                <button
                  key={tp}
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      discountType: tp,
                      maxDiscountAmount: tp === DiscountType.FIXED ? 0 : f.maxDiscountAmount,
                    }))
                  }
                  disabled={!isCreating}
                  className={`flex-1 font-mono text-[9px] font-bold tracking-widest uppercase px-3 py-2 ${form.discountType === tp ? neoBtnPrimary : neoBtn}`}
                >
                  {tp === DiscountType.PERCENTAGE ? "%" : "₫"}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className={`${label} text-xs text-[#666] mb-1`}>{t("admin.coupons.value")}</div>
              <input
                type="number"
                value={form.discountValue}
                disabled={!isCreating}
                onChange={(e) => setForm((f) => ({ ...f, discountValue: Number(e.target.value) }))}
                className={input}
                min={0}
              />
            </div>
            <div>
              <div className={`${label} text-xs text-[#666] mb-1`}>{t("admin.coupons.maxDiscount")}</div>
              <input
                type="number"
                value={form.maxDiscountAmount}
                disabled={!isCreating || form.discountType === "fixed"}
                onChange={(e) => setForm((f) => ({ ...f, maxDiscountAmount: Number(e.target.value) }))}
                className={`${input} disabled:opacity-40`}
                min={0}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className={`${label} text-xs text-[#666] mb-1`}>{t("admin.coupons.minOrder")}</div>
              <div className="flex gap-2 mb-2">
                {MIN_ORDER_OPTIONS.map((m) => (
                  <button
                    key={m}
                    onClick={() => setForm((f) => ({ ...f, minOrderType: m }))}
                    disabled={!isCreating}
                    className={`flex-1 font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-1.5 text-[10px] ${form.minOrderType === m ? neoBtnPrimary : neoBtn}`}
                  >
                    {t(`admin.coupons.minOrderUnit.${m}`)}
                  </button>
                ))}
              </div>
              <input
                type="number"
                value={form.minOrderAmount}
                disabled={!isCreating}
                onChange={(e) => setForm((f) => ({ ...f, minOrderAmount: Number(e.target.value) }))}
                className={input}
                min={0}
              />
            </div>
            <div>
              <div className={`${label} text-xs text-[#666] mb-1`}>{t("admin.coupons.maxUsage")}</div>
              <input
                type="number"
                value={form.maxUsageCount}
                disabled={!isCreating}
                onChange={(e) => setForm((f) => ({ ...f, maxUsageCount: Number(e.target.value) }))}
                className={input}
                min={0}
                placeholder="0 = ∞"
              />
            </div>
          </div>
          <div>
            <div className={`${label} text-xs text-[#666] mb-1`}>{t("admin.coupons.expiresAt")}</div>
            <input
              type="date"
              value={form.expiresAt}
              disabled={!isCreating}
              onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
              className={input}
            />
          </div>
        </div>

        {isCreating ? (
          <div className="px-6 py-4 shrink-0 border-t-[3px] border-[#222]">
            <button
              onClick={handleSave}
              disabled={saving || !form.code.trim()}
              className={`${neoBtnPrimary} w-full flex items-center justify-center gap-2 py-3 disabled:opacity-40`}
            >
              <Save size={16} /> {saving ? `${t("common.save")}…` : t("common.save")}
            </button>
          </div>
        ) : (
          form.isActive && (
            <div className="px-6 py-4 shrink-0 border-t-[3px] border-[#222]">
              <button
                onClick={() => setConfirmDeact(true)}
                className={`${neoBtnDanger} w-full flex items-center justify-center gap-2 py-3`}
              >
                <Trash2 size={16} /> {t("admin.coupons.deactivate")}
              </button>
            </div>
          )
        )}
      </div>

      <YesNoPopup
        open={confirmDeact}
        onConfirm={async () => {
          const ok = await onDeactivate(coupon);
          setConfirmDeact(false);
          if (ok) setForm((f) => ({ ...f, isActive: false }));
        }}
        onCancel={() => setConfirmDeact(false)}
        title={t("admin.coupons.deactivateConfirmTitle")}
        message={t("admin.coupons.deactivateConfirmText")}
        confirmLabel={t("admin.coupons.deactivate")}
      />
    </>
  );
}
