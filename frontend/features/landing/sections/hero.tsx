"use client";

import { ArrowRight, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
const Book3D = dynamic(() => import("@/features/landing/book-3d").then((m) => m.Book3D), {
  ssr: false,
  loading: () => <div style={{ width: "100%", height: 500 }} />,
});
import parisImg from "@/assets/images/wedding.webp";
import { trackEvent } from "@/lib/analytics";

export function HeroSection() {
  const { t } = useTranslation();
  const [show3D, setShow3D] = useState(false);
  useEffect(() => {
    const mount = () => setShow3D(true);
    if (typeof window === "undefined") return;
    if ("requestIdleCallback" in window) {
      const id = (window as any).requestIdleCallback(mount, { timeout: 1500 });
      return () => (window as any).cancelIdleCallback?.(id);
    }
    const t = setTimeout(mount, 800);
    return () => clearTimeout(t);
  }, []);
  return (
    <section
      className="grid-paper hero-grid md:grid-cols-2"
      style={{
        minHeight: "92vh",
        display: "grid",
        alignItems: "center",
        position: "relative",
        overflow: "hidden",
        borderBottom: "2.5px solid #222",
      }}
    >
      <div
        className="px-5 py-12 sm:px-8 md:px-14 md:py-20"
        style={{ position: "relative", zIndex: 2 }}
      >
        <div className="coord-label text-on-card" style={{ marginBottom: 12 }}>
          {t("home.hero.location")}
        </div>
        <h1
          className="t-display"
          style={{
            color: "#222",
            margin: "0 0 22px",
          }}
        >
          {t("home.hero.titleLine1")}
          <br />
          <span style={{ color: "#B54843" }}>{t("home.hero.titleLine2")}</span>
          <br />
          {t("home.hero.titleLine3")}
        </h1>
        <p
          className="t-body"
          style={{
            color: "#444444",
            margin: "0 0 34px",
            maxWidth: 400,
          }}
        >
          {t("home.hero.subhead")}
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 40 }}>
          <a href="/studio" onClick={() => trackEvent("open_studio")} className="btn-brutalist" style={{ background: "#B54843", color: "#fff" }}>
            {t("home.hero.ctaPrimary")}
          </a>
          <a href="/explore" className="btn-brutalist btn-brutalist-secondary">
            {t("home.hero.ctaSecondary")} <ArrowRight size={16} />
          </a>
        </div>
      </div>

      <div
        className="p-6 md:py-[60px] md:pl-0 md:pr-10"
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {show3D ? <Book3D autoRotate={false} height={500} coverUrl={parisImg.src} /> : <div style={{ width: "100%", height: 500 }} />}
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
            className="t-label"
            style={{
              color: "#666",
            }}
          >
            {t("home.hero.shipsIn")}
          </div>
          <div
            className="t-badge"
            style={{
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
            className="t-label"
            style={{
              color: "#aaa",
            }}
          >
            {t("home.hero.startingFrom")}
          </div>
          <div
            className="t-badge"
            style={{
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
            className="t-micro"
            style={{
              color: "#7a2430",
            }}
          >
            {t("home.hero.themeWedding")}
          </div>
          <div
            className="t-badge"
            style={{
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
            className="t-micro"
            style={{
              color: "#14532d",
            }}
          >
            {t("home.hero.themeFamily")}
          </div>
          <div
            className="t-badge"
            style={{
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
            className="t-micro"
            style={{
              color: "#713f12",
            }}
          >
            {t("home.hero.themeAnniversary")}
          </div>
          <div
            className="t-badge"
            style={{
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
