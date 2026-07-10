"use client";

import { useState } from "react";
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

  if (pathname === "/auth") return null;

  const links = [
    { href: "/explore", label: "Explore" },
    { href: "/my-journals", label: "My Journals" },
    { href: "/studio", label: "Studio" },
    { href: "/orders", label: "Orders" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-[#F8F2E5] border-b-[3px] border-[#222]">
      <div className="flex items-center justify-between px-8 h-15">
        <div className="flex items-center gap-10">
          <Link href="/" className="font-bold text-base tracking-tight shrink-0 leading-none">
            Travel Canvas
          </Link>
          <div className="hidden md:flex items-center gap-6">
            {links.map((link) => {
              const active = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`font-mono text-[10px] font-bold tracking-widest uppercase px-3 py-1.5 rounded-[6px] transition-all leading-none ${
                    active ? "bg-[#222] text-white" : "text-[#666] hover:bg-[#e8e6e0] hover:text-[#222]"
                  }`}
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
              onMouseEnter={() => setCartOpen(true)}
              onMouseLeave={() => setCartOpen(false)}>
              <button type="button" className="relative flex items-center justify-center w-9 h-9 rounded-[8px] border-[2px] border-[#222] shadow-[2px_2px_0_#222] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#222] transition-all bg-[#FFF7D6]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#222]">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                  <line x1="3" y1="6" x2="21" y2="6"/>
                  <path d="M16 10a4 4 0 0 1-8 0"/>
                </svg>
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#222] text-white font-mono text-[7px] font-bold flex items-center justify-center leading-none">1</span>
              </button>

              {cartOpen && (
                <div className="absolute right-0 top-full z-50 pt-2">
                  <div className="w-64 bg-[#FFF7D6] rounded-[10px] border-[3px] border-[#222] shadow-[4px_4px_0_#222] overflow-hidden">
                    <div className="px-4 py-3 border-b-[3px] border-[#222]">
                      <p className="font-mono text-[9px] font-bold tracking-widest uppercase text-[#666]">Cart · 1 item</p>
                    </div>
                    <div className="px-4 py-3 flex gap-3 border-b-[3px] border-[#222]">
                      <div className="w-10 h-12 bg-[#e8e6e0] rounded-[6px] shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold leading-tight">Ha Long Bay</p>
                        <p className="font-mono text-[9px] text-[#999] mt-0.5">Softcover · 24 pg</p>
                        <p className="font-mono text-[10px] mt-1 font-bold">$49.00</p>
                      </div>
                    </div>
                    <Link href="/checkout"
                      className="block w-full text-center font-mono text-[10px] font-bold tracking-widest uppercase px-4 py-3 hover:bg-[#222] hover:text-white transition-colors">
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
              onMouseEnter={() => setDropdown(true)}
              onMouseLeave={() => setDropdown(false)}
            >
              <button
                type="button"
                className="flex items-center gap-2.5 h-9 px-3 rounded-[8px] border-[2px] border-[#222] shadow-[2px_2px_0_#222] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#222] transition-all bg-[#FFF7D6]"
              >
                {user.image ? (
                  <img src={user.image} alt="" className="w-7 h-7 rounded-full object-cover" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[#222] flex items-center justify-center shrink-0 overflow-hidden">
                    <span className="font-mono text-[10px] font-bold text-white leading-none">
                      {user.name?.charAt(0).toLocaleUpperCase() || user.email?.charAt(0).toLocaleUpperCase() || "?"}
                    </span>
                  </div>
                )}
                <span className="text-sm font-bold leading-none">
                  {user.name || user.email || "User"}
                </span>
              </button>

              {dropdown && (
                <div className="absolute right-0 top-full z-50 pt-2">
                  <div className="w-44 bg-[#FFF7D6] rounded-[10px] border-[3px] border-[#222] shadow-[4px_4px_0_#222] overflow-hidden">
                    <Link
                      href="/account"
                      className="block w-full text-left font-mono text-[10px] font-bold tracking-widest uppercase px-4 py-3 hover:bg-[#222] hover:text-white transition-colors border-b-[3px] border-[#222]"
                    >
                      Account
                    </Link>
                    <button
                      type="button"
                      onClick={async () => {
                        const token = (session as any)?.accessToken;
                        if (token) {
                          await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/logout`, {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                              Authorization: `Bearer ${token}`,
                            },
                          }).catch(() => {});
                        }
                        signOut({ callbackUrl: "/auth" });
                      }}
                      className="block w-full text-left font-mono text-[10px] font-bold tracking-widest uppercase px-4 py-3 hover:bg-[#222] hover:text-white transition-colors"
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
              className="font-mono text-[10px] font-bold tracking-widest uppercase px-4 py-2 rounded-[8px] border-[2px] border-[#222] shadow-[2px_2px_0_#222] bg-[#FFF7D6] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#222] transition-all"
            >
              Sign In
            </Link>
          )}
        </div>

        <button className="md:hidden shrink-0 ml-4" onClick={() => setOpen(!open)}>
          {open ? <XIcon size={18} /> : <MenuIcon size={18} />}
        </button>
      </div>

      {open && (
        <div className="border-t-[3px] border-[#222] bg-[#FFF7D6]">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block font-mono text-[10px] font-bold tracking-widest uppercase px-8 py-3 hover:bg-[#222] hover:text-white transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/auth"
            onClick={() => setOpen(false)}
            className="block font-mono text-[10px] font-bold tracking-widest uppercase px-8 py-3 hover:bg-[#222] hover:text-white transition-colors"
          >
            Sign In
          </Link>
        </div>
      )}
    </nav>
  );
}

function XIcon({ size }: { size: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
    </svg>
  );
}

function MenuIcon({ size }: { size: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5h16"/><path d="M4 12h16"/><path d="M4 19h16"/>
    </svg>
  );
}
