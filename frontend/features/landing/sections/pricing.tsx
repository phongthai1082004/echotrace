"use client";

import { useTranslation } from "react-i18next";

export function PricingSection() {
  const { t } = useTranslation();
  return (
    <section
      className="px-5 py-14 sm:px-8 md:px-14 md:py-20 lg:py-24"
      style={{ borderBottom: "2.5px solid #222", background: "#FFF7D6" }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <h2
            className="t-h2"
            style={{
              color: "#222",
              margin: "0 0 12px",
            }}
          >
            {t("home.pricing.titleLine1")}
            <br />
            {t("home.pricing.titleLine2")}
          </h2>
          <p
            className="t-body"
            style={{
              color: "#555555",
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
              className="btn-brutalist btn-brutalist-sm reveal"
              style={{
                background: ["#D97706", "#B54843", "#155724"][i],
                color: "#fff",
                letterSpacing: ".08em",
                transitionDelay: `${i * 110}ms`,
              }}
            >
              {label} — {["$29", "$49", "$89"][i]}
            </a>
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: 32 }}>
          <span
            className="t-small"
            style={{
              color: "#666666",
              letterSpacing: ".03em",
            }}
          >
            {t("home.pricing.note")}
          </span>
        </div>
      </div>
    </section>
  );
}
