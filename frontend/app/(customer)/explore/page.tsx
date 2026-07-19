"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { SidebarNav } from "@/components/sidebar-nav";
import { cloudinaryUrl } from "@/lib/cloudinary";
import { SkeletonGrid } from "@/components/skeleton";

interface SampleBook {
  id: number; name: string; description: string | null; category: string | null;
  style: string; font: string; cover: string; pageCount: number; coverUrl: string | null;
  price: number; theme: { name: string; code: string } | null;
}

const ALL_CATEGORIES = ["NATURE", "URBAN", "CLASSIC", "MINIMAL", "ADVENTURE", "CULTURAL", "CUSTOM"] as const;

export default function ExplorePage() {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const accessToken = (session as any)?.accessToken;

  const [samples, setSamples] = useState<SampleBook[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [tab, setTab] = useState<"samples" | "community">("samples");
  const [loading, setLoading] = useState(true);

  const api = (path: string) =>
    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}${path}`, { headers: { Authorization: `Bearer ${accessToken}` } });

  useEffect(() => {
    if (!accessToken) return;
    const start = Date.now();
    setLoading(true);
    api("/api/explore/samples").then(r => r.json()).then(d => setSamples(d.data || [])).catch(() => {}).finally(() => {
      const elapsed = Date.now() - start;
      if (elapsed >= 500) setLoading(false);
      else setTimeout(() => setLoading(false), 500 - elapsed);
    });
  }, [accessToken]);

  const filteredSamples = samples.filter(s => !selectedCategory || s.category === selectedCategory);

  return (
    <div className="min-h-screen pt-15">
      <div className="px-8 max-[1600px]:px-6 max-[1440px]:px-5 max-[1280px]:px-4 py-10 max-[1600px]:py-8 max-[1440px]:py-6 border-b-[3px] border-[#222]">
        <h1 className="text-3xl max-[1600px]:text-2xl max-[1440px]:text-xl max-[1280px]:text-lg font-bold">{t("customer.explore.title")}</h1>
        <p className="text-sm mt-1 text-[#666]">{t("customer.explore.subtitle")}</p>
      </div>

      <div className="flex flex-col lg:flex-row px-8 max-[1600px]:px-6 max-[1440px]:px-5 max-[1280px]:px-4">
        <SidebarNav
          title={t("customer.explore.categories")}
          items={ALL_CATEGORIES.map(cat => ({ value: cat, label: t(`customer.explore.${cat.toLowerCase()}`) }))}
          activeItem={selectedCategory}
          onSelect={setSelectedCategory}
        />

        <main className="flex-1 py-8 max-[1600px]:py-6 max-[1440px]:py-5 lg:py-10 lg:pl-10">
          <div className="flex gap-0 mb-6">
            <button onClick={() => setTab("samples")}
              className={`font-mono text-[10px] font-bold tracking-widest uppercase pb-3 pr-8 transition-all relative ${
                tab === "samples" ? "text-[#222]" : "text-[#999] hover:text-[#666]"
              }`}>
              {t("customer.explore.sampleLayouts")}
              {tab === "samples" && <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#222] rounded-full" />}
            </button>
            <button onClick={() => setTab("community")}
              className={`font-mono text-[10px] font-bold tracking-widest uppercase pb-3 pr-8 transition-all relative ${
                tab === "community" ? "text-[#222]" : "text-[#999] hover:text-[#666]"
              }`}>
              {t("customer.explore.communityBooks")}
              {tab === "community" && <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#222] rounded-full" />}
            </button>
          </div>

          {tab === "samples" && (loading ? (
              <SkeletonGrid count={10} aspect="portrait" />
            ) : filteredSamples.length === 0 ? (
              <p className="text-sm text-[#999]">{t("customer.explore.emptySamples")}</p>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-5">
                {filteredSamples.map(s => (
                  <div key={s.id} className="group cursor-pointer bg-[#FFF7D6] rounded-[10px] border-[3px] border-[#222] shadow-[4px_4px_0_#222] overflow-hidden hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#222] transition-all">
                    <div className="aspect-[3/4] bg-[#e8e6e0] overflow-hidden relative">
                      {s.coverUrl ? (
                        <img src={cloudinaryUrl(s.coverUrl)} alt={s.name} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="font-mono text-[9px] font-bold tracking-widest uppercase text-[#999]">{s.name}</span>
                        </div>
                      )}
                      {s.theme && (
                        <div className="absolute top-3 left-3">
                          <span className="font-mono text-[7px] font-bold tracking-widest uppercase px-1.5 py-0.5 bg-[#FFF7D6] border-2 border-[#222] rounded-md">{s.theme.name}</span>
                        </div>
                      )}
                    </div>
                    <div className="p-4 border-t-[3px] border-[#222]">
                      <h3 className="text-base font-bold leading-tight mb-1">{s.name}</h3>
                      {s.description && <p className="text-[11px] line-clamp-2 mb-2 text-[#666]">{s.description}</p>}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[9px] font-bold tracking-widest uppercase text-[#999]">{s.style}</span>
                        <span className="text-[#222]">·</span>
                        <span className="font-mono text-[9px] font-bold text-[#999]">{s.pageCount} {t("customer.explore.pg")}</span>
                        <span className="flex-1" />
                        <span className="font-mono text-[10px] font-bold">${s.price}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {tab === "community" && (
            <p className="text-sm text-[#999]">{t("customer.explore.emptyCommunity")}</p>
          )}
        </main>
      </div>
    </div>
  );
}
