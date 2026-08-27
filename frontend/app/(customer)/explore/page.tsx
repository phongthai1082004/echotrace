import { cookies } from "next/headers";
import { getT } from "@/lib/i18n-server";
import { ExploreClient } from "./_components/explore-client";

export default async function ExplorePage() {
	const lng = (await cookies()).get("i18nextLng")?.value ?? "en";
	const t = getT(lng);
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

			<ExploreClient />
		</div>
	);
}
