"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface JournalBook {
  id: number; title: string; coverUrl: string | null; pages: number; style: string;
  cover: string; status: string; createdAt: string;
}

const statusLabel: Record<string, string> = { DRAFT: "Draft", PUBLISHED: "Published", ARCHIVED: "Archived" };
const statusColor: Record<string, string> = { DRAFT: "#f5f3ef", PUBLISHED: "#0D1F1A", ARCHIVED: "#dbdad6" };
const statusText: Record<string, string> = { DRAFT: "#1a1a1a", PUBLISHED: "#FDFBF7", ARCHIVED: "#1a1a1a" };

export default function MyJournalsPage() {
  const { data: session } = useSession();
  const accessToken = (session as any)?.accessToken;

  const [journals, setJournals] = useState<JournalBook[]>([]);

  useEffect(() => {
    if (!accessToken) return;
    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user/my-books`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }).then(r => r.json()).then(d => setJournals(d.data || [])).catch(() => {});
  }, [accessToken]);

  return (
    <div className="min-h-screen bg-[#FDFBF7] pt-15">
      <div className="px-8 py-12 flex items-end justify-between" style={{ borderBottom: "0.5px solid #dbdad6" }}>
        <div>
          <h1 className="font-['Playfair_Display'] text-4xl text-[#1a1a1a]">My Journals</h1>
          <p className="font-['Inter'] text-sm mt-2" style={{ color: "rgba(26,26,26,0.5)" }}>All your travel books in one place.</p>
        </div>
        <Link href="/studio"
          className="font-['JetBrains_Mono'] text-[10px] tracking-widest uppercase px-5 py-3 bg-[#1a1a1a] text-[#FDFBF7] transition-colors hover:bg-[#0D1F1A] shrink-0">
          + New Journal
        </Link>
      </div>

      <div className="px-8 py-10">
        {journals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <p className="font-['Playfair_Display'] text-2xl text-[#1a1a1a] mb-3">No journals yet</p>
            <p className="font-['Inter'] text-sm mb-8" style={{ color: "rgba(26,26,26,0.4)" }}>Start designing your first travel journal.</p>
            <Link href="/studio"
              className="font-['JetBrains_Mono'] text-[10px] tracking-widest uppercase px-6 py-3 bg-[#1a1a1a] text-[#FDFBF7] transition-colors hover:bg-[#0D1F1A]">
              Open Studio
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {journals.map(j => (
              <div key={j.id} className="group cursor-pointer" style={{ border: "0.5px solid #dbdad6" }}>
                <div className="aspect-[3/4] bg-[#e8e6e0] overflow-hidden relative">
                  {j.coverUrl ? (
                    <img src={j.coverUrl} alt={j.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="font-['JetBrains_Mono'] text-[9px] tracking-widest uppercase" style={{ color: "rgba(26,26,26,0.2)" }}>No Cover</span>
                    </div>
                  )}
                  <div className="absolute top-3 left-3">
                    <span className="font-['JetBrains_Mono'] text-[8px] tracking-widest uppercase px-2 py-1"
                      style={{ background: statusColor[j.status] || "#dbdad6", color: statusText[j.status] || "#1a1a1a" }}>
                      {statusLabel[j.status] || j.status}
                    </span>
                  </div>
                </div>
                <div className="p-4" style={{ borderTop: "0.5px solid #dbdad6" }}>
                  <h3 className="font-['Playfair_Display'] text-lg text-[#1a1a1a] leading-tight mb-1">{j.title}</h3>
                  <div className="flex items-center gap-2">
                    <span className="font-['JetBrains_Mono'] text-[9px] tracking-widest uppercase" style={{ color: "rgba(26,26,26,0.35)" }}>{j.style}</span>
                    <span className="text-[#dbdad6]">·</span>
                    <span className="font-['JetBrains_Mono'] text-[9px]" style={{ color: "rgba(26,26,26,0.35)" }}>{j.pages} pg</span>
                  </div>
                  <p className="font-['JetBrains_Mono'] text-[8px] mt-2" style={{ color: "rgba(26,26,26,0.2)" }}>{j.createdAt?.slice(0, 10)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
