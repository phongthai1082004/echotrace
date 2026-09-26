"use client";

import { useEffect } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { setAnalyticsDisabled } from "@/lib/analytics";

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

// doesn't fire page_view by itself). Renders nothing without an ID —
// và tắt hẳn khi là admin (admin xài chung studio, đo vào là bẩn số marketing).
export function GoogleAnalytics() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const isAdmin = (session?.user as any)?.role === "admin";

  useEffect(() => {
    setAnalyticsDisabled(isAdmin);
  }, [isAdmin]);

  useEffect(() => {
    if (!GA_ID || isAdmin) return;
    try {
      (window as any)?.gtag?.("config", GA_ID, { page_path: pathname });
    } catch {}
  }, [pathname, isAdmin]);

  if (!GA_ID || isAdmin) return null;
  if (status === "loading") return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script id="ga-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');`}
      </Script>
    </>
  );
}
