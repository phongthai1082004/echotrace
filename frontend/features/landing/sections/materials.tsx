"use client";

import { useTranslation } from "react-i18next";
import { MaterialCard } from "@/features/landing/sections/material-card";

export function MaterialsSection() {
  const { t } = useTranslation();
  return (
    <section
      className="grid-paper"
      style={{ padding: "96px 56px", borderBottom: "2.5px solid #222", background: "#e8e6e0" }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div className="coord-label text-on-card" style={{ marginBottom: 8 }}>
          §04 — {t("home.materials.section")}
        </div>
        <h2
          style={{
            fontFamily: "var(--font-space-grotesk, 'Space Grotesk'),sans-serif",
            fontSize: "clamp(30px,4vw,52px)",
            fontWeight: 800,
            color: "#222",
            margin: "0 0 8px",
            lineHeight: 1.05,
          }}
        >
          {t("home.materials.titleLine1")}
          <br />
          <span style={{ color: "#B54843" }}>{t("home.materials.titleLine2")}</span>
        </h2>
        <p
          style={{
            fontFamily: "var(--font-space-grotesk, 'Space Grotesk'),sans-serif",
            color: "#444444",
            marginBottom: 48,
            maxWidth: 480,
            lineHeight: 1.6,
          }}
        >
          {t("home.materials.desc")}
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 24 }}>
          {(
            t("home.materials.items", { returnObjects: true }) as {
              name: string;
              tag: string;
              desc: string;
              badge: string;
            }[]
          ).map((m, i) => {
            const c = [
              {
                img: "https://images.unsplash.com/photo-1514467159223-eae20502f859?w=400&h=280&fit=crop&auto=format",
                accent: "#D97706",
              },
              {
                img: "https://images.unsplash.com/photo-1528569937393-ee892b976859?w=400&h=280&fit=crop&auto=format",
                accent: "#B54843",
              },
              {
                img: "https://images.unsplash.com/photo-1647541707168-82f7024cbc20?w=400&h=280&fit=crop&auto=format",
                accent: "#155724",
              },
            ][i];
            return (
              <MaterialCard
                key={i}
                name={m.name}
                tag={m.tag}
                desc={m.desc}
                imgUrl={c.img}
                accent={c.accent}
                badge={m.badge}
                delay={i * 110}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
