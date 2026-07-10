"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api.fetch";
import { Profile } from "@/models/profile";
import { SidebarNav } from "@/components/sidebar-nav";

const NAV_ITEMS = [
  { value: "information", label: "Information" },
  { value: "reset-password", label: "Reset Password" },
];

export default function AccountPage() {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activeTab, setActiveTab] = useState<string | null>("information");

  useEffect(() => {
    if (!token) return;
    apiFetch<Profile>("/api/user/profile", token)
      .then(setProfile)
      .catch(console.error);
  }, [token]);
  return (
    <div className="min-h-screen pt-15">
      <div className="max-w-5xl mx-auto flex flex-col lg:flex-row" style={{ minHeight: "calc(100vh - 60px)" }}>
        
        <SidebarNav
          title="Navigation"
          items={NAV_ITEMS}
          activeItem={activeTab}
          onSelect={setActiveTab}
          hideAll
        />

        <main className="flex-1 py-10 lg:py-12 px-8 lg:px-14">
          <h1 className="text-3xl lg:text-4xl font-bold mb-1">{activeTab === "reset-password" ? "Reset Password" : "Account"}</h1>
          <p className="text-sm mb-10 text-[#666]">{activeTab === "reset-password" ? "Update your password to keep your account secure." : "Manage your profile and account settings."}</p>

          <div className="max-w-2xl space-y-8">
            
            {activeTab === "information" && (
              <>
                <div className="flex items-center gap-6">
                  <div className="relative w-16 h-16 rounded-xl bg-[#FFF7D6] border-[3px] border-[#222] shadow-[3px_3px_0_#222] overflow-hidden shrink-0 flex items-center justify-center group">
                    <span className="text-lg font-bold text-[#999]">A</span>
                    <label className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/40 transition-colors rounded-[12px] cursor-pointer">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                        <circle cx="12" cy="13" r="4"/>
                      </svg>
                      <input type="file" accept="image/*" className="hidden" />
                    </label>
                  </div>
                  <div>
                    <p className="text-sm font-bold">{profile?.username ?? profile?.email ?? "Unknown User"}</p>
                    <p className="font-mono text-[9px] font-bold tracking-widest mt-0.5 text-[#999]">
                      {profile?.role ?? "Member"} · ACTIVE
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                  <div>
                    <label className="font-mono text-[10px] font-bold tracking-widest uppercase block mb-1.5 text-[#666]">Username</label>
                    <input type="text" placeholder="yourname" 
                      className="w-full bg-[#FFF7D6] text-sm font-bold rounded-[8px] px-3 py-2.5 border-[2px] border-[#222] shadow-[2px_2px_0_#222] focus:outline-none focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-[1px_1px_0_#222] placeholder:text-[#999] transition-all" />
                  </div>

                  <div>
                    <label className="font-mono text-[10px] font-bold tracking-widest uppercase block mb-1.5 text-[#666]">Display Name</label>
                    <input type="text" placeholder="Your Name"
                      className="w-full bg-[#FFF7D6] text-sm font-bold rounded-[8px] px-3 py-2.5 border-[2px] border-[#222] shadow-[2px_2px_0_#222] focus:outline-none focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-[1px_1px_0_#222] placeholder:text-[#999] transition-all" />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="font-mono text-[10px] font-bold tracking-widest uppercase block mb-2 text-[#666]">Email</label>
                    {profile?.email ? (
                      <div className="flex items-center justify-between py-2.5 px-3 bg-[#FFF7D6] rounded-[8px] border-[2px] border-[#222] shadow-[2px_2px_0_#222]">
                        <span className="text-sm font-bold">{profile.email}</span>
                        <span className="font-mono text-[8px] font-bold tracking-widest uppercase px-2 py-0.5 bg-[#5A8F4A] text-white rounded-[4px]">
                          Connected
                        </span>
                      </div>
                    ) : (
                      <button className="w-full flex items-center justify-between py-2.5 px-3 bg-[#FFF7D6] rounded-[8px] border-[2px] border-[#222] shadow-[2px_2px_0_#222] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#222] transition-all">
                        <span className="text-sm text-[#999]">Not connected</span>
                        <span className="flex items-center gap-2 font-mono text-[8px] font-bold tracking-widest uppercase px-2.5 py-1 bg-[#222] text-white rounded-[4px]">
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
                    <label className="font-mono text-[10px] font-bold tracking-widest uppercase block mb-2 text-[#666]">Phone</label>
                    {profile?.phone ? (
                      <div className="flex items-center justify-between py-2.5 px-3 bg-[#FFF7D6] rounded-[8px] border-[2px] border-[#222] shadow-[2px_2px_0_#222]">
                        <span className="text-sm font-bold">{profile.phone}</span>
                        <span className="font-mono text-[8px] font-bold tracking-widest uppercase px-2 py-0.5 bg-[#5A8F4A] text-white rounded-[4px]">
                          Connected
                        </span>
                      </div>
                    ) : (
                      <button className="w-full flex items-center justify-between py-2.5 px-3 bg-[#FFF7D6] rounded-[8px] border-[2px] border-[#222] shadow-[2px_2px_0_#222] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#222] transition-all">
                        <span className="text-sm text-[#999]">Not connected</span>
                        <span className="font-mono text-[8px] font-bold tracking-widest uppercase px-2.5 py-1 bg-[#222] text-white rounded-[4px]">
                          Link Phone
                        </span>
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="font-mono text-[10px] font-bold tracking-widest uppercase block mb-1.5 text-[#666]">Address</label>
                    <input type="text" placeholder="123 Street Name"
                      className="w-full bg-[#FFF7D6] text-sm font-bold rounded-[8px] px-3 py-2.5 border-[2px] border-[#222] shadow-[2px_2px_0_#222] focus:outline-none focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-[1px_1px_0_#222] placeholder:text-[#999] transition-all" />
                  </div>

                  <div>
                    <label className="font-mono text-[10px] font-bold tracking-widest uppercase block mb-1.5 text-[#666]">City</label>
                    <input type="text" placeholder="Ho Chi Minh"
                      className="w-full bg-[#FFF7D6] text-sm font-bold rounded-[8px] px-3 py-2.5 border-[2px] border-[#222] shadow-[2px_2px_0_#222] focus:outline-none focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-[1px_1px_0_#222] placeholder:text-[#999] transition-all" />
                  </div>
                </div>

                <button className="font-mono text-[10px] font-bold tracking-widest uppercase px-7 py-3 bg-[#222] text-white rounded-[10px] border-[3px] border-[#222] shadow-[4px_4px_0_#222] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#222] transition-all">
                  Save Changes
                </button>
              </>
            )}

            {activeTab === "reset-password" && (
              <div>
                <h2 className="text-xl lg:text-2xl font-bold mb-5">Change Password</h2>
                <div className="space-y-4 max-w-sm">
                  <div>
                    <label className="font-mono text-[10px] font-bold tracking-widest uppercase block mb-1.5 text-[#666]">Current Password</label>
                    <input type="password" className="w-full bg-[#FFF7D6] text-sm font-bold rounded-[8px] px-3 py-2.5 border-[2px] border-[#222] shadow-[2px_2px_0_#222] focus:outline-none focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-[1px_1px_0_#222] transition-all" />
                  </div>
                  <div>
                    <label className="font-mono text-[10px] font-bold tracking-widest uppercase block mb-1.5 text-[#666]">New Password</label>
                    <input type="password" className="w-full bg-[#FFF7D6] text-sm font-bold rounded-[8px] px-3 py-2.5 border-[2px] border-[#222] shadow-[2px_2px_0_#222] focus:outline-none focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-[1px_1px_0_#222] transition-all" />
                  </div>
                  <div>
                    <label className="font-mono text-[10px] font-bold tracking-widest uppercase block mb-1.5 text-[#666]">Confirm New Password</label>
                    <input type="password" className="w-full bg-[#FFF7D6] text-sm font-bold rounded-[8px] px-3 py-2.5 border-[2px] border-[#222] shadow-[2px_2px_0_#222] focus:outline-none focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-[1px_1px_0_#222] transition-all" />
                  </div>
                </div>
                
                <button className="mt-5 font-mono text-[10px] font-bold tracking-widest uppercase px-7 py-3 bg-[#222] text-white rounded-[10px] border-[3px] border-[#222] shadow-[4px_4px_0_#222] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#222] transition-all">
                  Update Password
                </button>
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}
