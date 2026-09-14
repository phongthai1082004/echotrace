"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslation } from "react-i18next";
import { apiFetch } from "@/lib/api.fetch";
import { label, card, neoBtn, neoBtnDanger, input } from "@/lib/styles";
import { Modal } from "@/components/ui/modal";
import { AdminHeader } from "@/components/admin-header";

interface WindowDTO {
  id: number;
  startAt: string;
  endAt: string | null;
  reason: string | null;
  status: string;
  createdAt: string;
  endedAt: string | null;
}

interface AdminStatus {
  active: boolean;
  window: WindowDTO | null;
  history: WindowDTO[];
}

// ponytail: native datetime-local, không thêm lib picker cho 2 ô nhập.
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function AdminMaintenancePage() {
  const { t, i18n } = useTranslation();
  const { data: session } = useSession();
  const token = (session as any)?.accessToken;
  const [data, setData] = useState<AdminStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState<null | { message: string; run: () => Promise<void> }>(null);

  const load = async () => {
    try {
      const d = await apiFetch<AdminStatus>("/api/admin/maintenance", token);
      setData(d ?? null);
    } catch {
      setData(null);
    }
  };

  useEffect(() => {
    if (!token) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const post = async (body: Record<string, unknown>) => {
    setBusy(true);
    try {
      await apiFetch("/api/admin/maintenance", token, { method: "POST", body: JSON.stringify(body) });
      await load();
    } catch {
    } finally {
      setBusy(false);
      setConfirm(null);
      setShowForm(false);
    }
  };

  const ask = (message: string, run: () => Promise<void>) => setConfirm({ message, run });
  const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString((i18n.language || "en").slice(0, 2)) : "—");
  const acc = (k: string, vars?: Record<string, string>) => t(`admin.adminAccount.${k}`, vars);

  const w = data?.window;

  return (
    <div>
      <AdminHeader label={t("admin.maintenance.label")} title={t("admin.maintenance.title")} />
      <div className="px-8 max-[1600px]:px-6 max-[1440px]:px-5 max-[1280px]:px-4 py-8 max-[1600px]:py-6 max-[1440px]:py-5 max-[1280px]:py-4 space-y-8 max-w-3xl">
        <div className={`p-6 ${card}`}>
          <p className={`${label} mb-1`}>{t("admin.adminAccount.maintenanceTitle")}</p>
          <p className="text-xs text-[#666] max-w-md mb-4">{t("admin.adminAccount.maintenanceDesc")}</p>
          <p className={`font-mono text-[10px] font-bold ${data?.active ? "text-[#B54843]" : "text-[#2D6A2D]"}`}>
            {data ? (data.active ? acc("maintenanceLive") : acc("maintenanceIdle")) : "…"}
          </p>
          {w?.startAt && w?.endAt && (
            <p className="font-mono text-[9px] font-bold mt-1 text-[#666]">
              {acc("maintenanceWindow", { from: fmt(w.startAt), to: fmt(w.endAt) })}
            </p>
          )}
          {w?.reason && <p className="text-xs text-[#666] mt-1">{w.reason}</p>}

          <div className="flex flex-wrap gap-2 mt-4">
            <button
              type="button"
              onClick={() =>
                data &&
                (data.active
                  ? ask(acc("maintenanceConfirmOff"), () => post({ enabled: false }))
                  : ask(acc("maintenanceConfirmOn"), () => post({ enabled: true, reason: reason || undefined })))
              }
              disabled={!data || busy}
              className={`${data?.active ? neoBtnDanger : neoBtn} font-mono text-[10px] font-bold tracking-widest uppercase px-4 py-2`}
            >
              {data ? (data.active ? "OFF" : "ON") : "…"}
            </button>
            <button
              type="button"
              onClick={() => {
                setStart(toLocalInput(w?.startAt ?? null));
                setEnd(toLocalInput(w?.endAt ?? null));
                setReason(w?.reason ?? "");
                setShowForm((v) => !v);
              }}
              className={`${neoBtn} font-mono text-[10px] font-bold tracking-widest uppercase px-4 py-2`}
            >
              {acc("maintenanceSchedule")}
            </button>
          </div>

          {showForm && (
            <div className="mt-4 pt-4 border-t-[2px] border-[#222]/10 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block">
                <span className={`${label} block mb-1.5`}>{acc("maintenanceStart")}</span>
                <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} className={input} />
              </label>
              <label className="block">
                <span className={`${label} block mb-1.5`}>{acc("maintenanceEnd")}</span>
                <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} className={input} />
              </label>
              <label className="block sm:col-span-2">
                <span className={`${label} block mb-1.5`}>Note</span>
                <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} className={input} placeholder="deploy v1.4…" />
              </label>
              <div className="sm:col-span-2 flex gap-2">
                <button
                  type="button"
                  disabled={busy || !start || !end}
                  onClick={() => {
                    const s = new Date(start);
                    const e = new Date(end);
                    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e <= s) return;
                    ask(
                      acc("maintenanceConfirmSchedule", { from: fmt(s.toISOString()), to: fmt(e.toISOString()) }),
                      () => post({ startAt: s.toISOString(), endAt: e.toISOString(), reason: reason || undefined }),
                    );
                  }}
                  className={`${neoBtn} font-mono text-[10px] font-bold tracking-widest uppercase px-4 py-2`}
                >
                  {acc("maintenanceSave")}
                </button>
                {w && !data?.active && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => ask(acc("maintenanceConfirmOff"), () => post({ enabled: false }))}
                    className={`${neoBtn} font-mono text-[10px] font-bold tracking-widest uppercase px-4 py-2`}
                  >
                    {acc("maintenanceClear")}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className={`${card} overflow-hidden`}>
          <div className="px-6 py-4 border-b-[3px] border-[#222]">
            <p className={`${label} text-[#666]`}>{t("admin.maintenance.history")}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-[3px] border-[#222]">
                  {["ID", acc("maintenanceStart"), acc("maintenanceEnd"), "Status", "Note"].map((h) => (
                    <th key={h} className={`text-left px-4 py-3 ${label} text-[#666] whitespace-nowrap`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data?.history ?? []).length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm font-bold text-[#999]">…</td>
                  </tr>
                )}
                {(data?.history ?? []).map((h) => (
                  <tr key={h.id} className="border-b-[2px] border-[#222]/10">
                    <td className="px-4 py-3 font-mono text-[10px] font-bold">#{h.id}</td>
                    <td className="px-4 py-3 font-mono text-[10px]">{fmt(h.startAt)}</td>
                    <td className="px-4 py-3 font-mono text-[10px]">{fmt(h.endAt)}</td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded uppercase border-2 border-[#222]">
                        {h.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#666] max-w-[220px] truncate">{h.reason || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={acc("maintenanceConfirmTitle")}
        cancelLabel={t("common.cancel")}
        actions={[{ label: t("common.confirm"), onClick: () => confirm && void confirm.run(), className: neoBtnDanger, disabled: busy, loading: busy }]}
      >
        <p className="text-sm text-[#666] mb-6">{confirm?.message}</p>
      </Modal>
    </div>
  );
}
