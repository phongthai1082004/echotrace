"use client";

import { useTranslation } from "react-i18next";
import { MaterialCard } from "@/features/landing/sections/material-card";

export function MaterialsSection() {
  const { t } = useTranslation();
  return (
    <section
      className="grid-paper px-5 py-14 sm:px-8 md:px-14 md:py-20 lg:py-24"
      style={{ borderBottom: "2.5px solid #222", background: "#e8e6e0" }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div className="coord-label text-on-card" style={{ marginBottom: 8 }}>
          §04 — {t("home.materials.section")}
        </div>
        <h2
          className="t-h2"
          style={{
            color: "#222",
            margin: "0 0 8px",
          }}
        >
          {t("home.materials.titleLine1")}
          <br />
          <span style={{ color: "#B54843" }}>{t("home.materials.titleLine2")}</span>
        </h2>
        <p
          className="t-small"
          style={{
            color: "#444444",
            marginBottom: 48,
            maxWidth: 480,
          }}
        >
          {t("home.materials.desc")}
        </p>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-4 lg:gap-6">
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
