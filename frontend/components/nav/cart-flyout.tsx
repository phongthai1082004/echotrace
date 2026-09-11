"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { apiFetch } from "@/lib/api.fetch";

function itemThumb(item: any): string | null {
  return item.thumbnailUrl ?? item.coverUrl ?? null;
}

export function CartFlyout({ token }: { token?: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [cartCount, setCartCount] = useState(0);

  return (
    <div
      className="relative"
      onMouseEnter={() => {
        setOpen(true);
        if (token) {
          apiFetch<any>("/api/cart", token)
            .then((d) => {
              const items: any[] = d?.parsedItems ?? [];
              setCartItems(items);
              setCartCount(items.reduce((sum: number, i: any) => sum + (i.quantity || 1), 0));
            })
            .catch(() => {});
        }
      }}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label={t("nav.cart", { count: cartCount })}
          className="relative flex items-center justify-center w-10 h-10 sm:w-9 sm:h-9 rounded-[8px] border-[2px] border-[#222] shadow-[2px_2px_0_#222] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#222] transition-[transform,box-shadow] bg-[#FFF7D6]"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-[#222]"
        >
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
        {cartCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#222] text-white font-mono text-[7px] font-bold flex items-center justify-center leading-none">
            {cartCount > 9 ? "9+" : cartCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 pt-2">
          <div className="w-72 max-w-[calc(100vw-2rem)] bg-[#FFF7D6] rounded-[10px] border-[3px] border-[#222] shadow-[4px_4px_0_#222] overflow-hidden">
            <div className="px-4 py-3">
              <p
                suppressHydrationWarning
                className="font-mono text-[9px] font-bold tracking-widest uppercase text-[#666]"
              >
                {t("nav.cart", { count: cartCount })}
              </p>
            </div>
            <div className="border-t-[3px] border-[#222]">
              {cartItems.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p suppressHydrationWarning className="font-mono text-[10px] text-[#999]">
                    {t("nav.cartEmpty")}
                  </p>
                </div>
              ) : (
                <div className="max-h-[280px] overflow-y-auto">
                  {cartItems.slice(0, 5).map((item, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3 border-t-[3px] border-[#222]">
                      <div className="w-10 h-12 bg-[#e8e6e0] rounded-[8px] border-2 border-[#222] shrink-0 overflow-hidden">
                        {itemThumb(item) && <img src={itemThumb(item)!} alt="" className="w-full h-full object-cover" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p suppressHydrationWarning className="text-sm font-bold leading-tight truncate">
                          {item.title}
                        </p>
                        <p suppressHydrationWarning className="font-mono text-[9px] text-[#999] mt-0.5">
                          {item.cover === "softcover" ? t("nav.softcover") : item.cover} · {item.pages} pg
                        </p>
                      </div>
                      <p suppressHydrationWarning className="font-mono text-[10px] font-bold shrink-0">
                        x{item.quantity || 1}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Link
              href="/checkout"
              suppressHydrationWarning
              className="block w-full text-center border-t-[3px] border-[#222] font-mono text-[10px] font-bold tracking-widest uppercase px-4 py-3 hover:bg-[#222] hover:text-white transition-colors"
            >
              {t("nav.viewCart")}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
