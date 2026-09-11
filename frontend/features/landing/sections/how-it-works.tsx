"use client";

import { BookOpen, ChevronRight, Layers, Truck } from "lucide-react";
import { useTranslation } from "react-i18next";

export function HowItWorksSection() {
  const { t } = useTranslation();
  return (
    <section
      className="grid-paper-sm px-5 py-14 sm:px-8 md:px-14 md:py-20 lg:py-24"
      style={{ borderBottom: "2.5px solid #222", background: "#FFF7D6" }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div
          style={{
            marginBottom: 56,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div>
            <div className="coord-label text-on-card-muted" style={{ marginBottom: 8 }}>
              §02 — {t("home.process.section")}
            </div>
            <h2
              style={{
                fontFamily: "var(--font-space-grotesk, 'Space Grotesk'),sans-serif",
                fontSize: "clamp(32px,4vw,52px)",
                fontWeight: 800,
                color: "#222",
                margin: 0,
                lineHeight: 1.05,
              }}
            >
              {t("home.process.titleLine1")}
              <br />
              <span style={{ color: "#B54843" }}>{t("home.process.titleLine2")}</span>
            </h2>
          </div>
          <p
            style={{
              fontFamily: "var(--font-space-grotesk, 'Space Grotesk'),sans-serif",
              color: "#555555",
              maxWidth: 340,
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            {t("home.process.desc")}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {(t("home.process.steps", { returnObjects: true }) as { label: string; title: string; desc: string }[]).map(
            (step, i) => {
              const meta = [
                { icon: <Layers size={28} />, color: "#B54843" },
                { icon: <BookOpen size={28} />, color: "#D97706" },
                { icon: <Truck size={28} />, color: "#155724" },
              ][i];
              return (
                <div
                  key={i}
                  className="card-brutalist reveal"
                  style={{
                    background: "#F8F2E5",
                    borderRadius: 10,
                    padding: "32px 28px",
                    position: "relative",
                    transitionDelay: `${i * 110}ms`,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                    <span style={{ color: meta.color, display: "flex" }}>{meta.icon}</span>
                    <span
                      className="sticker-label"
                      style={{ background: meta.color, color: "#fff", borderColor: meta.color }}
                    >
                      {step.label}
                    </span>
                  </div>
                  <h3
                    style={{
                      fontFamily: "var(--font-space-grotesk, 'Space Grotesk'),sans-serif",
                      fontSize: 22,
                      fontWeight: 700,
                      color: "#222",
                      margin: "0 0 12px",
                    }}
                  >
                    {step.title}
                  </h3>
                  <p
                    style={{
                      fontFamily: "var(--font-space-grotesk, 'Space Grotesk'),sans-serif",
                      color: "#555555",
                      fontSize: 14,
                      lineHeight: 1.65,
                      margin: 0,
                    }}
                  >
                    {step.desc}
                  </p>
                  {i < 2 && (
                    <ChevronRight
                      size={20}
                      style={{
                        position: "absolute",
                        right: -13,
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "#222",
                        color: "#F8F2E5",
                        borderRadius: "50%",
                        padding: 2,
                        zIndex: 2,
                      }}
                    />
                  )}
                </div>
              );
            },
          )}
        </div>
      </div>
    </section>
  );
}
