"use client";
import { label } from "@/lib/styles";
import { AccountSettings } from "@/components/account-settings";

export default function AdminAccountPage() {
  return (
    <div>
      <div className="px-8 py-8 border-b-[3px] border-[#222]">
        <p className={`${label} mb-1 text-[#666]`}>Admin — Account</p>
        <h1 className="text-3xl font-bold">Account Settings</h1>
      </div>
      <div className="px-8 py-8 max-w-2xl">
        <AccountSettings />
      </div>
    </div>
  );
}
