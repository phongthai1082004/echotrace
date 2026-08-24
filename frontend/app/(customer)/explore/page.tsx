"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { SidebarNav } from "@/components/sidebar-nav";
import { SkeletonGrid } from "@/components/skeleton";
import { neoBtn, neoBtnPrimary } from "@/lib/styles";
import { useExplore } from "./_hooks/use-explore";
import { SampleCard } from "./_components/sample-card";

const ALL_CATEGORIES = ["NATURE", "URBAN", "CLASSIC", "MINIMAL", "ADVENTURE", "CULTURAL", "CUSTOM"] as const;

export default function ExplorePage() {
  const { t } = useTranslation();
  const { samples, albums, loading } = useExplore();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [tab, setTab] = useState<"samples" | "albums">("samples");

  const filteredSamples = samples.filter((s) => !selectedCategory || s.category === selectedCategory);

  const grid = (list: typeof samples, emptyKey: string, skeletonCount: number) =>
    loading ? (
      <SkeletonGrid count={skeletonCount} aspect="portrait" />
    ) : list.length === 0 ? (
      <p className="text-sm text-[#999]" suppressHydrationWarning>
        {t(emptyKey)}
      </p>
    ) : (
      <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-5">
        {list.map((s) => (
          <SampleCard key={s.id} s={s} />
        ))}
      </div>
    );

  return (
    <div className="min-h-screen pt-15">
      <div className="px-8 max-[1600px]:px-6 max-[1440px]:px-5 max-[1280px]:px-4 py-10 max-[1600px]:py-8 max-[1440px]:py-6 border-b-[3px] border-[#222]">
        <h1
          className="text-3xl max-[1600px]:text-2xl max-[1440px]:text-xl max-[1280px]:text-lg font-bold"
          suppressHydrationWarning
        >
          {t("customer.explore.title")}
        </h1>
        <p className="text-sm mt-1 text-[#666]" suppressHydrationWarning>
          {t("customer.explore.subtitle")}
        </p>
      </div>

      <div className="flex flex-col lg:flex-row px-8 max-[1600px]:px-6 max-[1440px]:px-5 max-[1280px]:px-4">
        <SidebarNav
          title={t("customer.explore.categories")}
          items={ALL_CATEGORIES.map((cat) => ({ value: cat, label: t(`customer.explore.${cat.toLowerCase()}`) }))}
          activeItem={selectedCategory}
          onSelect={setSelectedCategory}
        />

        <main className="flex-1 py-8 max-[1600px]:py-6 max-[1440px]:py-5 lg:py-10 lg:pl-10">
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setTab("samples")}
              suppressHydrationWarning
              className={`${tab === "samples" ? neoBtnPrimary : neoBtn} font-mono text-[10px] font-bold tracking-widest uppercase px-5 py-2`}
            >
              {t("customer.explore.sampleLayouts")}
            </button>
            <button
              onClick={() => setTab("albums")}
              suppressHydrationWarning
              className={`${tab === "albums" ? neoBtnPrimary : neoBtn} font-mono text-[10px] font-bold tracking-widest uppercase px-5 py-2`}
            >
              {t("customer.explore.albums")}
            </button>
          </div>

          {tab === "samples" && grid(filteredSamples, "customer.explore.emptySamples", 10)}
          {tab === "albums" && grid(albums, "customer.explore.emptyAlbums", 4)}
        </main>
      </div>
    </div>
  );
}
