"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { SidebarNav } from "@/components/sidebar-nav";
import { SkeletonGrid } from "@/components/skeleton";
import { neoBtn, neoBtnPrimary } from "@/lib/styles";
import { useExplore } from "../_hooks/use-explore";
import { SampleCard } from "./sample-card";

const ALL_CATEGORIES = ["NATURE", "URBAN", "CLASSIC", "MINIMAL", "ADVENTURE", "CULTURAL", "CUSTOM"] as const;

export function ExploreClient() {
	const { t } = useTranslation();
	const { samples, albums, samplesNext, albumsNext, loading, setCategory, loadMoreSamples, loadMoreAlbums } = useExplore();
	const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
	const [tab, setTab] = useState<"samples" | "albums">("samples");

	const onSelect = (cat: string | null) => {
		setSelectedCategory(cat);
		setCategory(cat);
	};

	const grid = (list: typeof samples, emptyKey: string, skeletonCount: number, next: number | null, onLoadMore: () => void) =>
		loading ? (
			<SkeletonGrid count={skeletonCount} aspect="portrait" />
		) : list.length === 0 ? (
			<p className="text-sm text-[#999]" suppressHydrationWarning>
				{t(emptyKey)}
			</p>
		) : (
			<>
				<div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-5">
					{list.map((s) => (
						<SampleCard key={s.id} s={s} />
					))}
				</div>
				{next != null && (
					<button onClick={onLoadMore} className={`${neoBtn} mt-6 px-6 py-2.5`}>
						{t("customer.explore.loadMore")}
					</button>
				)}
			</>
		);

	return (
		<div className="flex flex-col lg:flex-row px-8 max-[1600px]:px-6 max-[1440px]:px-5 max-[1280px]:px-4">
			<SidebarNav
				title={t("customer.explore.categories")}
				items={ALL_CATEGORIES.map((cat) => ({ value: cat, label: t(`customer.explore.${cat.toLowerCase()}`) }))}
				activeItem={selectedCategory}
				onSelect={onSelect}
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

				{tab === "samples" && grid(samples, "customer.explore.emptySamples", 10, samplesNext, loadMoreSamples)}
				{tab === "albums" && grid(albums, "customer.explore.emptyAlbums", 4, albumsNext, loadMoreAlbums)}
			</main>
		</div>
	);
}
