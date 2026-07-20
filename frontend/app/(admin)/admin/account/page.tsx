"use client";
import { useTranslation } from "react-i18next";
import { AccountSettings } from "@/components/account-settings";
import { AdminHeader } from "@/components/admin-header";

export default function AdminAccountPage() {
  const { t } = useTranslation();
  
  return (
    <div>
      <AdminHeader label={t("admin.adminAccount.label")} title={t("admin.adminAccount.title")} />
      <div className="px-8 max-[1600px]:px-6 max-[1440px]:px-5 max-[1280px]:px-4 py-8 max-[1600px]:py-6 max-[1440px]:py-5 max-w-2xl">
        <AccountSettings />
      </div>
    </div>
  );
}
