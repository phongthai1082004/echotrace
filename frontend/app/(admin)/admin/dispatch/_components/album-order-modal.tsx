"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSession } from "next-auth/react";
import { QRCodeSVG } from "qrcode.react";
import { Modal } from "@/components/ui/modal";
import { NeoSelect } from "@/components/neo-select";
import { useToast } from "@/components/toast";
import { apiFetch } from "@/lib/api.fetch";
import { useDebounce } from "@/hooks";
import { input, neoBtnPrimary } from "@/lib/styles";
import { PaymentPlan } from "@echotrace/shared";

interface AlbumRow {
  id: number;
  name: string;
  quantity: number | null;
}

interface UserRow {
  id: number;
  name: string | null;
  email: string;
  phone: string | null;
  address: string | null;
}

interface CreatedOrder {
  orderId: number;
  orderCode: string;
  checkoutUrl?: string | null;
  qrCode?: string | null;
  payNow: number;
  total: number;
}

export function AlbumOrderModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;

  const [userQuery, setUserQuery] = useState("");
  const debouncedUserQuery = useDebounce(userQuery, 400);
  const [userOptions, setUserOptions] = useState<UserRow[]>([]);
  const [customerId, setCustomerId] = useState<number | null>(null);

  const [albums, setAlbums] = useState<AlbumRow[]>([]);
  const [sampleBookId, setSampleBookId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [note, setNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>(PaymentPlan.FULL);

  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<CreatedOrder | null>(null);

  useEffect(() => {
    if (!token) return;
    apiFetch<any>("/api/admin/sample-books?type=ALBUM&status=published&limit=100", token)
      .then((d) => setAlbums(d?.items ?? d ?? []))
      .catch(() => setAlbums([]));
  }, [token]);

  useEffect(() => {
    if (!token || !debouncedUserQuery) {
      setUserOptions([]);
      return;
    }
    apiFetch<any>(`/api/admin/users?search=${encodeURIComponent(debouncedUserQuery)}&limit=10`, token)
      .then((d) => setUserOptions(d?.users ?? d?.items ?? []))
      .catch(() => setUserOptions([]));
  }, [token, debouncedUserQuery]);

  const pickUser = (u: UserRow) => {
    setCustomerId(u.id);
    setUserQuery(u.name || u.email);
    setUserOptions([]);
    if (!name && u.name) setName(u.name);
    if (!phone && u.phone) setPhone(u.phone);
    if (!address && (u as any).address) setAddress((u as any).address);
  };

  const submit = async () => {
    if (!customerId || !sampleBookId) {
      showToast(t("admin.dispatch.albumOrderNeedCustomer"), "error");
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch<CreatedOrder>(
        "/api/admin/orders/album",
        token,
        {
          method: "POST",
          body: JSON.stringify({
            customerId,
            sampleBookId,
            quantity,
            name: name || undefined,
            phone: phone || undefined,
            address: address || undefined,
            city: city || undefined,
            note: note || undefined,
            paymentMethod,
          }),
        },
      );
      setCreated(res);
      onCreated();
      showToast(t("admin.dispatch.albumOrderCreated"), "success");
    } catch (e: any) {
      showToast(e?.message || t("admin.dispatch.albumOrderFailed"), "error");
    } finally {
      setSaving(false);
    }
  };

  const inputCls = input;
  const labelCls = "font-mono text-[9px] font-bold tracking-widest uppercase text-[#666] mb-1 block";

  return (
    <Modal
      open
      onClose={onClose}
      title={t("admin.dispatch.albumOrderTitle")}
      widthClass="max-w-lg"
      footer={
        created ? (
          <button onClick={onClose} className={`${neoBtnPrimary} w-full py-3 font-mono text-[10px] font-bold tracking-widest uppercase`}>
            {t("common.close")}
          </button>
        ) : (
          <button
            onClick={submit}
            disabled={saving || !customerId || !sampleBookId}
            className={`${neoBtnPrimary} w-full py-3 mt-6 font-mono text-[10px] font-bold tracking-widest uppercase disabled:opacity-40 disabled:pointer-events-none`}
          >
            {saving ? "..." : t("admin.dispatch.createAlbumOrder")}
          </button>
        )
      }
    >
      {created ? (
        <div className="flex flex-col items-center gap-3 py-2">
          <p className="font-mono text-[10px] font-bold tracking-widest uppercase text-[#666]">
            {t("admin.dispatch.orderCode")}: <span className="text-[#222]">{created.orderCode}</span>
          </p>
          {created.qrCode ? (
            <div className="bg-white rounded-[10px] border-[3px] border-[#222] shadow-[2px_2px_0_#222] p-3">
              <QRCodeSVG value={created.qrCode} size={192} level="M" />
            </div>
          ) : created.checkoutUrl ? (
            <a href={created.checkoutUrl} target="_blank" rel="noreferrer" className="font-mono text-[10px] font-bold text-[#1E88E5] break-all">
              {created.checkoutUrl}
            </a>
          ) : null}
          <p className="font-mono text-[10px] text-[#999] text-center">{t("admin.dispatch.sendQrToCustomer")}</p>
          <div className="flex gap-2 w-full">
            <button
              onClick={() => navigator.clipboard?.writeText(String(created.orderCode)).catch(() => {})}
              className="flex-1 font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-2 rounded-md border-2 border-[#222] bg-white"
            >
              {t("admin.dispatch.copyCode")}
            </button>
            {created.checkoutUrl && (
              <button
                onClick={() => navigator.clipboard?.writeText(String(created.checkoutUrl)).catch(() => {})}
                className="flex-1 font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-2 rounded-md border-2 border-[#222] bg-white"
              >
                {t("admin.dispatch.copyLink")}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1 py-1">
          <div className="relative">
            <label className={labelCls}>{t("admin.dispatch.customer")}</label>
            <input
              value={userQuery}
              onChange={(e) => {
                setUserQuery(e.target.value);
                setCustomerId(null);
              }}
              placeholder={t("admin.dispatch.searchCustomer")}
              className={inputCls}
            />
            {userOptions.length > 0 && (
              <div className="absolute z-10 left-0 right-0 mt-1 bg-white rounded-[8px] border-2 border-[#222] shadow-[3px_3px_0_#222] overflow-hidden max-h-44 overflow-y-auto">
                {userOptions.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => pickUser(u)}
                    className="w-full text-left px-3 py-2 hover:bg-[#FFF7D6] transition-colors"
                  >
                    <p className="text-xs font-bold">{u.name || u.email}</p>
                    <p className="font-mono text-[9px] text-[#999]">{u.email}{u.phone ? ` · ${u.phone}` : ""}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className={labelCls}>{t("admin.dispatch.album")}</label>
            <NeoSelect
              value={sampleBookId ? String(sampleBookId) : ""}
              onChange={(v) => setSampleBookId(Number(v))}
              placeholder={t("admin.dispatch.selectAlbum")}
              className="w-full"
              options={albums.map((a) => ({
                value: String(a.id),
                label: `${a.name}${a.quantity != null ? ` (${a.quantity})` : ""}`,
              }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{t("admin.dispatch.quantity")}</label>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>{t("admin.dispatch.paymentMethod")}</label>
              <NeoSelect
                value={paymentMethod}
                onChange={setPaymentMethod}
                className="w-full"
                options={[
                  { value: PaymentPlan.FULL, label: t("admin.dispatch.payFull") },
                  { value: PaymentPlan.HALF, label: t("admin.dispatch.payHalf") },
                ]}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{t("admin.dispatch.name")}</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{t("admin.dispatch.phone")}</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{t("admin.dispatch.address")}</label>
              <input value={address} onChange={(e) => setAddress(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{t("customer.checkout.cityProvince")}</label>
              <input value={city} onChange={(e) => setCity(e.target.value)} className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>{t("admin.dispatch.note")}</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} />
          </div>
        </div>
      )}
    </Modal>
  );
}
