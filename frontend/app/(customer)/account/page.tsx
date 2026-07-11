"use client";
import { AccountSettings } from "@/components/account-settings";

export default function AccountPage() {
  return (
    <div className="min-h-screen pt-15">
      <div className="max-w-5xl mx-auto flex flex-col lg:flex-row" style={{ minHeight: "calc(100vh - 60px)" }}>
        <main className="flex-1 py-10 lg:py-12 px-8 lg:px-14">
          <h1 className="text-3xl lg:text-4xl font-bold mb-1">Account</h1>
          <p className="text-sm mb-10 text-[#666]">Manage your profile and account settings.</p>
          <div className="max-w-2xl"><AccountSettings /></div>
        </main>
      </div>
    </div>
  );
}
