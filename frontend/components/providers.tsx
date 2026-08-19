"use client";

import { useState, useRef, useEffect } from "react";
import { Grain } from "@/components/grain";
import { SessionProvider, signOut } from "next-auth/react";
import i18n from "@/lib/i18n";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

export function Providers({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<{ id: number; message: string }[]>([]);
  const patched = useRef(false);

  if (!patched.current) {
    patched.current = true;
    const orig = globalThis.fetch;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const res = await orig(input, init);
      if (res.status === 401 && typeof input === "string" && input.startsWith(BACKEND)) {
        try {
          const sessRes = await orig("/api/auth/session");
          if (sessRes.ok) {
            const session = await sessRes.json();
            if (session?.accessToken) {
              const retry = await orig(input, {
                ...init,
                headers: { ...init?.headers, Authorization: `Bearer ${session.accessToken}` },
              });
              if (retry.ok) return retry;
            }
          }
        } catch {
          /* fallthrough */
        }
        setToasts((prev) => [...prev, { id: Date.now(), message: i18n.t("common.loginRequired") }]);
        setTimeout(() => signOut({ callbackUrl: "/" }), 1500);
        return res;
      }
      return res;
    };
  }

  useEffect(() => {
    if (!toasts.length) return;
    const timer = setTimeout(() => setToasts([]), 4000);
    return () => clearTimeout(timer);
  }, [toasts]);

  return (
    <SessionProvider>
      <Grain />
      {children}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="bg-red-600 text-white px-4 py-3 rounded-lg text-sm font-medium shadow-lg animate-fadeIn"
          >
            {t.message}
          </div>
        ))}
      </div>
    </SessionProvider>
  );
}
