"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

interface UserProfile {
  id: number; email: string | null; username: string | null; name: string | null;
  avatar: string | null; phone: string | null; address: string | null; city: string | null;
  role: string; status: string | null;
}

export default function AccountPage() {
  const { data: session } = useSession();
  const accessToken = (session as any)?.accessToken;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ username: "", name: "", email: "", phone: "", address: "", city: "", avatar: "" });
  const [passwordForm, setPasswordForm] = useState({ current: "", newPass: "", confirm: "" });
  const [changingPassword, setChangingPassword] = useState(false);

  const api = (path: string, init?: RequestInit) =>
    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}`, ...init?.headers },
    });

  useEffect(() => {
    if (!accessToken) return;
    api("/api/user/profile").then(r => r.json()).then(d => {
      if (!d?.data) return;
      const p = d.data;
      setProfile(p);
      setForm({ username: p.username || "", name: p.name || "", email: p.email || "", phone: p.phone || "", address: p.address || "", city: p.city || "", avatar: p.avatar || "" });
    }).catch(() => {});
  }, [accessToken]);

  const handleSave = async () => {
    setSaving(true);
    const r = await api("/api/user/profile", { method: "PUT", body: JSON.stringify(form) });
    const d = await r.json();
    if (d.success) setProfile(d.data);
    setSaving(false);
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPass !== passwordForm.confirm) return;
    setChangingPassword(true);
    await api("/api/user/change-password", { method: "PUT", body: JSON.stringify(passwordForm) });
    setPasswordForm({ current: "", newPass: "", confirm: "" });
    setChangingPassword(false);
  };

  if (!session) return <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center"><p className="font-['JetBrains_Mono'] text-[10px] tracking-widest">Loading…</p></div>;

  return (
    <div className="min-h-screen bg-[#FDFBF7] pt-15">
      <div className="max-w-5xl mx-auto flex flex-col lg:flex-row" style={{ minHeight: "calc(100vh - 60px)" }}>
        <aside className="lg:w-48 shrink-0 py-10 lg:py-12 px-8 lg:px-0 lg:pl-8" style={{ borderRight: "0.5px solid #dbdad6" }}>
          <p className="font-['JetBrains_Mono'] text-[9px] tracking-widest uppercase mb-4" style={{ color: "rgba(26,26,26,0.3)" }}>Navigation</p>
          <div className="space-y-1">
            <button className="w-full text-left font-['JetBrains_Mono'] text-[10px] tracking-widest uppercase px-4 py-2.5 bg-[#1a1a1a] text-[#FDFBF7]">Account</button>
          </div>
        </aside>

        <main className="flex-1 py-10 lg:py-12 px-8 lg:px-14">
          <h1 className="font-['Playfair_Display'] text-3xl lg:text-4xl text-[#1a1a1a] mb-1">Account</h1>
          <p className="font-['Inter'] text-sm mb-10" style={{ color: "rgba(26,26,26,0.5)" }}>Manage your profile and account settings.</p>

          <div className="max-w-2xl space-y-8">
            <div className="flex items-start gap-5">
              <div className="w-14 h-14 rounded-full bg-[#e8e6e0] overflow-hidden shrink-0 flex items-center justify-center">
                {form.avatar ? (
                  <img src={form.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="font-['JetBrains_Mono'] text-lg text-[#1a1a1a]/30">
                    {(form.name || form.username || "?").charAt(0).toLocaleUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-['Inter'] text-sm font-medium text-[#1a1a1a]">{form.name || form.username || "User"}</p>
                <p className="font-['JetBrains_Mono'] text-[9px] tracking-widest mb-2" style={{ color: "rgba(26,26,26,0.3)" }}>
                  {profile?.role || "MEMBER"} · {profile?.status || "ACTIVE"}
                </p>
                <input type="url" value={form.avatar} onChange={e => setForm(p => ({ ...p, avatar: e.target.value }))}
                  placeholder="https://example.com/avatar.jpg"
                  className="w-full bg-transparent font-['Inter'] text-sm text-[#1a1a1a] pb-1.5 focus:outline-none"
                  style={{ borderBottom: "0.5px solid #dbdad6" }} />
                <p className="font-['JetBrains_Mono'] text-[8px] mt-1" style={{ color: "rgba(26,26,26,0.25)" }}>Paste an image URL for your avatar</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
              {[
                { key: "username" as const, label: "Username", type: "text", placeholder: "yourname" },
                { key: "name" as const, label: "Display Name", type: "text", placeholder: "Your Name" },
                { key: "email" as const, label: "Email", type: "email", placeholder: "you@example.com" },
                { key: "phone" as const, label: "Phone", type: "tel", placeholder: "+84 123 456 789" },
                { key: "address" as const, label: "Address", type: "text", placeholder: "123 Street Name" },
                { key: "city" as const, label: "City", type: "text", placeholder: "Ho Chi Minh City" },
              ].map(({ key, label, type, placeholder }) => (
                <div key={key}>
                  <label className="font-['JetBrains_Mono'] text-[10px] tracking-widest uppercase block mb-1.5" style={{ color: "rgba(26,26,26,0.45)" }}>{label}</label>
                  <input type={type} value={form[key]} placeholder={placeholder}
                    onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                    className="w-full bg-transparent font-['Inter'] text-sm text-[#1a1a1a] pb-2 focus:outline-none placeholder:text-[#1a1a1a]/20"
                    style={{ borderBottom: "0.5px solid #dbdad6" }} />
                </div>
              ))}
            </div>

            <button onClick={handleSave} disabled={saving}
              className="font-['JetBrains_Mono'] text-[10px] tracking-widest uppercase px-7 py-3 bg-[#1a1a1a] text-[#FDFBF7] hover:bg-[#0D1F1A] disabled:opacity-50">
              {saving ? "Saving…" : "Save Changes"}
            </button>

            <div style={{ borderTop: "0.5px solid #dbdad6" }} className="pt-8">
              <h2 className="font-['Playfair_Display'] text-xl lg:text-2xl text-[#1a1a1a] mb-5">Change Password</h2>
              <div className="space-y-4 max-w-sm">
                {[
                  { key: "current" as const, label: "Current Password", type: "password" },
                  { key: "newPass" as const, label: "New Password", type: "password" },
                  { key: "confirm" as const, label: "Confirm New Password", type: "password" },
                ].map(({ key, label, type }) => (
                  <div key={key}>
                    <label className="font-['JetBrains_Mono'] text-[10px] tracking-widest uppercase block mb-1.5" style={{ color: "rgba(26,26,26,0.45)" }}>{label}</label>
                    <input type={type} value={passwordForm[key]} onChange={e => setPasswordForm(p => ({ ...p, [key]: e.target.value }))}
                      className="w-full bg-transparent font-['Inter'] text-sm text-[#1a1a1a] pb-2 focus:outline-none"
                      style={{ borderBottom: "0.5px solid #dbdad6" }} />
                  </div>
                ))}
              </div>
              <button onClick={handleChangePassword} disabled={changingPassword || !passwordForm.current || !passwordForm.newPass || passwordForm.newPass !== passwordForm.confirm}
                className="mt-5 font-['JetBrains_Mono'] text-[10px] tracking-widest uppercase px-7 py-3 bg-[#1a1a1a] text-[#FDFBF7] hover:bg-[#0D1F1A] disabled:opacity-50">
                {changingPassword ? "Updating…" : "Update Password"}
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
