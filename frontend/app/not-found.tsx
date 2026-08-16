"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { useSession } from "next-auth/react";
import { roleHome } from "@/lib/routing";

export default function NotFound() {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const home = roleHome((session as { user?: { role?: string } } | null)?.user?.role);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-[#FFF7D6] relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-[0.35]" style={{ backgroundImage: "linear-gradient(#222 1px, transparent 1px), linear-gradient(90deg, #222 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
      <div className="relative w-full max-w-xl">
        <div className="bg-white rounded-[10px] border-[3px] border-[#222] shadow-[6px_6px_0_#222] p-10 max-[1600px]:p-8">
          <p className="font-mono text-[10px] font-bold tracking-widest uppercase mb-6 text-[#666]">{t("notFound.code")} · {t("brand")}</p>
          <h1 className="text-6xl lg:text-7xl font-bold leading-[0.9] mb-4">
            {t("notFound.code")}
          </h1>
          <h2 className="text-2xl font-bold mb-3">{t("notFound.title")}</h2>
          <p className="text-sm text-[#666] leading-relaxed mb-8 max-w-md">{t("notFound.desc")}</p>
          <Link href={home} className="inline-block bg-[#222] text-white font-bold text-[11px] tracking-widest uppercase py-4 px-6 rounded-[10px] border-[3px] border-[#222] shadow-[4px_4px_0_#222] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#222] transition-all text-center">
            {t("notFound.back")} →
          </Link>
        </div>
        <p className="font-mono text-[8px] font-bold tracking-widest uppercase text-[#999] mt-8 text-center">— 20.00° N, 000.00° E · off the map —</p>
      </div>
    </div>
  );
}