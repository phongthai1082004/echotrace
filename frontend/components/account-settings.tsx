"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api.fetch";
import { uploadToCloudinary } from "@/lib/upload";
import { cloudinaryUrl } from "@/lib/cloudinary";
import { Profile } from "@/models/profile";
import { useToast } from "@/components/toast";

interface FormData { name: string; phone: string; address: string; city: string }
interface PasswordForm { currentPassword: string; newPassword: string; confirmPassword: string }

const initialPassword: PasswordForm = { currentPassword: "", newPassword: "", confirmPassword: "" };

function validatePhone(p: string): string | null {
  if (!p) return null;
  const cleaned = p.replace(/\s+/g, "");
  if (!/^(\+84|0)[1-9]\d{8,9}$/.test(cleaned)) return "Invalid phone format (+84 or 0, 10-11 digits)";
  return null;
}

export function AccountSettings() {
  const { data: session, update } = useSession();
  const { showToast } = useToast();
  const token = (session as any)?.accessToken;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tab, setTab] = useState("information");
  const [form, setForm] = useState<FormData>({ name: "", phone: "", address: "", city: "" });
  const [initialForm, setInitialForm] = useState<FormData | null>(null);
  const [passwordForm, setPasswordForm] = useState<PasswordForm>(initialPassword);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!token) return;
    apiFetch<Profile>("/api/user/profile", token).then((data) => {
      setProfile(data);
      if (data.avatar) update({ image: data.avatar });
      const f = { name: (data as any).name ?? "", phone: data.phone ?? "", address: (data as any).address ?? "", city: (data as any).city ?? "" };
      setForm(f);
      setInitialForm(f);
    }).catch(() => showToast("Failed to load profile", "error"));
  }, [token]);

  const hasChanges = initialForm !== null && (form.name !== initialForm.name || form.phone !== initialForm.phone || form.address !== initialForm.address || form.city !== initialForm.city);

  const handleSubmitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !profile || !hasChanges) return;
    const errs: Record<string, string> = {};
    const pErr = validatePhone(form.phone);
    if (pErr) errs.phone = pErr;
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;
    try {
      const updatedData = await apiFetch<Profile>("/api/user/profile", token, { method: "PUT", body: JSON.stringify(form) });
      setProfile(updatedData);
      const f = { name: (updatedData as any).name ?? "", phone: updatedData.phone ?? "", address: (updatedData as any).address ?? "", city: (updatedData as any).city ?? "" };
      setForm(f); setInitialForm(f); setFieldErrors({});
      update({ name: form.name });
      showToast("Profile updated successfully!", "success");
    } catch (err: any) {
      const msg = err.message || "";
      if (msg.toLowerCase().includes("phone")) setFieldErrors(e => ({ ...e, phone: msg }));
      else showToast(msg || "Failed to update profile", "error");
    }
  };

  const canSubmitPassword = profile?.hasPassword
    ? passwordForm.currentPassword.length > 0 && passwordForm.newPassword.length >= 6 && passwordForm.confirmPassword === passwordForm.newPassword
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
      showToast("Password updated successfully!", "success");
      window.location.reload();
    } catch (err: any) {
      showToast(err.message || "Failed to update password", "error");
    }
  };

  const blur = (field: string) => {
    if (field === "phone") setFieldErrors(e => ({ ...e, phone: validatePhone(form.phone) || "" }));
  };

  const inputClass = (field: string) =>
    `w-full bg-[#FFF7D6] text-sm font-bold rounded-lg px-3 py-2.5 border-2 transition-[border-color,box-shadow,transform] focus:outline-none focus:translate-x-px focus:translate-y-px focus:shadow-[1px_1px_0_#222] placeholder:text-[#999] ${
      fieldErrors[field] ? "border-[#B54843] shadow-[2px_2px_0_#B54843]" : "border-[#222] shadow-[2px_2px_0_#222]"
    }`;

  return (
    <>
      <div className="flex items-center gap-1 overflow-x-auto pb-2 border-b-[3px] border-[#222] mb-8">
        {["information", "reset-password"].map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`shrink-0 text-sm font-bold px-4 py-2 rounded-lg transition-[background-color,color,box-shadow] ${
              tab === t ? "bg-[#222] text-white shadow-[2px_2px_0_#222]" : "hover:bg-[#e8e6e0]"
            }`}>
            {t === "information" ? "Information" : "Reset Password"}
          </button>
        ))}
      </div>

      {tab === "information" && (
        <form onSubmit={handleSubmitProfile} className="space-y-8">
          <div className="flex items-center gap-6 mb-8">
            <div className="relative w-16 h-16 rounded-xl bg-[#FFF7D6] border-[3px] border-[#222] shadow-[3px_3px_0_#222] overflow-hidden shrink-0 flex items-center justify-center group">
              {profile?.avatar ? (
                <img src={cloudinaryUrl(profile.avatar)} alt="avatar" className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <span className="text-lg font-bold text-[#999]">{profile?.email?.charAt(0).toUpperCase() || "?"}</span>
              )}
              <label className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/40 transition-colors rounded-xl cursor-pointer">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
                </svg>
                <input type="file" accept="image/*" className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file || !token) return;
                    try {
                      const { url } = await uploadToCloudinary(file, "avatar", token);
                      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user/avatar`, {
                        method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                        body: JSON.stringify({ url }),
                      });
                      const json = await res.json();
                      if (!res.ok) throw new Error(json.message);
                      setProfile(json.data);
                      const u = json.data;
                      setForm({ name: u.name ?? "", phone: u.phone ?? "", address: u.address ?? "", city: u.city ?? "" });
                      setInitialForm({ name: u.name ?? "", phone: u.phone ?? "", address: u.address ?? "", city: u.city ?? "" });
                      update({ image: json.data.avatar });
                      showToast("Avatar updated!", "success");
                      window.location.reload();
                    } catch (err: any) { showToast(err.message || "Upload failed", "error"); }
                  }} />
              </label>
            </div>
            <div>
              <p className="text-sm font-bold">{profile?.email ?? "Unknown User"}</p>
              <p className="font-mono text-[9px] font-bold tracking-widest mt-0.5 text-[#999]">{profile?.role ?? "Member"} · ACTIVE</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
            <div className="sm:col-span-2">
              <label className="font-mono text-[10px] font-bold tracking-widest uppercase block mb-1.5 text-[#666]">Display Name</label>
              <input type="text" placeholder="Your Name" value={form.name} onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))} className={inputClass("name")} />
            </div>
            <div className="sm:col-span-2">
              <label className="font-mono text-[10px] font-bold tracking-widest uppercase block mb-2 text-[#666]">Email</label>
              {profile?.email ? (
                <div className="flex items-center justify-between py-2.5 px-3 bg-[#FFF7D6] rounded-lg border-2 border-[#222] shadow-[2px_2px_0_#222]">
                  <span className="text-sm font-bold">{profile.email}</span>
                  <span className="font-mono text-[8px] font-bold tracking-widest uppercase px-2 py-0.5 bg-[#5A8F4A] text-white rounded-md">Connected</span>
                </div>
              ) : (
                <button className="w-full flex items-center justify-between py-2.5 px-3 bg-[#FFF7D6] rounded-lg border-2 border-[#222] shadow-[2px_2px_0_#222] hover:translate-x-px hover:translate-y-[1px] hover:shadow-[1px_1px_0_#222] transition-[border-color,box-shadow,transform]">
                  <span className="text-sm text-[#999]">Not connected</span>
                  <span className="flex items-center gap-2 font-mono text-[8px] font-bold tracking-widest uppercase px-2.5 py-1 bg-[#222] text-white rounded-md">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Link Google
                  </span>
                </button>
              )}
            </div>
            <div className="sm:col-span-2">
              <label className="font-mono text-[10px] font-bold tracking-widest uppercase block mb-1.5 text-[#666]">Phone</label>
              <input type="tel" placeholder="+84 123 456 789" value={form.phone}
                onChange={(e) => { setForm(prev => ({ ...prev, phone: e.target.value })); setFieldErrors(e => ({ ...e, phone: "" })); }}
                onBlur={() => blur("phone")} className={inputClass("phone")} />
              {fieldErrors.phone && <p className="font-mono text-[9px] font-bold mt-1 text-[#B54843]">{fieldErrors.phone}</p>}
            </div>
            <div>
              <label className="font-mono text-[10px] font-bold tracking-widest uppercase block mb-1.5 text-[#666]">Address</label>
              <input type="text" placeholder="123 Street Name" value={form.address} onChange={(e) => setForm(prev => ({ ...prev, address: e.target.value }))} className={inputClass("address")} />
            </div>
            <div>
              <label className="font-mono text-[10px] font-bold tracking-widest uppercase block mb-1.5 text-[#666]">City</label>
              <input type="text" placeholder="Ho Chi Minh" value={form.city} onChange={(e) => setForm(prev => ({ ...prev, city: e.target.value }))} className={inputClass("city")} />
            </div>
          </div>

          <button type="submit" disabled={!hasChanges}
            className="font-mono text-[10px] font-bold tracking-widest uppercase px-7 py-3 rounded-[10px] border-[3px] transition-[background-color,color,border-color,box-shadow,transform]"
            style={{ background: hasChanges ? "#222" : "#999", color: "#fff", borderColor: hasChanges ? "#222" : "#999", boxShadow: hasChanges ? "4px 4px 0 #222" : "4px 4px 0 #999" }}>
            Save Changes
          </button>
        </form>
      )}

      {tab === "reset-password" && (
        <form onSubmit={handleChangePassword}>
          <h2 className="text-xl lg:text-2xl font-bold mb-5">{profile?.hasPassword ? "Change Password" : "Set Password"}</h2>
          <div className="space-y-4 max-w-sm">
            {profile?.hasPassword && (
              <div>
                <label className="font-mono text-[10px] font-bold tracking-widest uppercase block mb-1.5 text-[#666]">Current Password</label>
                <input type="password" value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm(p => ({ ...p, currentPassword: e.target.value }))}
                  className="w-full bg-[#FFF7D6] text-sm font-bold rounded-lg px-3 py-2.5 border-2 border-[#222] shadow-[2px_2px_0_#222] focus:outline-none focus:translate-x-px focus:translate-y-px focus:shadow-[1px_1px_0_#222] transition-[border-color,box-shadow,transform]" />
              </div>
            )}
            <div>
              <label className="font-mono text-[10px] font-bold tracking-widest uppercase block mb-1.5 text-[#666]">New Password</label>
              <input type="password" value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))}
                className="w-full bg-[#FFF7D6] text-sm font-bold rounded-lg px-3 py-2.5 border-2 border-[#222] shadow-[2px_2px_0_#222] focus:outline-none focus:translate-x-px focus:translate-y-px focus:shadow-[1px_1px_0_#222] transition-[border-color,box-shadow,transform]" />
            </div>
            <div>
              <label className="font-mono text-[10px] font-bold tracking-widest uppercase block mb-1.5 text-[#666]">Confirm New Password</label>
              <input type="password" value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))}
                className="w-full bg-[#FFF7D6] text-sm font-bold rounded-lg px-3 py-2.5 border-2 border-[#222] shadow-[2px_2px_0_#222] focus:outline-none focus:translate-x-px focus:translate-y-px focus:shadow-[1px_1px_0_#222] transition-[border-color,box-shadow,transform]" />
              {passwordForm.confirmPassword && passwordForm.confirmPassword !== passwordForm.newPassword && (
                <p className="font-mono text-[9px] font-bold mt-1 text-[#B54843]">Passwords do not match</p>
              )}
              {passwordForm.newPassword && passwordForm.newPassword.length < 6 && (
                <p className="font-mono text-[9px] font-bold mt-1 text-[#B54843]">Minimum 6 characters</p>
              )}
            </div>
          </div>
          <button type="submit" disabled={!canSubmitPassword}
            className="mt-5 font-mono text-[10px] font-bold tracking-widest uppercase px-7 py-3 rounded-[10px] border-[3px] transition-[background-color,color,border-color,box-shadow,transform]"
            style={{ background: canSubmitPassword ? "#222" : "#999", color: "#fff", borderColor: canSubmitPassword ? "#222" : "#999", boxShadow: canSubmitPassword ? "4px 4px 0 #222" : "4px 4px 0 #999" }}>
            {profile?.hasPassword ? "Update Password" : "Set Password"}
          </button>
        </form>
      )}
    </>
  );
}
