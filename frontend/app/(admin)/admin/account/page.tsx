"use client";
import { AccountSettings } from "@/components/account-settings";
import { AdminHeader } from "@/components/admin-header";

export default function AdminAccountPage() {
  return (
    <div>
      <AdminHeader label="Admin — Account" title="Account Settings" />
      <div className="px-8 py-8 max-w-2xl">
        <AccountSettings />
      </div>
    </div>
  );
}
