"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslation } from "react-i18next";
import Image from "next/image";
import { apiFetch } from "@/lib/api.fetch";
import { ProfileDTO } from "@echotrace/shared";
import { useToast } from "@/components/toast";
import { SkeletonForm } from "@/components/skeleton";
import { LanguageSwitcher } from "@/components/language-switcher";
import { input, infoBox, neoBtnSm, neoBtnPrimarySm } from "@/lib/styles";

interface FormData {
  name: string;
  phone: string;
  address: string;
  city: string;
}
interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const initialPassword: PasswordForm = { currentPassword: "", newPassword: "", confirmPassword: "" };

function validatePhone(p: string, t: (k: string) => string): string | null {
  if (!p) return null;
  const cleaned = p.replace(/\s+/g, "");
  if (!/^(\+84|0)[1-9]\d{8,9}$/.test(cleaned)) return t("account.invalidPhone");
  return null;
}

export function AccountSettings() {
  const { t } = useTranslation();
  const { data: session, update } = useSession();
  const { showToast } = useToast();
  const token = (session as any)?.accessToken;
  const [profile, setProfile] = useState<ProfileDTO | null>(null);
  const [tab, setTab] = useState<"information" | "reset-password" | "language">("information");
  const [form, setForm] = useState<FormData>({ name: "", phone: "", address: "", city: "" });
  const [initialForm, setInitialForm] = useState<FormData | null>(null);
  const [passwordForm, setPasswordForm] = useState<PasswordForm>(initialPassword);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    apiFetch<ProfileDTO>("/api/user/profile", token)
      .then((data) => {
        setProfile(data);
        if (data.avatar) update({ image: data.avatar });
        const f = {
          name: (data as any).name ?? "",
          phone: data.phone ?? "",
          address: (data as any).address ?? "",
          city: (data as any).city ?? "",
        };
        setForm(f);
        setInitialForm(f);
      })
      .catch(() => showToast(t("account.loadProfileFailed"), "error"))
      .finally(() => setLoading(false));
  }, [token]);

  const hasChanges =
    initialForm !== null &&
    (form.name !== initialForm.name ||
      form.phone !== initialForm.phone ||
      form.address !== initialForm.address ||
      form.city !== initialForm.city);

  const handleSubmitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !profile || !hasChanges) return;
    const errs: Record<string, string> = {};
    const pErr = validatePhone(form.phone, t);
    if (pErr) errs.phone = pErr;
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;
    try {
      const updatedData = await apiFetch<ProfileDTO>("/api/user/profile", token, {
        method: "PUT",
        body: JSON.stringify(form),
      });
      setProfile(updatedData);
      const f = {
        name: (updatedData as any).name ?? "",
        phone: updatedData.phone ?? "",
        address: (updatedData as any).address ?? "",
        city: (updatedData as any).city ?? "",
      };
      setForm(f);
      setInitialForm(f);
      setFieldErrors({});
      update({ name: form.name });
      showToast(t("account.profileUpdated"), "success");
    } catch (err: any) {
      const msg = err.message || "";
      if (msg.toLowerCase().includes("phone")) setFieldErrors((e) => ({ ...e, phone: msg }));
      else showToast(msg || t("account.profileUpdateFailed"), "error");
    }
  };

  const canSubmitPassword = profile?.hasPassword
    ? passwordForm.currentPassword.length > 0 &&
      passwordForm.newPassword.length >= 6 &&
      passwordForm.confirmPassword === passwordForm.newPassword
    : passwordForm.newPassword.length >= 6 && passwordForm.confirmPassword === passwordForm.newPassword;

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !canSubmitPassword) return;
    setFieldErrors({});
    try {
      const body: any = { newPassword: passwordForm.newPassword };
      if (profile?.hasPassword) body.currentPassword = passwordForm.currentPassword;
      await apiFetch("/api/user/change-password", token, { method: "PUT", body: JSON.stringify(body) });
      setPasswordForm(initialPassword);
      showToast(t("account.passwordUpdated"), "success");
      window.location.reload();
    } catch (err: any) {
      showToast(err.message || t("account.passwordUpdateFailed"), "error");
    }
  };

  const blur = (field: string) => {
    if (field === "phone")
      setFieldErrors((e) => ({ ...e, phone: validatePhone(form.phone, t) ? t("account.invalidPhone") : "" }));
  };

  const inputClass = (field: string) =>
    `${input} transition-[border-color,box-shadow,transform] ${
      fieldErrors[field] ? "border-[#B54843] shadow-[2px_2px_0_#B54843]" : ""
    }`;

  return (
    <>
      <div className="flex items-center gap-1 overflow-x-auto pb-2 border-b-[3px] border-[#222] mb-8">
        {[
          { id: "information" as const, label: t("account.information") },
          { id: "reset-password" as const, label: t("account.changePassword") },
          { id: "language" as const, label: t("account.language") },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`shrink-0 text-sm font-bold px-4 py-2 rounded-lg ${t.id === tab ? neoBtnPrimarySm : `${neoBtnSm} text-[#999] hover:text-[#222]`}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <SkeletonForm />
      ) : (
        tab === "information" && (
          <form onSubmit={handleSubmitProfile} className="space-y-8">
            <div className="flex items-center gap-6 mb-8">
              <div className="relative w-16 h-16 rounded-xl bg-[#FFF7D6] border-[3px] border-[#222] shadow-[3px_3px_0_#222] overflow-hidden shrink-0 flex items-center justify-center">
                {profile?.avatar ? (
                  <Image src={profile.avatar} alt="avatar" width={64} height={64} className="object-cover" />
                ) : (
                  <span className="text-lg font-bold text-[#999]">
                    {profile?.email?.charAt(0).toUpperCase() || "?"}
                  </span>
                )}
              </div>
              <div>
                <p className="text-sm font-bold">{profile?.email ?? t("account.unknownUser")}</p>
                <p className="font-mono text-[9px] font-bold tracking-widest mt-0.5 text-[#999]">
                  {profile?.role ?? t("account.member")} · {t("account.active")}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
              <div className="sm:col-span-2">
                <label className="font-mono text-[10px] font-bold tracking-widest uppercase block mb-1.5 text-[#666]">
                  {t("account.displayName")}
                </label>
                <input
                  type="text"
                  placeholder={t("account.namePlaceholder")}
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className={inputClass("name")}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="font-mono text-[10px] font-bold tracking-widest uppercase block mb-2 text-[#666]">
                  {t("account.email")}
                </label>
                {profile?.email ? (
                  <input
                    readOnly
                    value={profile.email}
                    aria-label={t("account.email")}
                    className={`${input} cursor-default`}
                  />
                ) : (
                  <button className={`w-full flex items-center justify-between py-2.5 px-3 ${infoBox} hover:translate-x-px hover:translate-y-[1px] hover:shadow-[1px_1px_0_#222] transition-[border-color,box-shadow,transform] cursor-pointer`}>
                    <span className="text-sm text-[#999]">{t("account.notConnected")}</span>
                    <span className="flex items-center gap-2 font-mono text-[8px] font-bold tracking-widest uppercase px-2.5 py-1 bg-[#222] text-white rounded-md">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      {t("account.linkGoogle")}
                    </span>
                  </button>
                )}
              </div>
              <div className="sm:col-span-2">
                <label className="font-mono text-[10px] font-bold tracking-widest uppercase block mb-1.5 text-[#666]">
                  {t("account.phone")}
                </label>
                <input
                  type="tel"
                  placeholder={t("account.phonePlaceholder")}
                  value={form.phone}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, phone: e.target.value }));
                    setFieldErrors((e) => ({ ...e, phone: "" }));
                  }}
                  onBlur={() => blur("phone")}
                  className={inputClass("phone")}
                />
                {fieldErrors.phone && (
                  <p className="font-mono text-[9px] font-bold mt-1 text-[#B54843]">{fieldErrors.phone}</p>
                )}
              </div>
              <div>
                <label className="font-mono text-[10px] font-bold tracking-widest uppercase block mb-1.5 text-[#666]">
                  {t("account.address")}
                </label>
                <input
                  type="text"
                  placeholder={t("account.addressPlaceholder")}
                  value={form.address}
                  onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                  className={inputClass("address")}
                />
              </div>
              <div>
                <label className="font-mono text-[10px] font-bold tracking-widest uppercase block mb-1.5 text-[#666]">
                  {t("account.city")}
                </label>
                <input
                  type="text"
                  placeholder={t("account.cityPlaceholder")}
                  value={form.city}
                  onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                  className={inputClass("city")}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!hasChanges}
              className={`${hasChanges ? "bg-[#222] text-white" : "bg-[#999] text-white"} font-mono text-[10px] font-bold tracking-widest uppercase px-7 py-3 rounded-[10px] border-[3px] transition-all disabled:opacity-40`}
              style={{
                borderColor: hasChanges ? "#222" : "#999",
                boxShadow: hasChanges ? "4px 4px 0 #222" : "4px 4px 0 #999",
              }}
            >
              {t("account.saveChanges")}
            </button>
          </form>
        )
      )}

      {tab === "reset-password" && (
        <form onSubmit={handleChangePassword}>
          <h2 className="text-xl lg:text-2xl font-bold mb-5">
            {profile?.hasPassword ? t("account.changePassword") : t("account.setPassword")}
          </h2>
          <div className="space-y-4 max-w-sm">
            {profile?.hasPassword && (
              <div>
                <label className="font-mono text-[10px] font-bold tracking-widest uppercase block mb-1.5 text-[#666]">
                  {t("account.currentPassword")}
                </label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))}
                  className={input}
                />
              </div>
            )}
            <div>
              <label className="font-mono text-[10px] font-bold tracking-widest uppercase block mb-1.5 text-[#666]">
                {t("account.newPassword")}
              </label>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
                className={input}
              />
            </div>
            <div>
              <label className="font-mono text-[10px] font-bold tracking-widest uppercase block mb-1.5 text-[#666]">
                {t("account.confirmNewPassword")}
              </label>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                className={input}
              />
              {passwordForm.confirmPassword && passwordForm.confirmPassword !== passwordForm.newPassword && (
                <p className="font-mono text-[9px] font-bold mt-1 text-[#B54843]">{t("account.passwordMismatch")}</p>
              )}
              {passwordForm.newPassword && passwordForm.newPassword.length < 6 && (
                <p className="font-mono text-[9px] font-bold mt-1 text-[#B54843]">{t("account.minLength")}</p>
              )}
            </div>
          </div>
          <button
            type="submit"
            disabled={!canSubmitPassword}
            className={`${canSubmitPassword ? "bg-[#222] text-white" : "bg-[#999] text-white"} mt-5 font-mono text-[10px] font-bold tracking-widest uppercase px-7 py-3 rounded-[10px] border-[3px] transition-all disabled:opacity-40`}
            style={{
              borderColor: canSubmitPassword ? "#222" : "#999",
              boxShadow: canSubmitPassword ? "4px 4px 0 #222" : "4px 4px 0 #999",
            }}
          >
            {profile?.hasPassword ? t("account.updatePassword") : t("account.setPassword")}
          </button>
        </form>
      )}

      {tab === "language" && (
        <div className="max-w-md">
          <h2 className="text-xl lg:text-2xl font-bold mb-5">{t("account.language")}</h2>
          <p className="text-sm text-[#666] mb-6">{t("account.languageDescription")}</p>
          <LanguageSwitcher inline />
        </div>
      )}
    </>
  );
}
