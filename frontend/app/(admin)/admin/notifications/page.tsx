"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api.fetch";
import { label, card, neoBtnPrimary, input } from "@/lib/styles";
import { Modal } from "@/components/ui/modal";
import { AdminHeader } from "@/components/admin-header";
import { useNotifStore, notifText, type NotifItem } from "@/stores/notifications";

const LANGS = [
  { code: "vi", field: "messageVi" },
  { code: "en", field: "messageEn" },
  { code: "es", field: "messageEs" },
] as const;

export default function AdminNotificationsPage() {
  const { t, i18n } = useTranslation();
  const { data: session } = useSession();
  const token = (session as any)?.accessToken;
  const router = useRouter();
  const acc = (k: string, vars?: Record<string, string>) => t(`admin.broadcast.${k}`, vars);

  const items = useNotifStore((s) => s.items);
  const loadMore = useNotifStore((s) => s.loadMore);
  const loadingMore = useNotifStore((s) => s.loadingMore);

  const [showForm, setShowForm] = useState(false);
  const [tab, setTab] = useState<(typeof LANGS)[number]["code"]>("vi");
  const [title, setTitle] = useState<Record<string, string>>({ vi: "", en: "", es: "" });
  const [msg, setMsg] = useState<Record<string, string>>({ vi: "", en: "", es: "" });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  // ponytail: menu fixed theo viewport (thoát khung scroll, khỏi bị cắt như absolute)
  const [menu, setMenu] = useState<{ id: NotifItem["id"]; x: number; y: number } | null>(null);

  const openMenu = (e: React.MouseEvent<HTMLButtonElement>, n: NotifItem) => {
    e.stopPropagation();
    const r = e.currentTarget.getBoundingClientRect();
    setMenu(menu?.id === n.id ? null : { id: n.id, x: Math.max(8, r.right - 190), y: r.bottom + 6 });
  };

  const openNotif = async (n: NotifItem) => {
    if (!n.isRead && typeof n.id === "number") {
      try {
        await apiFetch(`/api/notifications/${n.id}/read`, undefined, { method: "PATCH" });
      } catch {}
    }
    if (!n.isRead) useNotifStore.getState().setRead(n.id);
    // ponytail: broadcast tự gõ không có actionUrl — ở lại trang, không đá ra dispatch
    if (n.metadata?.actionUrl) router.push(n.metadata.actionUrl);
  };

  const setFlag = async (n: NotifItem, read: boolean) => {
    setMenu(null);
    if (typeof n.id === "number") {
      try {
        await apiFetch(`/api/notifications/${n.id}/${read ? "read" : "unread"}`, undefined, {
          method: "PATCH",
        });
      } catch {}
    }
    useNotifStore.getState()[read ? "setRead" : "setUnread"](n.id);
  };

  const send = async () => {
    setBusy(true);
    setResult(null);
    try {
      const r = await apiFetch<{ users: number }>("/api/admin/notifications/broadcast", token, {
        method: "POST",
        body: JSON.stringify({
          titleVi: title.vi,
          titleEn: title.en,
          titleEs: title.es,
          messageVi: msg.vi,
          messageEn: msg.en,
          messageEs: msg.es,
        }),
      });
      setResult(acc("sent", { count: String(r?.users ?? 0) }));
      setTitle({ vi: "", en: "", es: "" });
      setMsg({ vi: "", en: "", es: "" });
    } catch {
      setResult(acc("fail"));
    } finally {
      setBusy(false);
    }
  };

  const valid = title.vi.trim().length >= 3 && msg.vi.trim().length > 0;
  const lang = i18n.language;

  return (
    <div>
      <AdminHeader label={acc("label")} title={t("admin.sidebar.notifications")} />
      <div className="px-8 max-[1600px]:px-6 max-[1280px]:px-4 py-8 max-[1600px]:py-6 space-y-8">
        <button
          type="button"
          onClick={() => {
            setResult(null);
            setShowForm(true);
          }}
          className={`${neoBtnPrimary} font-mono text-[10px] font-bold tracking-widest uppercase px-4 py-2`}
        >
          {acc("send")}
        </button>

        <div className={`p-6 ${card}`}>
          {items.length === 0 && (
            <p className="text-sm font-bold text-[#999] text-center py-8">
              {loadingMore ? "…" : t("nav.noNotifications")}
            </p>
          )}
          <div
            className="overflow-y-auto overscroll-contain max-h-[60vh]"
            onScroll={(e) => {
              setMenu(null);
              const el = e.currentTarget;
              // ponytail: cursor append khi scroll gần đáy
              if (el.scrollHeight - el.scrollTop - el.clientHeight < 120) void loadMore();
            }}
          >
            {items.map((n) => (
              <div
                key={n.id}
                className={`relative px-3 py-3 border-b-2 border-[#222]/10 last:border-b-0 transition-colors rounded-md ${
                  n.isRead ? "opacity-60" : "bg-white"
                }`}
              >
                <button type="button" onClick={() => openNotif(n)} className="w-full text-left pr-10">
                  <div className="flex items-center gap-2">
                    {!n.isRead && <span className="w-2 h-2 rounded-full bg-[#B54843] shrink-0" />}
                    <p className="text-sm font-bold leading-tight flex-1">{notifText(n, "title", lang)}</p>
                  </div>
                  <p className="text-xs text-[#666] line-clamp-2 mt-0.5">
                    {notifText(n, "message", lang).replace(/<[^>]*>/g, "")}
                  </p>
                  <p className="font-mono text-[8px] text-[#999] mt-1">
                    {n.createdAt ? new Date(n.createdAt).toLocaleString() : ""}
                  </p>
                </button>
                <span className="absolute inset-y-0 right-2 flex items-center">
                  <button
                    type="button"
                    aria-label="…"
                    onClick={(e) => openMenu(e, n)}
                    className="w-7 h-7 rounded-[8px] border-[3px] border-[#222] bg-[#FFF7D6] font-bold text-[#222] shadow-[2px_2px_0_#222] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#222] transition-[transform,box-shadow] leading-none"
                  >
                    …
                  </button>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {menu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenu(null)} />
          <div
            className="fixed z-50 bg-white rounded-lg border-[3px] border-[#222] shadow-[4px_4px_0_#222] overflow-hidden w-48"
            style={{ top: menu.y, left: menu.x }}
          >
            <button
              type="button"
              onClick={() => {
                const n = items.find((i) => i.id === menu.id);
                if (n) void setFlag(n, true);
              }}
              className="block w-full text-left px-4 py-2 text-xs font-bold hover:bg-[#FFF7D6]"
            >
              {acc("markRead")}
            </button>
            <button
              type="button"
              onClick={() => {
                const n = items.find((i) => i.id === menu.id);
                if (n) void setFlag(n, false);
              }}
              className="block w-full text-left px-4 py-2 text-xs font-bold border-t-2 border-[#222]/10 hover:bg-[#FFF7D6]"
            >
              {acc("markUnread")}
            </button>
          </div>
        </>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title={acc("title")}>
        <p className="text-xs text-[#666] max-w-md mb-4">{acc("desc")}</p>
        <div className="inline-flex mb-4 rounded-[10px] border-[3px] border-[#222] shadow-[4px_4px_0_#222] overflow-hidden bg-white divide-x-[3px] divide-[#222]">
          {LANGS.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => setTab(l.code)}
              className={`font-mono text-[10px] font-bold tracking-widest uppercase px-5 py-2 transition-colors ${
                tab === l.code ? "bg-[#222] text-white" : "hover:bg-[#FFF7D6]"
              }`}
            >
              {l.code}
            </button>
          ))}
        </div>
        {LANGS.map(
          (l) =>
            tab === l.code && (
              <div key={l.code}>
                <p className={`${label} mb-1`}>{acc("titleLabel")}</p>
                <input
                  value={title[l.code]}
                  onChange={(e) => setTitle((t) => ({ ...t, [l.code]: e.target.value }))}
                  placeholder={`${l.code.toUpperCase()} — ${acc("titlePh")}`}
                  maxLength={120}
                  className={`${input} w-full mb-4`}
                />
                <textarea
                  value={msg[l.code]}
                  onChange={(e) => setMsg((m) => ({ ...m, [l.code]: e.target.value }))}
                  rows={5}
                  maxLength={2000}
                  placeholder={`${l.code.toUpperCase()} — ${acc("msgPh")}`}
                  className={`${input} w-full`}
                />
              </div>
            ),
        )}
        <p className="font-mono text-[9px] text-[#999] mt-1 mb-4">{msg[tab].length}/2000</p>
        <button
          type="button"
          onClick={send}
          disabled={!valid || busy || !token}
          className={`${neoBtnPrimary} font-mono text-[10px] font-bold tracking-widest uppercase px-4 py-2 disabled:opacity-50`}
        >
          {busy ? acc("sending") : acc("send")}
        </button>
        {result && <p className="text-sm font-bold mt-3">{result}</p>}
      </Modal>
    </div>
  );
}
