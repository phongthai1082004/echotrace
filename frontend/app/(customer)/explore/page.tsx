"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface Theme {
  id: number; name: string; code: string; description: string; category: string | null; thumbnailUrl: string;
}

interface SampleBook {
  id: number; name: string; description: string | null; category: string | null;
  style: string; font: string; cover: string; pageCount: number; coverUrl: string | null;
  price: number; theme: { name: string; code: string } | null;
}

const ALL_CATEGORIES = ["NATURE", "URBAN", "CLASSIC", "MINIMAL", "ADVENTURE", "CULTURAL", "CUSTOM"] as const;

export default function ExplorePage() {
  const { data: session } = useSession();
  const accessToken = (session as any)?.accessToken;

  const [themes, setThemes] = useState<Theme[]>([]);
  const [samples, setSamples] = useState<SampleBook[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [tab, setTab] = useState<"samples" | "community">("samples");

  const api = (path: string) =>
    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}${path}`, { headers: { Authorization: `Bearer ${accessToken}` } });

  useEffect(() => {
    if (!accessToken) return;
    api("/api/explore/themes").then(r => r.json()).then(d => setThemes(d.data || [])).catch(() => {});
    api("/api/explore/samples").then(r => r.json()).then(d => setSamples(d.data || [])).catch(() => {});
  }, [accessToken]);

  const filteredSamples = samples.filter(s => !selectedCategory || s.category === selectedCategory);

  return (
    <div className="min-h-screen bg-[#FDFBF7] pt-15">
      <div className="px-8 py-10" style={{ borderBottom: "0.5px solid #dbdad6" }}>
        <h1 className="font-['Playfair_Display'] text-3xl lg:text-4xl text-[#1a1a1a]">Explore</h1>
        <p className="font-['Inter'] text-sm mt-1" style={{ color: "rgba(26,26,26,0.5)" }}>Discover sample layouts and community journals.</p>
      </div>

      <div className="flex flex-col lg:flex-row px-8">
        <aside className="lg:w-48 shrink-0 py-8 lg:py-10 lg:pr-8" style={{ borderRight: "0.5px solid #dbdad6" }}>
          <p className="font-['JetBrains_Mono'] text-[9px] tracking-widest uppercase mb-3" style={{ color: "rgba(26,26,26,0.35)" }}>Categories</p>
          <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
            <button onClick={() => setSelectedCategory(null)}
              className={`shrink-0 text-left font-['Inter'] text-sm px-3 py-2 transition-colors ${!selectedCategory ? "bg-[#1a1a1a] text-[#FDFBF7]" : "hover:bg-[#f5f3ef]"}`}>
              <span className="font-medium">All</span>
            </button>
            {ALL_CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setSelectedCategory(cat)}
                className={`shrink-0 text-left font-['Inter'] text-sm px-3 py-2 transition-colors ${selectedCategory === cat ? "bg-[#1a1a1a] text-[#FDFBF7]" : "hover:bg-[#f5f3ef]"}`}>
                {cat.charAt(0) + cat.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </aside>

        <main className="flex-1 py-8 lg:py-10 lg:pl-10">
          <div className="flex gap-6 mb-6" style={{ borderBottom: "0.5px solid #dbdad6" }}>
            <button onClick={() => setTab("samples")}
              className="font-['JetBrains_Mono'] text-[10px] tracking-widest uppercase pb-3 transition-colors"
              style={{ color: tab === "samples" ? "#1a1a1a" : "rgba(26,26,26,0.35)", borderBottom: tab === "samples" ? "1px solid #1a1a1a" : "1px solid transparent", marginBottom: "-0.5px" }}>
              Sample Layouts
            </button>
            <button onClick={() => setTab("community")}
              className="font-['JetBrains_Mono'] text-[10px] tracking-widest uppercase pb-3 transition-colors"
              style={{ color: tab === "community" ? "#1a1a1a" : "rgba(26,26,26,0.35)", borderBottom: tab === "community" ? "1px solid #1a1a1a" : "1px solid transparent", marginBottom: "-0.5px" }}>
              Community Books
            </button>
          </div>

          {tab === "samples" && (
            filteredSamples.length === 0 ? (
              <p className="font-['Inter'] text-sm" style={{ color: "rgba(26,26,26,0.4)" }}>No sample layouts in this category.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {filteredSamples.map(s => (
                  <div key={s.id} className="group cursor-pointer" style={{ border: "0.5px solid #dbdad6" }}>
                    <div className="aspect-[3/4] bg-[#e8e6e0] overflow-hidden relative">
                      {s.coverUrl ? (
                        <img src={s.coverUrl} alt={s.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="font-['JetBrains_Mono'] text-[9px] tracking-widest uppercase" style={{ color: "rgba(26,26,26,0.2)" }}>{s.name}</span>
                        </div>
                      )}
                      {s.theme && (
                        <div className="absolute top-3 left-3">
                          <span className="font-['JetBrains_Mono'] text-[7px] tracking-widest uppercase px-1.5 py-0.5 bg-[#FDFBF7]/80 text-[#1a1a1a]">{s.theme.name}</span>
                        </div>
                      )}
                    </div>
                    <div className="p-4" style={{ borderTop: "0.5px solid #dbdad6" }}>
                      <h3 className="font-['Playfair_Display'] text-base text-[#1a1a1a] leading-tight mb-1">{s.name}</h3>
                      {s.description && <p className="font-['Inter'] text-[11px] line-clamp-2 mb-2" style={{ color: "rgba(26,26,26,0.45)" }}>{s.description}</p>}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-['JetBrains_Mono'] text-[9px] tracking-widest uppercase" style={{ color: "rgba(26,26,26,0.35)" }}>{s.style}</span>
                        <span className="text-[#dbdad6]">·</span>
                        <span className="font-['JetBrains_Mono'] text-[9px]" style={{ color: "rgba(26,26,26,0.35)" }}>{s.pageCount} pg</span>
                        <span className="flex-1" />
                        <span className="font-['JetBrains_Mono'] text-[10px] text-[#1a1a1a]">${s.price}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {tab === "community" && (
            <p className="font-['Inter'] text-sm" style={{ color: "rgba(26,26,26,0.3)" }}>Community books coming soon.</p>
          )}
        </main>
      </div>
    </div>
  );
}
