"use client";

import { ArrowRight, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ShowcaseSlider } from "@/features/landing/sections/showcase-slider";

export function ShowcaseSection() {
  const { t } = useTranslation();
  return (
    <section
      className="px-5 py-14 sm:px-8 md:px-14 md:py-20 lg:py-24"
      style={{ borderBottom: "2.5px solid #222", background: "#F8F2E5" }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div className="coord-label text-on-card" style={{ marginBottom: 8 }}>
          §03 — {t("home.showcase.section")}
        </div>
        <h2
          className="t-h2"
          style={{
            color: "#222",
            margin: "0 0 48px",
          }}
        >
          {t("home.showcase.titleLine1")}
          <br />
          <span style={{ color: "#D97706" }}>{t("home.showcase.titleLine2")}</span>
        </h2>
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 md:gap-12" style={{ alignItems: "start" }}>
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
              className="t-body"
              style={{
                color: "#444444",
                margin: "0 0 28px",
              }}
            >
              {t("home.showcase.galleryBody")}
            </p>
            <ul
              className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-3"
              style={{
                listStyle: "none",
                margin: 0,
                padding: 0,
              }}
            >
              {["point1", "point2", "point3", "point4", "point5", "point6", "point7"].map((k) => (
                <li key={k} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Check size={18} style={{ color: "#D97706", flexShrink: 0 }} />
                  <span
                    className="t-small font-semibold"
                    style={{
                      color: "#222",
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
                className="t-small"
                style={{
                  color: "#555",
                }}
              >
                {t("home.showcase.desc")}
              </p>
            </div>
            <ShowcaseSlider />
            <div style={{ marginTop: 20 }}>
              <a
                href="/explore"
                className="btn-brutalist btn-brutalist-sm"
                style={{ background: "#222", color: "#F8F2E5" }}
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
