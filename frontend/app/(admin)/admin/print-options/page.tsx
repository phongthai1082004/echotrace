"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSession } from "next-auth/react";
import { label, card, neoBtn, neoBtnPrimary, neoBtnDanger, input, chip } from "@/lib/styles";
import { AdminHeader } from "@/components/admin-header";
import { AdminFilterTabs } from "@/components/admin-filter-tabs";
import { AdminList } from "@/components/admin-list";
import { YesNoPopup } from "@/components/yes-no-popup";
import { apiFetch } from "@/lib/api.fetch";
import { useToast } from "@/components/toast";
import { PrintOption, PRINT_OPTION_TYPES } from "@/models/print-option/print-option";
import { L10NText } from "@/models/supplier/supplier";
import { CloseButton } from "@/components/ui/close-button";
import { Save, Pencil, Trash2} from "lucide-react";

const LANGS = ["vi", "en", "es"] as const;

const TYPE_STYLE: Record<string, string> = {
  paperSize: "bg-[#FFD93D] text-[#222]",
  paper: "bg-[#D4EDDA] text-[#155724]",
  cover: "bg-[#FFF7D6] text-[#222]",
};

interface OptionForm {
  type: string;
  code: string;
  name: L10NText;
  description: L10NText;
  width: number | null;
  height: number | null;
  price: number | null;
}

function emptyForm(): OptionForm {
  return {
    type: "paperSize",
    code: "",
    name: { vi: "", en: "", es: "" },
    description: { vi: "", en: "", es: "" },
    width: null,
    height: null,
    price: null,
  };
}

const num = (v: number | null | undefined) => (v == null ? "" : String(v));

function withNum(f: OptionForm, key: "width" | "height", v: string): OptionForm {
  const n = v.trim() === "" ? null : Number(v);
  return { ...f, [key]: Number.isNaN(n) ? null : n };
}

