"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { SAMPLE_BOOK_CATEGORIES } from "@echotrace/shared";
import { SidebarNav } from "@/components/sidebar-nav";
import { SkeletonGrid } from "@/components/skeleton";
import { neoBtn } from "@/lib/styles";
import { useExplore } from "../_hooks/use-explore";
import { SampleCard } from "./sample-card";

export function ExploreClient() {
	const { t } = useTranslation();
	const { samples, samplesNext, loading, setCategory, loadMoreSamples } = useExplore();
	const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

	const onSelect = (cat: string | null) => {
		setSelectedCategory(cat);
		setCategory(cat);
	};

	const grid = (
		list: typeof samples,
		emptyKey: string,
		skeletonCount: number,
		next: number | null,
		onLoadMore: () => void,
	) =>
		loading ? (
			<SkeletonGrid count={skeletonCount} variant="sample" />
		) : list.length === 0 ? (
			<p className="text-sm text-[#999]" suppressHydrationWarning>
				{t(emptyKey)}
			</p>
		) : (
			<>
				<div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3 sm:gap-5">
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
		<div className="flex flex-col md:flex-row px-4 sm:px-8 max-[1600px]:px-6 max-[1440px]:px-5 max-[1280px]:px-4">
			<SidebarNav
				title={t("customer.explore.categories")}
				items={SAMPLE_BOOK_CATEGORIES.map((cat) => ({ value: cat, label: t(`customer.explore.${cat.toLowerCase()}`) }))}
				activeItem={selectedCategory}
				onSelect={onSelect}
			/>

			<main className="flex-1 py-6 sm:py-8 max-[1600px]:py-6 max-[1440px]:py-5 md:py-10 md:pl-10">
			{grid(samples, "customer.explore.emptySamples", 10, samplesNext, loadMoreSamples)}
			</main>
		</div>
	);
}
