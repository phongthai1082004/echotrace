"use client";

import Link from "next/link";
import Image from "next/image";
import { useTranslation } from "react-i18next";
import logoImg from "@/assets/images/Logo.png";

// ponytail: trang tĩnh, không gọi API/session — sống được cả khi backend bảo trì.
export default function MaintenancePage() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F2E5] px-4">
      <div className="max-w-md w-full text-center bg-[#FFF7D6] rounded-[12px] border-[3px] border-[#222] shadow-[6px_6px_0_#222] p-8">
        <Image src={logoImg} alt="Better Memoire" style={{ height: 72, width: "auto" }} className="mx-auto mb-5" priority />
        <h1 className="text-2xl font-bold mb-2">{t("maintenance.title")}</h1>
        <p className="text-sm text-[#666] mb-6">{t("maintenance.desc")}</p>
        <Link
          href="/"
          className="inline-block font-mono text-[11px] font-bold tracking-widest uppercase px-5 py-2.5 rounded-[8px] border-[2px] border-[#222] shadow-[2px_2px_0_#222] bg-[#222] text-white hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#222] transition-[transform,box-shadow]"
        >
          {t("maintenance.retry")}
        </Link>
      </div>
    </div>
  );
}
