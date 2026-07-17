"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { cloudinaryUrl } from "@/lib/cloudinary";

interface JournalBook {
  id: number; title: string; coverUrl: string | null; pages: number; style: string;
  cover: string; status: string; createdAt: string;
}

const statusLabel: Record<string, string> = { DRAFT: "Draft", PUBLISHED: "Published", ARCHIVED: "Archived" };
const statusBg: Record<string, string> = { DRAFT: "#FFF7D6", PUBLISHED: "#5A8F4A", ARCHIVED: "#999" };
const statusText: Record<string, string> = { DRAFT: "#222", PUBLISHED: "#fff", ARCHIVED: "#fff" };

export default function MyJournalsPage() {
  const { data: session } = useSession();
  const accessToken = (session as any)?.accessToken;

  const [journals, setJournals] = useState<JournalBook[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    setFetchError(null);
    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user/my-books`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }).then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status} ${r.statusText}`);
      return r.json();
    }).then(d => {
      setJournals(d.data || []);
    }).catch((err) => {
      console.warn("[my-journals] fetch failed:", err);
      setFetchError(String(err));
    });
  }, [accessToken]);

  return (
    <div className="min-h-screen pt-15">
      <div className="px-8 py-10 flex items-end justify-between border-b-[3px] border-[#222]">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold">My Journals</h1>
          <p className="text-sm mt-1 text-[#666]">All your travel books in one place.</p>
        </div>
        <Link href="/studio"
          className="font-mono text-[10px] font-bold tracking-widest uppercase px-5 py-3 bg-[#222] text-white rounded-[10px] border-[3px] border-[#222] shadow-[4px_4px_0_#222] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#222] transition-all shrink-0">
          + New Journal
        </Link>
      </div>

      <div className="px-8 py-10">
        <p className="font-mono text-[9px] font-bold tracking-widest uppercase mb-5 text-[#666]">Journal History</p>
        {fetchError && <p className="text-[10px] text-red-500 mb-3">Error: {fetchError}</p>}
        {journals.length === 0 && !fetchError ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-xl font-bold mb-2">No journals yet</p>
            <p className="text-sm mb-6 text-[#999]">Start designing your first travel journal.</p>
            <Link href="/studio"
              className="font-mono text-[10px] font-bold tracking-widest uppercase px-6 py-3 bg-[#222] text-white rounded-[10px] border-[3px] border-[#222] shadow-[4px_4px_0_#222] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#222] transition-all">
              Open Studio
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-8 px-8 pb-8" style={{ scrollbarWidth: "none" }}>
            <div className="flex gap-5" style={{ width: "max-content" }}>
              {journals.map((j) => (
                <div key={j.id} className="shrink-0 w-64 group cursor-pointer bg-[#FFF7D6] rounded-[10px] border-[3px] border-[#222] shadow-[4px_4px_0_#222] overflow-hidden hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#222] transition-all">
                  <Link href={`/studio?id=${j.id}`} className="block">
                  <div className="relative overflow-hidden bg-[#e8e6e0] aspect-[3/4]">
                    {j.coverUrl ? (
                      <img src={cloudinaryUrl(j.coverUrl)} alt={j.title} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="font-mono text-[9px] font-bold tracking-widest uppercase text-[#999]">No Cover</span>
                      </div>
                    )}
                    <div className="absolute top-3 left-3">
                      <span className="font-mono text-[8px] font-bold tracking-widest uppercase px-2 py-1 rounded-md"
                        style={{ background: statusBg[j.status] || "#999", color: statusText[j.status] || "#222" }}>
                        {statusLabel[j.status] || j.status}
                      </span>
                    </div>
                  </div>
                  <div className="p-4 border-t-[3px] border-[#222]">
                    <h3 className="text-lg font-bold mb-1 leading-tight">{j.title}</h3>
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="font-mono text-[9px] font-bold tracking-widest uppercase text-[#999]">{j.style}</span>
                      <span className="text-[#222]">·</span>
                      <span className="font-mono text-[9px] font-bold text-[#999]">{j.pages} pg</span>
                    </div>
                    <p className="font-mono text-[9px] font-bold text-[#999]">{j.createdAt?.slice(0, 10)}</p>
                  </div>
                </Link>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
