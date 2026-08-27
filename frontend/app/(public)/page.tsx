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

export const dynamic = "force-static";

export default function HomePage() {
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
