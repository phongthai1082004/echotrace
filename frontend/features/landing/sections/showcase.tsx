"use client";

import { ArrowRight, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ShowcaseSlider } from "@/features/landing/sections/showcase-slider";

export function ShowcaseSection() {
  const { t } = useTranslation();
  return (
    <section style={{ padding: "96px 56px", borderBottom: "2.5px solid #222", background: "#F8F2E5" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div className="coord-label" style={{ marginBottom: 8 }}>
          §03 — {t("home.showcase.section")}
        </div>
        <h2
          style={{
            fontFamily: "var(--font-space-grotesk, 'Space Grotesk'),sans-serif",
            fontSize: "clamp(30px,4vw,52px)",
            fontWeight: 800,
            color: "#222",
            margin: "0 0 48px",
            lineHeight: 1.05,
          }}
        >
          {t("home.showcase.titleLine1")}
          <br />
          <span style={{ color: "#D97706" }}>{t("home.showcase.titleLine2")}</span>
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "start" }}>
          <div className="reveal">
            <span
              className="sticker-label"
              style={{
                background: "#222",
                color: "#F8F2E5",
                borderColor: "#222",
                marginBottom: 16,
                display: "inline-block",
              }}
            >
              {t("home.showcase.galleryTitle")}
            </span>
            <p
              style={{
                fontFamily: "var(--font-space-grotesk, 'Space Grotesk'),sans-serif",
                color: "#555",
                fontSize: 17,
                lineHeight: 1.75,
                margin: "0 0 28px",
              }}
            >
              {t("home.showcase.galleryBody")}
            </p>
            <ul
              style={{
                listStyle: "none",
                margin: 0,
                padding: 0,
                display: "grid",
                gridTemplateColumns: "repeat(2,minmax(0,1fr))",
                gap: 12,
              }}
            >
              {["point1", "point2", "point3", "point4", "point5", "point6", "point7"].map((k) => (
                <li key={k} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Check size={18} style={{ color: "#D97706", flexShrink: 0 }} />
                  <span
                    style={{
                      fontFamily: "var(--font-space-grotesk, 'Space Grotesk'),sans-serif",
                      color: "#222",
                      fontSize: 15,
                      fontWeight: 600,
                    }}
                  >
                    {t(`home.showcase.${k}`)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="reveal">
            <div style={{ marginBottom: 20 }}>
              <span
                className="sticker-label"
                style={{
                  background: "#D97706",
                  color: "#fff",
                  borderColor: "#D97706",
                  marginBottom: 12,
                  display: "inline-block",
                }}
              >
                {t("home.showcase.sampleCovers")}
              </span>
              <p
                style={{
                  fontFamily: "var(--font-space-grotesk, 'Space Grotesk'),sans-serif",
                  color: "#555",
                  fontSize: 15,
                  lineHeight: 1.6,
                }}
              >
                {t("home.showcase.desc")}
              </p>
            </div>
            <ShowcaseSlider />
            <div style={{ marginTop: 20 }}>
              <a
                href="/explore"
                className="btn-brutalist"
                style={{ background: "#222", color: "#F8F2E5", fontSize: 14, padding: "11px 22px" }}
              >
                {t("home.showcase.browseGallery")} <ArrowRight size={15} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