export default function AdminPrintOptionsPage() {
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  const { data: session } = useSession();
  const token = (session as any)?.accessToken;

  const [options, setOptions] = useState<PrintOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [modal, setModal] = useState<{ option: PrintOption | null; form: OptionForm } | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState<PrintOption | null>(null);

  const fetchOptions = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiFetch<{ items: PrintOption[] }>("/api/admin/print-options", token);
      setOptions(data.items ?? []);
    } catch {
      showToast(t("admin.printOptions.fetchFailed"), "error");
    }
  }, [token, t]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetchOptions().finally(() => setLoading(false));
  }, [token, fetchOptions]);

  const filtered = useMemo(() => {
    return options.filter((o) => filter === "all" || o.type === filter);
  }, [options, filter]);

  const lng = (i18n.language?.split("-")[0] as keyof L10NText) || "vi";

  const openCreate = () => setModal({ option: null, form: emptyForm() });
  const openEdit = (o: PrintOption) =>
    setModal({
      option: o,
      form: {
        type: o.type,
        code: o.code,
        name: { ...o.name },
        description: { ...o.description },
        width: o.width ?? null,
        height: o.height ?? null,
        price: o.price ?? null,
      },
    });

  const handleSave = async () => {
    if (!modal || saving) return;
    const f = modal.form;
    if (!f.code.trim()) {
      showToast(t("admin.printOptions.codeRequired"), "error");
      return;
    }
    setSaving(true);
    try {
      if (modal.option) {
        await apiFetch(`/api/admin/print-options/${modal.option.id}`, token, {
          method: "PATCH",
          body: JSON.stringify(f),
        });
        showToast(t("admin.printOptions.updated"), "success");
      } else {
        await apiFetch("/api/admin/print-options", token, { method: "POST", body: JSON.stringify(f) });
        showToast(t("admin.printOptions.created"), "success");
      }
      setModal(null);
      await fetchOptions();
    } catch (e: any) {
      showToast(e.message || t("admin.printOptions.saveFailed"), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!token || !confirmDel) return;
    try {
      await apiFetch(`/api/admin/print-options/${confirmDel.id}`, token, { method: "DELETE" });
      setOptions((s) => s.filter((o) => o.id !== confirmDel.id));
      setConfirmDel(null);
      showToast(t("admin.printOptions.deleted"), "success");
    } catch {
      setConfirmDel(null);
      showToast(t("admin.printOptions.deleteFailed"), "error");
    }
  };

  return (
    <div className="h-screen flex flex-col">
      <AdminHeader label={t("admin.printOptions.label")} title={t("admin.printOptions.title")}>
        <button
          suppressHydrationWarning
          onClick={openCreate}
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
            empty={
              <div className="flex items-center justify-center py-10">
                <p className="text-lg font-bold">{t("admin.printOptions.empty")}</p>
              </div>
            }
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
                    <button onClick={() => openEdit(o)} title={t("common.edit")} className={`${neoBtn} p-1.5`}>
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setConfirmDel(o)}
                      title={t("common.delete")}
                      className={`${neoBtnDanger} p-1.5`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </>
              );
            }}
          />
        </div>
      </div>

      {/* ── CREATE / EDIT MODAL ── */}
      {modal && (
        <div className="fixed inset-0 z-[60] bg-black/30 flex items-center justify-center">
          <div
            className="bg-[#F8F2E5] rounded-[10px] border-[3px] border-[#222] shadow-[6px_6px_0_#222] w-[480px] max-w-[92vw] max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b-[3px] border-[#222] bg-[#F8F2E5] rounded-t-[10px]">
              <h3 className="text-[15px] font-extrabold uppercase tracking-wide">
                {t(modal.option ? "admin.printOptions.editTitle" : "admin.printOptions.createTitle")}
              </h3>
              <CloseButton onClick={() => setModal(null)} />
            </div>

            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
              <div>
                <p className={`${label} text-xs text-[#666] mb-1`}>{t("admin.printOptions.type")}</p>
                <div className="flex gap-2">
                  {PRINT_OPTION_TYPES.map((tp) => (
                    <button
                      key={tp}
                      onClick={() =>
                        setModal((m) => (m ? { ...m, form: { ...m.form, type: tp } } : m))
                      }
                      className={`flex-1 font-mono text-[9px] font-bold tracking-widest uppercase px-3 py-2 ${
                        modal.form.type === tp ? neoBtnPrimary : neoBtn
                      }`}
                    >
                      {t(`admin.printOptions.types.${tp}`)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className={`${label} text-xs text-[#666] mb-1`}>{t("admin.printOptions.code")}</p>
                <input
                  className={input}
                  value={modal.form.code}
                  onChange={(e) => setModal((m) => (m ? { ...m, form: { ...m.form, code: e.target.value } } : m))}
                  placeholder={t("admin.printOptions.codePlaceholder")}
                />
              </div>

              <div>
                <p className={`${label} text-xs text-[#666] mb-2`}>{t("admin.printOptions.name")}</p>
                <div className="space-y-2">
                  {LANGS.map((l) => (
                    <input
                      key={l}
                      className={input}
                      value={modal.form.name[l]}
                      onChange={(e) =>
                        setModal((m) =>
                          m ? { ...m, form: { ...m.form, name: { ...m.form.name, [l]: e.target.value } } } : m,
                        )
                      }
                      placeholder={`${l.toUpperCase()} — ${t("admin.printOptions.name")}`}
                    />
                  ))}
                </div>
              </div>

              <div>
                <p className={`${label} text-xs text-[#666] mb-2`}>{t("admin.printOptions.description")}</p>
                <div className="space-y-2">
                  {LANGS.map((l) => (
                    <input
                      key={l}
                      className={input}
                      value={modal.form.description[l]}
                      onChange={(e) =>
                        setModal((m) =>
                          m ? { ...m, form: { ...m.form, description: { ...m.form.description, [l]: e.target.value } } } : m,
                        )
                      }
                      placeholder={`${l.toUpperCase()} — ${t("admin.printOptions.description")}`}
                    />
                  ))}
                </div>
              </div>

              {modal.form.type === "paperSize" && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className={`${label} text-xs text-[#666] mb-1`}>{t("admin.printOptions.width")}</p>
                    <input
                      className={input}
                      value={num(modal.form.width)}
                      onChange={(e) =>
                        setModal((m) => (m ? { ...m, form: withNum(m.form, "width", e.target.value) } : m))
                      }
                    />
                  </div>
                  <div>
                    <p className={`${label} text-xs text-[#666] mb-1`}>{t("admin.printOptions.height")}</p>
                    <input
                      className={input}
                      value={num(modal.form.height)}
                      onChange={(e) =>
                        setModal((m) => (m ? { ...m, form: withNum(m.form, "height", e.target.value) } : m))
                      }
                    />
                  </div>
                </div>
              )}

              <div>
                <p className={`${label} text-xs text-[#666] mb-1`}>{t("admin.printOptions.price")}</p>
                <input
                  className={input}
                  value={num(modal.form.price)}
                  onChange={(e) => {
                    const n = e.target.value.trim() === "" ? null : Number(e.target.value);
                    setModal((m) => (m ? { ...m, form: { ...m.form, price: Number.isNaN(n) ? null : n } } : m));
                  }}
                />
              </div>
            </div>

            <div className="flex gap-2 px-5 py-4 border-t-[3px] border-[#222]">
              <button onClick={() => setModal(null)} className={`${neoBtn} px-4 py-2`}>
                {t("common.cancel")}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className={`${neoBtnPrimary} flex items-center gap-2 px-4 py-2 disabled:opacity-40`}
              >
                <Save size={14} /> {saving ? `${t("common.save")}…` : t("common.save")}
              </button>
            </div>
          </div>
        </div>
      )}

      <YesNoPopup
        open={confirmDel !== null}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDel(null)}
        title={t("admin.printOptions.deleteConfirmTitle")}
        message={t("admin.printOptions.deleteConfirmText")}
        confirmLabel={t("common.delete")}
      />
    </div>
  );
}