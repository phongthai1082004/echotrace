"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api.fetch";
import { useToast } from "@/components/toast";
import { PrintOption } from "@/models/print-option/print-option";
import { L10NText } from "@echotrace/shared";

export interface OptionForm {
  type: string;
  code: string;
  name: L10NText;
  description: L10NText;
  width: number | null;
  height: number | null;
  price: number | null;
}

export function emptyForm(): OptionForm {
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

export const num = (v: number | null | undefined) => (v == null ? "" : String(v));

export function withNum(f: OptionForm, key: "width" | "height", v: string): OptionForm {
  const n = v.trim() === "" ? null : Number(v);
  return { ...f, [key]: Number.isNaN(n) ? null : n };
}

export function usePrintOptions() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { data: session } = useSession();
  const token = (session as any)?.accessToken;

  const [options, setOptions] = useState<PrintOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
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
  }, [token, t, showToast]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetchOptions().finally(() => setLoading(false));
  }, [token, fetchOptions]);

  const filtered = useMemo(() => options.filter((o) => filter === "all" || o.type === filter), [options, filter]);

  const openEditForm = (o: PrintOption): OptionForm => ({
    type: o.type,
    code: o.code,
    name: { ...o.name },
    description: { ...o.description },
    width: o.width ?? null,
    height: o.height ?? null,
    price: o.price ?? null,
  });

  const saveOption = async (option: PrintOption | null, f: OptionForm): Promise<boolean> => {
    if (!f.code.trim()) {
      showToast(t("admin.printOptions.codeRequired"), "error");
      return false;
    }
    setSaving(true);
    try {
      if (option) {
        await apiFetch(`/api/admin/print-options/${option.id}`, token, {
          method: "PATCH",
          body: JSON.stringify(f),
        });
        showToast(t("admin.printOptions.updated"), "success");
      } else {
        await apiFetch("/api/admin/print-options", token, { method: "POST", body: JSON.stringify(f) });
        showToast(t("admin.printOptions.created"), "success");
      }
      await fetchOptions();
      return true;
    } catch (e: any) {
      showToast(e.message || t("admin.printOptions.saveFailed"), "error");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const deleteOption = async () => {
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

  return {
    options,
    setOptions,
    filtered,
    loading,
    filter,
    setFilter,
    saving,
    confirmDel,
    setConfirmDel,
    deleteOption,
    saveOption,
    openEditForm,
  };
}
