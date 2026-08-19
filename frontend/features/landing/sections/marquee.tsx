"use client";

import { useTranslation } from "react-i18next";

export function Marquee() {
  const { t } = useTranslation();
  const items = [
    ...(t("home.marquee", { returnObjects: true }) as string[]),
    ...(t("home.marquee", { returnObjects: true }) as string[]),
  ];
  return (
    <div
      className="marquee-wrap"
      style={{
        background: "#222",
        borderTop: "2.5px solid #222",
        borderBottom: "2.5px solid #222",
        overflow: "hidden",
        padding: "14px 0",
      }}
    >
      <div className="marquee-inner" style={{ display: "flex", whiteSpace: "nowrap", width: "max-content" }}>
        {items.map((item, i) => (
          <span key={i} style={{ display: "inline-flex", alignItems: "center" }}>
            <span
              style={{
                fontFamily: "var(--font-jetbrains-mono, 'JetBrains Mono'),monospace",
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: ".15em",
                color: i % 3 === 0 ? "#D97706" : i % 3 === 1 ? "#F8F2E5" : "#B54843",
                padding: "0 28px",
              }}
            >
              {item}
            </span>
            <span style={{ color: "#555", fontSize: 14 }}>✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}
