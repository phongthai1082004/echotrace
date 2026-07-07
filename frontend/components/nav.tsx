"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

interface NavProps {
  user?: { name?: string | null; email?: string | null; image?: string | null } | null;
}

export function Nav({ user }: NavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [dropdown, setDropdown] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const { data: session } = useSession();
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cartTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (pathname === "/auth") return null;

  const links = [
    { href: "/explore", label: "Explore" },
    { href: "/my-journals", label: "My Journals" },
    { href: "/studio", label: "Studio" },
    { href: "/orders", label: "Orders" },
  ];

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-40 bg-[#FDFBF7]/92 backdrop-blur-sm"
      style={{ borderBottom: "0.5px solid #dbdad6" }}
    >
      <div className="flex items-center justify-between px-8 h-15">
        <div className="flex items-center gap-10">
          <Link href="/" className="font-['Playfair_Display'] text-base text-[#1a1a1a] tracking-tight shrink-0 leading-none">
            Travel Canvas
          </Link>
          <div className="hidden md:flex items-center gap-6">
            {links.map((link) => {
              const active = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="font-['JetBrains_Mono'] text-[10px] tracking-widest uppercase transition-colors leading-none"
                  style={{ color: active ? "#1a1a1a" : "rgba(26,26,26,0.4)" }}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {user && (
            <div className="relative"
              onMouseEnter={() => { if (cartTimer.current) clearTimeout(cartTimer.current); setCartOpen(true); }}
              onMouseLeave={() => { cartTimer.current = setTimeout(() => setCartOpen(false), 150); }}>
              <button type="button" className="relative flex items-center justify-center w-9 h-9 transition-colors hover:bg-[#f5f3ef]" style={{ border: "0.5px solid #dbdad6" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#1a1a1a]">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                  <line x1="3" y1="6" x2="21" y2="6"/>
                  <path d="M16 10a4 4 0 0 1-8 0"/>
                </svg>
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#1a1a1a] text-[#FDFBF7] font-['JetBrains_Mono'] text-[7px] flex items-center justify-center leading-none">1</span>
              </button>

              {cartOpen && (
                <div className="absolute right-0 top-full z-50" style={{ paddingTop: "6px" }}>
                  <div className="w-64 bg-[#FDFBF7]" style={{ border: "0.5px solid #dbdad6" }}>
                    <div className="px-4 py-3" style={{ borderBottom: "0.5px solid #dbdad6" }}>
                      <p className="font-['JetBrains_Mono'] text-[9px] tracking-widest uppercase" style={{ color: "rgba(26,26,26,0.35)" }}>Cart · 1 item</p>
                    </div>
                    <div className="px-4 py-3 flex gap-3" style={{ borderBottom: "0.5px solid #dbdad6" }}>
                      <div className="w-10 h-12 bg-[#e8e6e0] shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-['Playfair_Display'] text-sm text-[#1a1a1a] leading-tight">Ha Long Bay</p>
                        <p className="font-['JetBrains_Mono'] text-[9px] mt-0.5" style={{ color: "rgba(26,26,26,0.35)" }}>Softcover · 24 pg</p>
                        <p className="font-['JetBrains_Mono'] text-[10px] mt-1 text-[#1a1a1a]">$49.00</p>
                      </div>
                    </div>
                    <Link href="/checkout"
                      className="block w-full text-center font-['JetBrains_Mono'] text-[10px] tracking-widest uppercase px-4 py-3 transition-colors hover:bg-[#1a1a1a] hover:text-[#FDFBF7]">
                      View Cart & Checkout
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
          {user ? (
            <div
              className="relative"
              onMouseEnter={() => { if (leaveTimer.current) clearTimeout(leaveTimer.current); setDropdown(true); }}
              onMouseLeave={() => { leaveTimer.current = setTimeout(() => setDropdown(false), 150); }}
            >
              <button
                type="button"
                className="flex items-center gap-2.5 px-3 py-1.5 transition-colors"
                style={{ border: "0.5px solid #dbdad6" }}
              >
                {user.image ? (
                  <img src={user.image} alt="" className="w-7 h-7 rounded-full object-cover" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[#1a1a1a] flex items-center justify-center shrink-0 overflow-hidden"
                    style={{ border: "0.5px solid rgba(253,251,247,0.15)" }}>
                    <span className="font-['JetBrains_Mono'] text-[10px] text-[#FDFBF7] leading-none">
                      {user.name?.charAt(0).toLocaleUpperCase() || user.email?.charAt(0).toLocaleUpperCase() || "?"}
                    </span>
                  </div>
                )}
                <span className="font-['Inter'] text-sm text-[#1a1a1a] font-medium leading-none">
                  {user.name || user.email || "User"}
                </span>
              </button>

              {dropdown && (
                <div className="absolute right-0 top-full z-50" style={{ paddingTop: "6px" }}>
                  <div
                    className="w-44 bg-[#FDFBF7]"
                    style={{ border: "0.5px solid #dbdad6" }}
                  >
                  <Link
                    href="/account"
                    className="block w-full text-left font-['JetBrains_Mono'] text-[10px] tracking-widest uppercase px-4 py-3 transition-colors hover:bg-[#1a1a1a] hover:text-[#FDFBF7]"
                    style={{ borderBottom: "0.5px solid #dbdad6" }}
                  >
                    Account
                  </Link>
                  <button
                    type="button"
                    onClick={async () => {
                      const uid = (session?.user as any)?.id;
                      if (uid) {
                        await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/logout`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ userId: uid }),
                        }).catch(() => {});
                      }
                      signOut({ callbackUrl: "/auth" });
                    }}
                    className="block w-full text-left font-['JetBrains_Mono'] text-[10px] tracking-widest uppercase px-4 py-3 transition-colors hover:bg-[#1a1a1a] hover:text-[#FDFBF7]"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            )}
            </div>
          ) : (
            <Link
              href="/auth"
              className="font-['JetBrains_Mono'] text-[10px] tracking-widest uppercase px-4 py-2 transition-colors duration-150 hover:bg-[#1a1a1a] hover:text-[#FDFBF7]"
              style={{ border: "0.5px solid #1a1a1a" }}
            >
              Sign In
            </Link>
          )}
        </div>

        <button className="md:hidden shrink-0 ml-4" onClick={() => setOpen(!open)}>
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {open && (
        <div style={{ borderTop: "0.5px solid #dbdad6" }}>
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block font-['JetBrains_Mono'] text-[10px] tracking-widest uppercase px-8 py-3 transition-colors hover:bg-[#1a1a1a]/5"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/auth"
            onClick={() => setOpen(false)}
            className="block font-['JetBrains_Mono'] text-[10px] tracking-widest uppercase px-8 py-3 transition-colors hover:bg-[#1a1a1a]/5"
          >
            Sign In
          </Link>
        </div>
      )}
    </nav>
  );
}

function X({ size }: { size: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
    </svg>
  );
}

function Menu({ size }: { size: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5h16"/><path d="M4 12h16"/><path d="M4 19h16"/>
    </svg>
  );
}
