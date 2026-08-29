"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { label, card, input, neoBtnPrimary } from "@/lib/styles";
import { apiFetch } from "@/lib/api.fetch";
import { useToast } from "@/components/toast";
import { SupplierDTO, SupplierOption } from "@echotrace/shared";
import { PrintOptionAssign } from "./print-option-assign";
import { Save } from "lucide-react";

type Form = {
  name: string;
  contact: string;
  email: string;
  status: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
};

function emptyForm(): Form {
  return {
    name: "",
    contact: "",
    email: "",
    status: "active",
    bankName: "",
    bankAccountNumber: "",
    bankAccountName: "",
  };
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <p className={`${label} text-xs text-[#666] mb-1`}>{label}</p>
      <input className={input} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
export function SupplierForm({ supplierId, creating }: { supplierId?: number; creating: boolean }) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const router = useRouter();
  const { data: session } = useSession();
  const token = (session as any)?.accessToken;
  const [form, setForm] = useState<Form>(emptyForm());
  const [assigned, setAssigned] = useState<{
    paperSizeOptions: SupplierOption[];
    paperOptions: SupplierOption[];
    coverOptions: SupplierOption[];
  }>({ paperSizeOptions: [], paperOptions: [], coverOptions: [] });
  const [loading, setLoading] = useState(!creating);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (creating || !supplierId || !token) return;
    setLoading(true);
    apiFetch<SupplierDTO>(`/api/admin/suppliers/${supplierId}`, token)
      .then((data) => {
        const f: Form = {
          name: data.name,
          contact: data.contact,
          email: data.email,
          status: data.banned ? "banned" : "active",
          bankName: data.bankName ?? "",
          bankAccountNumber: data.bankAccountNumber ?? "",
          bankAccountName: data.bankAccountName ?? "",
        };
        setForm(f);
        setAssigned({
          paperSizeOptions: data.paperSizeOptions ?? [],
          paperOptions: data.paperOptions ?? [],
          coverOptions: data.coverOptions ?? [],
        });
      })
      .catch((err) => {
        showToast(t("admin.suppliers.accountNotFound") || "Tài khoản không tồn tại", "error");
        router.push("/admin/suppliers");
      })
      .finally(() => setLoading(false));
  }, [supplierId, creating, token]);

  const handleSaveInfo = async () => {
    if (!token || saving) return;
    setSaving(true);
    try {
      const body = JSON.stringify({
        name: form.name,
        contact: form.contact,
        email: form.email,
        status: form.status === "banned" ? "banned" : "active",
        bankName: form.bankName,
        bankAccountNumber: form.bankAccountNumber,
        bankAccountName: form.bankAccountName,
      });
      if (creating) {
        const data = await apiFetch<SupplierDTO>("/api/admin/suppliers", token, { method: "POST", body });
        showToast(t("admin.suppliers.createSuccess"), "success");
        router.push(`/admin/suppliers/${data.id}`);
      } else {
        await apiFetch(`/api/admin/suppliers/${supplierId}/info`, token, { method: "PATCH", body });
        showToast(t("admin.suppliers.saveSuccess"), "success");
        router.refresh();
      }
    } catch (e: any) {
      showToast(e.message || (creating ? t("admin.suppliers.createFailed") : t("admin.suppliers.saveFailed")), "error");
    } finally {
      setSaving(false);
    }
  };

  const set = (patch: Partial<Form>) => {
    setForm((f) => ({ ...f, ...patch }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p suppressHydrationWarning className="font-mono text-[10px] font-bold">
          {t("common.loading")}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <header className="px-8 py-6 border-b-[3px] border-[#222] flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className={`${label} mb-1 text-[#666]`}>
            <Link href="/admin/suppliers" className="hover:underline">
              ← {t("admin.suppliers.back")}
            </Link>{" "}
            · {creating ? t("admin.suppliers.createTitle") : t("admin.suppliers.detailLabel")}
          </p>
          <h1 className="text-3xl font-bold">
            {form.name?.trim() ? form.name : creating ? t("admin.suppliers.createTitle") : "—"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveInfo}
            disabled={saving}
            className={`${neoBtnPrimary} flex items-center gap-2 font-mono text-[9px] font-bold tracking-widest uppercase px-4 py-2.5 disabled:opacity-40 cursor-pointer`}
          >
            <Save size={14} /> {saving ? `${t("common.save")}…` : t("common.save")}
          </button>
        </div>
      </header>

      <div className="px-8 max-[1600px]:px-6 py-6 space-y-6">
        {/* General Information (full width) */}
        <section className={`${card} p-5`}>
          <h3 className="text-sm text-[#666] font-bold mb-4">{t("admin.suppliers.generalInfo")}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            <div className="space-y-4">
              <Field label={t("admin.suppliers.name")} value={form.name} onChange={(v) => set({ name: v })} />
              <Field label={t("admin.suppliers.contact")} value={form.contact} onChange={(v) => set({ contact: v })} />
              <Field label={t("admin.suppliers.email")} value={form.email} onChange={(v) => set({ email: v })} />
            </div>
            <div className="space-y-4">
              <Field
                label={t("admin.suppliers.bankName")}
                value={form.bankName}
                onChange={(v) => set({ bankName: v })}
              />
              <Field
                label={t("admin.suppliers.bankAccountName")}
                value={form.bankAccountName}
                onChange={(v) => set({ bankAccountName: v })}
              />
              <Field
                label={t("admin.suppliers.bankAccountNumber")}
                value={form.bankAccountNumber}
                onChange={(v) => set({ bankAccountNumber: v })}
              />
            </div>
            {creating ? null : (
              <div>
                <p className={`${label} text-xs text-[#666] mb-1`}>{t("admin.suppliers.status")}</p>
                <div className="flex gap-2">
                  {(["active", "banned"] as const).map((s) => {
                    const active = form.status === s;
                    const meta =
                      s === "active" ? { bg: "#D4EDDA", text: "#155724" } : { bg: "#F8D7DA", text: "#721C24" };
                    return (
                      <button
                        key={s}
                        onClick={() => set({ status: s })}
                        className={`font-mono text-[9px] font-bold tracking-widest uppercase leading-none rounded-[6px] px-2.5 py-1.5 border-2 transition-[opacity,border-color] cursor-pointer ${
                          active
                            ? "border-[#222] shadow-[2px_2px_0_#222] opacity-100"
                            : "border-transparent opacity-40 hover:opacity-70"
                        }`}
                        style={{ background: meta.bg, color: meta.text }}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Print Options — chỉ gán các PrintOption đã có sẵn */}
        {!creating && supplierId ? (
          <PrintOptionAssign supplierId={supplierId} assigned={assigned} onChanged={(data) => setAssigned(data)} />
        ) : null}
      </div>
    </div>
  );
}
