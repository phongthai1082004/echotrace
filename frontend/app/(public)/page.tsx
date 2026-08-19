"use client";

import { useEffect } from "react";
import { LANDING_CSS } from "@/features/landing/landing-css";
import { useReveal } from "@/features/landing/use-reveal";
import { HeroSection } from "@/features/landing/sections/hero";
import { Marquee } from "@/features/landing/sections/marquee";
import { HowItWorksSection } from "@/features/landing/sections/how-it-works";
import { ShowcaseSection } from "@/features/landing/sections/showcase";
import { MaterialsSection } from "@/features/landing/sections/materials";
import { PricingSection } from "@/features/landing/sections/pricing";
import { TestimonialSection } from "@/features/landing/sections/testimonial";
import { CtaSection } from "@/features/landing/sections/cta";
import { FooterSection } from "@/features/landing/sections/footer";

export default function HomePage() {
  useReveal();
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = LANDING_CSS;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
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
  );
}
