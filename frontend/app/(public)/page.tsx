import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { authOptions } from "@/lib/auth.config";
import { withLang } from "@/lib/routing";
import { LandingReveal } from "@/features/landing/landing-reveal";
import { HeroSection } from "@/features/landing/sections/hero";
import { Marquee } from "@/features/landing/sections/marquee";
import { HowItWorksSection } from "@/features/landing/sections/how-it-works";
import { ShowcaseSection } from "@/features/landing/sections/showcase";
import { MaterialsSection } from "@/features/landing/sections/materials";
import { PricingSection } from "@/features/landing/sections/pricing";
import { TestimonialSection } from "@/features/landing/sections/testimonial";
import { CtaSection } from "@/features/landing/sections/cta";
import { FooterSection } from "@/features/landing/sections/footer";

export default async function HomePage() {
	// token admin vào trang chủ thì đến thẳng analytics, khỏi xem landing.
	const session = await getServerSession(authOptions);
	if ((session?.user as { role?: string } | undefined)?.role === "admin") {
		const langs = ["en", "vi", "es"];
		const raw = (await headers()).get("x-i18n-lang") ?? (await cookies()).get("i18nextLng")?.value;
		redirect(withLang("/admin/analytics", langs.includes(raw ?? "") ? raw! : undefined));
	}
	return (
		<LandingReveal>
			<div style={{ background: "#F8F2E5", minHeight: "92vh", overflowX: "hidden", paddingTop: 60 }}>
				<HeroSection />
				<Marquee />
				<HowItWorksSection />
				<ShowcaseSection />
				<MaterialsSection />
				<PricingSection />
				<TestimonialSection />
				<CtaSection />
				<FooterSection />
			</div>
		</LandingReveal>
	);
}
