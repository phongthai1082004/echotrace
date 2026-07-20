"use client";
import { useTranslation } from "react-i18next";
import { AccountSettings } from "@/components/account-settings";

export default function AccountPage() {
  const { t } = useTranslation();
  
  return (
    <div className="min-h-screen pt-15">
      <div className="max-w-5xl mx-auto flex flex-col lg:flex-row" style={{ minHeight: "calc(100vh - 60px)" }}>
        <main className="flex-1 py-10 lg:py-12 px-8 max-[1600px]:px-6 max-[1440px]:px-5 max-[1280px]:px-4 lg:px-14">
          <div className="flex items-start justify-between mb-10">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold mb-1">{t("customer.account.title")}</h1>
              <p className="text-sm text-[#666]">{t("customer.account.subtitle")}</p>
            </div>
          </div>
          <div className="max-w-2xl"><AccountSettings /></div>
        </main>
      </div>
    </div>
  );
}
