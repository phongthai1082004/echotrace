"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import { SidebarNav } from "@/components/sidebar-nav";
import Image from "next/image";
import { cloudinaryUrl } from "@echotrace/shared";
import { SkeletonGrid } from "@/components/skeleton";
import { apiFetch } from "@/lib/api.fetch";
import { neoBtn, neoBtnPrimary } from "@/lib/styles";

interface SampleBook {
  id: number; name: string; description: string | null; category: string | null;
  style: string; font: string; cover: string; pageCount: number; coverUrl: string | null;
  thumbnailUrl: string | null; paperWidth: number | null; paperHeight: number | null;
  kind?: string;
  theme: { name: string; code: string } | null;
}

const ALL_CATEGORIES = ["NATURE", "URBAN", "CLASSIC", "MINIMAL", "ADVENTURE", "CULTURAL", "CUSTOM"] as const;

function firstPageThumb(s: SampleBook): string | null {
  return s.thumbnailUrl ?? s.coverUrl ?? null;
}

function SampleCard({ s }: { s: SampleBook }) {
  const { t } = useTranslation();
  return (
    <Link href={`/studio?sample=${s.id}`} className="group cursor-pointer bg-[#FFF7D6] rounded-[10px] border-[3px] border-[#222] shadow-[4px_4px_0_#222] overflow-hidden hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#222] transition-all">
      <div className="aspect-[3/4] bg-[#e8e6e0] overflow-hidden relative">
        {firstPageThumb(s) ? (
          <Image src={cloudinaryUrl(firstPageThumb(s)!)} alt={s.name} fill sizes="(max-width: 768px) 50vw, 220px" className="object-cover" />
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
          <span className="font-mono text-[9px] font-bold text-[#999]" suppressHydrationWarning>{s.pageCount} {t("customer.explore.pg")}</span>
          {s.paperWidth && s.paperHeight ? (
            <>
              <span className="text-[#222]">·</span>
              <span className="font-mono text-[9px] font-bold text-[#999]" suppressHydrationWarning>{s.paperWidth}×{s.paperHeight}mm</span>
            </>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

export default function ExplorePage() {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const accessToken = (session as any)?.accessToken;

  const [samples, setSamples] = useState<SampleBook[]>([]);
  const [albums, setAlbums] = useState<SampleBook[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [tab, setTab] = useState<"samples" | "albums">("samples");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) return;
    setLoading(true);
    Promise.all([
      apiFetch<any[]>("/api/explore/samples", accessToken).then(d => setSamples(d || [])).catch(() => {}),
      apiFetch<any[]>("/api/explore/albums", accessToken).then(d => setAlbums(d || [])).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [accessToken]);

  const filteredSamples = samples.filter(s => !selectedCategory || s.category === selectedCategory);

  return (
    <div className="min-h-screen pt-15">
      <div className="px-8 max-[1600px]:px-6 max-[1440px]:px-5 max-[1280px]:px-4 py-10 max-[1600px]:py-8 max-[1440px]:py-6 border-b-[3px] border-[#222]">
        <h1 className="text-3xl max-[1600px]:text-2xl max-[1440px]:text-xl max-[1280px]:text-lg font-bold" suppressHydrationWarning>{t("customer.explore.title")}</h1>
        <p className="text-sm mt-1 text-[#666]" suppressHydrationWarning>{t("customer.explore.subtitle")}</p>
      </div>

      <div className="flex flex-col lg:flex-row px-8 max-[1600px]:px-6 max-[1440px]:px-5 max-[1280px]:px-4">
        <SidebarNav
          title={t("customer.explore.categories")}
          items={ALL_CATEGORIES.map(cat => ({ value: cat, label: t(`customer.explore.${cat.toLowerCase()}`) }))}
          activeItem={selectedCategory}
          onSelect={setSelectedCategory}
        />

        <main className="flex-1 py-8 max-[1600px]:py-6 max-[1440px]:py-5 lg:py-10 lg:pl-10">
          <div className="flex gap-2 mb-6">
            <button onClick={() => setTab("samples")} suppressHydrationWarning
              className={`${tab === "samples" ? neoBtnPrimary : neoBtn} font-mono text-[10px] font-bold tracking-widest uppercase px-5 py-2`}>
              {t("customer.explore.sampleLayouts")}
            </button>
            <button onClick={() => setTab("albums")} suppressHydrationWarning
              className={`${tab === "albums" ? neoBtnPrimary : neoBtn} font-mono text-[10px] font-bold tracking-widest uppercase px-5 py-2`}>
              {t("customer.explore.albums")}
            </button>
          </div>

          {tab === "samples" && (loading ? (
              <SkeletonGrid count={10} aspect="portrait" />
            ) : filteredSamples.length === 0 ? (
              <p className="text-sm text-[#999]" suppressHydrationWarning>{t("customer.explore.emptySamples")}</p>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-5">
                {filteredSamples.map(s => <SampleCard key={s.id} s={s} />)}
              </div>
            )
          )}

          {tab === "albums" && (loading ? (
              <SkeletonGrid count={4} aspect="portrait" />
            ) : albums.length === 0 ? (
              <p className="text-sm text-[#999]" suppressHydrationWarning>{t("customer.explore.emptyAlbums")}</p>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-5">
                {albums.map(s => <SampleCard key={s.id} s={s} />)}
              </div>
            )
          )}
        </main>
      </div>
    </div>
  );
}
