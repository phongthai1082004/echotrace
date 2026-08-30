"use client";

import { ArrowRight, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import dynamic from "next/dynamic";
const Book3D = dynamic(() => import("@/features/landing/book-3d").then((m) => m.Book3D), { ssr: false });
import parisImg from "@/assets/images/wedding.png";

export function HeroSection() {
  const { t } = useTranslation();
  return (
    <section
      className="grid-paper hero-grid"
      style={{
        minHeight: "92vh",
        display: "grid",
        alignItems: "center",
        position: "relative",
        overflow: "hidden",
        borderBottom: "2.5px solid #222",
      }}
    >
      <div style={{ padding: "80px 56px", position: "relative", zIndex: 2 }}>
        <div style={{ marginBottom: 20, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span className="sticker-label">{t("home.hero.booksBadge")}</span>
        </div>
        <div className="coord-label text-on-card" style={{ marginBottom: 12 }}>
          {t("home.hero.location")}
        </div>
        <h1
          style={{
            fontFamily: "var(--font-space-grotesk, 'Space Grotesk'),sans-serif",
            fontSize: "clamp(44px,5.2vw,74px)",
            fontWeight: 800,
            lineHeight: 1.0,
            color: "#222",
            margin: "0 0 22px",
            letterSpacing: "-.025em",
          }}
        >
          {t("home.hero.titleLine1")}
          <br />
          <span style={{ color: "#B54843" }}>{t("home.hero.titleLine2")}</span>
          <br />
          {t("home.hero.titleLine3")}
        </h1>
        <p
          style={{
            fontFamily: "var(--font-space-grotesk, 'Space Grotesk'),sans-serif",
            fontSize: 17,
            color: "#444444",
            lineHeight: 1.65,
            margin: "0 0 34px",
            maxWidth: 400,
          }}
        >
          {t("home.hero.subhead")}
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 40 }}>
          <a href="/studio" className="btn-brutalist" style={{ background: "#B54843", color: "#fff" }}>
            {t("home.hero.ctaPrimary")}
          </a>
          <a href="/explore" className="btn-brutalist btn-brutalist-secondary">
            {t("home.hero.ctaSecondary")} <ArrowRight size={16} />
          </a>
        </div>
      </div>

      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px 40px 60px 0",
        }}
      >
        <Book3D autoRotate={false} height={500} coverUrl={parisImg.src} />
        <div
          className="float-badge"
          style={{
            position: "absolute",
            bottom: 90,
            left: 40,
            background: "#FFF7D6",
            border: "2.5px solid #222",
            borderRadius: 8,
            padding: "10px 14px",
            boxShadow: "4px 4px 0 #222",
            animationDelay: ".8s",
            zIndex: 10,
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-jetbrains-mono, 'JetBrains Mono'),monospace",
              fontSize: 10,
              color: "#666",
              letterSpacing: ".1em",
              textTransform: "uppercase",
            }}
          >
            {t("home.hero.shipsIn")}
          </div>
          <div
            style={{
              fontFamily: "var(--font-space-grotesk, 'Space Grotesk'),sans-serif",
              fontSize: 22,
              fontWeight: 800,
              color: "#155724",
            }}
          >
            {t("home.hero.shipsInValue")}
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            top: 90,
            right: 10,
            background: "#222",
            border: "2.5px solid #333",
            borderRadius: 8,
            padding: "10px 14px",
            boxShadow: "4px 4px 0 #555",
            zIndex: 10,
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-jetbrains-mono, 'JetBrains Mono'),monospace",
              fontSize: 10,
              color: "#aaa",
              letterSpacing: ".1em",
              textTransform: "uppercase",
            }}
          >
            {t("home.hero.startingFrom")}
          </div>
          <div
            style={{
              fontFamily: "var(--font-space-grotesk, 'Space Grotesk'),sans-serif",
              fontSize: 24,
              fontWeight: 800,
              color: "#D97706",
            }}
          >
            {t("home.hero.startingPrice")}
          </div>
        </div>
        <div
          className="float-badge"
          style={{
            position: "absolute",
            top: 200,
            left: 80,
            background: "#fda4af",
            border: "2.5px solid #222",
            borderRadius: 8,
            padding: "9px 13px",
            boxShadow: "4px 4px 0 #222",
            zIndex: 10,
            transform: "rotate(-4deg)",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-jetbrains-mono, 'JetBrains Mono'),monospace",
              fontSize: 9,
              color: "#7a2430",
              letterSpacing: ".1em",
              textTransform: "uppercase",
              fontWeight: 700,
            }}
          >
            {t("home.hero.themeWedding")}
          </div>
          <div
            style={{
              fontFamily: "var(--font-space-grotesk, 'Space Grotesk'),sans-serif",
              fontSize: 17,
              fontWeight: 800,
              color: "#222",
            }}
          >
            {t("home.hero.themeWeddingValue")}
          </div>
        </div>
        <div
          className="float-badge"
          style={{
            position: "absolute",
            bottom: 160,
            right: 40,
            background: "#86efac",
            border: "2.5px solid #222",
            borderRadius: 8,
            padding: "9px 13px",
            boxShadow: "4px 4px 0 #222",
            animationDelay: "1.4s",
            zIndex: 10,
            transform: "rotate(3deg)",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-jetbrains-mono, 'JetBrains Mono'),monospace",
              fontSize: 9,
              color: "#14532d",
              letterSpacing: ".1em",
              textTransform: "uppercase",
              fontWeight: 700,
            }}
          >
            {t("home.hero.themeFamily")}
          </div>
          <div
            style={{
              fontFamily: "var(--font-space-grotesk, 'Space Grotesk'),sans-serif",
              fontSize: 17,
              fontWeight: 800,
              color: "#222",
            }}
          >
            {t("home.hero.themeFamilyValue")}
          </div>
        </div>
        <div
          className="float-badge"
          style={{
            position: "absolute",
            top: 8,
            right: 150,
            background: "#fcd34d",
            border: "2.5px solid #222",
            borderRadius: 8,
            padding: "9px 13px",
            boxShadow: "4px 4px 0 #222",
            animationDelay: ".4s",
            zIndex: 10,
            transform: "rotate(2deg)",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-jetbrains-mono, 'JetBrains Mono'),monospace",
              fontSize: 9,
              color: "#713f12",
              letterSpacing: ".1em",
              textTransform: "uppercase",
              fontWeight: 700,
            }}
          >
            {t("home.hero.themeAnniversary")}
          </div>
          <div
            style={{
              fontFamily: "var(--font-space-grotesk, 'Space Grotesk'),sans-serif",
              fontSize: 17,
              fontWeight: 800,
              color: "#222",
            }}
          >
            {t("home.hero.themeAnniversaryValue")}
          </div>
        </div>
      </div>
    </section>
  );
}
