"use client";

import { useTranslation } from "react-i18next";

export function PricingSection() {
  const { t } = useTranslation();
  return (
    <section style={{ padding: "96px 56px", borderBottom: "2.5px solid #222", background: "#FFF7D6" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <div className="coord-label" style={{ marginBottom: 8 }}>
            §05 — {t("home.pricing.section")}
          </div>
          <h2
            style={{
              fontFamily: "var(--font-space-grotesk, 'Space Grotesk'),sans-serif",
              fontSize: "clamp(30px,4vw,54px)",
              fontWeight: 800,
              color: "#222",
              margin: "0 0 12px",
              lineHeight: 1.05,
            }}
          >
            {t("home.pricing.titleLine1")}
            <br />
            {t("home.pricing.titleLine2")}
          </h2>
          <p
            style={{
              fontFamily: "var(--font-space-grotesk, 'Space Grotesk'),sans-serif",
              color: "#666",
              fontSize: 16,
              maxWidth: 400,
              margin: "0 auto",
            }}
          >
            {t("home.pricing.desc")}
          </p>
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
          {(t("home.pricing.tierLabels", { returnObjects: true }) as string[]).map((label, i) => (
            <a
              key={label}
              href="/checkout"
              className="btn-brutalist reveal"
              style={{
                background: ["#D97706", "#B54843", "#155724"][i],
                color: "#fff",
                fontSize: 13,
                letterSpacing: ".08em",
                padding: "12px 32px",
                transitionDelay: `${i * 110}ms`,
              }}
            >
              {label} — {["$29", "$49", "$89"][i]}
            </a>
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: 32 }}>
          <span
            style={{
              fontFamily: "var(--font-jetbrains-mono, 'JetBrains Mono'),monospace",
              fontSize: 11,
              color: "#888",
              letterSpacing: ".08em",
            }}
          >
            {t("home.pricing.note")}
          </span>
        </div>
      </div>
    </section>
  );
}
