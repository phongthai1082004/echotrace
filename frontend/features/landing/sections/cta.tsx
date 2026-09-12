"use client";

import { useTranslation } from "react-i18next";
import dynamic from "next/dynamic";
const Book3D = dynamic(() => import("@/features/landing/book-3d").then((m) => m.Book3D), { ssr: false });
import weddingImg from "@/assets/images/travel.jpg";

export function CtaSection() {
  const { t } = useTranslation();
  return (
    <section
      className="grid-paper grid grid-cols-1 gap-10 px-5 py-14 sm:px-8 md:grid-cols-2 md:gap-12 md:px-14 md:py-20 lg:gap-[60px] lg:py-[100px]"
      style={{
        background: "#F8F2E5",
        borderBottom: "2.5px solid #222",
        alignItems: "center",
      }}
    >
      <div className="reveal">
        <div className="coord-label" style={{ marginBottom: 12 }}>
          §07 — {t("home.cta.section")}
        </div>
        <h2
          className="t-display"
          style={{
            color: "#222",
            margin: "0 0 22px",
          }}
        >
          {t("home.cta.titleLine1")}
          <br />
          <span style={{ color: "#B54843" }}>{t("home.cta.titleLine2")}</span>
          <br />
          {t("home.cta.titleLine3")}
        </h2>
        <p
          className="t-body"
          style={{
            color: "#555",
            maxWidth: 400,
            margin: "0 0 36px",
          }}
        >
          {t("home.cta.desc")}
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <a
            href="/studio"
            className="btn-brutalist"
            style={{ background: "#B54843", color: "#fff" }}
          >
            {t("home.cta.ctaPrimary")}
          </a>
          <a
            href="/explore"
            className="btn-brutalist"
            style={{ background: "#FFF7D6", color: "#222" }}
          >
            {t("home.cta.ctaSecondary")}
          </a>
        </div>
      </div>
      <div style={{ position: "relative", paddingBottom: 80 }}>
        <Book3D autoRotate height={460} coverUrl={weddingImg.src} />
        <div
          className="float-badge"
          style={{
            position: "absolute",
            bottom: -12,
            left: -22,
            background: "#fda4af",
            border: "2.5px solid #222",
            borderRadius: 8,
            padding: "9px 13px",
            boxShadow: "4px 4px 0 #222",
            transform: "rotate(-3deg)",
            zIndex: 10,
          }}
        >
          <div
            className="t-micro"
            style={{
              color: "#7a2430",
            }}
          >
            {t("home.showcase.badgeWedding")}
          </div>
          <div
            className="t-badge"
            style={{
              color: "#222",
            }}
          >
            {t("home.showcase.badgeWeddingValue")}
          </div>
        </div>
        <div
          className="float-badge"
          style={{
            position: "absolute",
            top: 30,
            right: -10,
            background: "#fcd34d",
            border: "2.5px solid #222",
            borderRadius: 8,
            padding: "9px 13px",
            boxShadow: "4px 4px 0 #222",
            animationDelay: "1s",
            transform: "rotate(3deg)",
            zIndex: 10,
          }}
        >
          <div
            className="t-micro"
            style={{
              color: "#713f12",
            }}
          >
            {t("home.showcase.badgeBaby")}
          </div>
          <div
            className="t-badge"
            style={{
              color: "#222",
            }}
          >
            {t("home.showcase.badgeBabyValue")}
          </div>
        </div>
        <div
          className="float-badge"
          style={{
            position: "absolute",
            bottom: 70,
            right: -6,
            background: "#86efac",
            border: "2.5px solid #222",
            borderRadius: 8,
            padding: "9px 13px",
            boxShadow: "4px 4px 0 #222",
            animationDelay: "1.7s",
            transform: "rotate(-2deg)",
            zIndex: 10,
          }}
        >
          <div
            className="t-micro"
            style={{
              color: "#14532d",
            }}
          >
            {t("home.showcase.badgeGraduation")}
          </div>
          <div
            className="t-badge"
            style={{
              color: "#222",
            }}
          >
            {t("home.showcase.badgeGraduationValue")}
          </div>
        </div>
      </div>
    </section>
  );
}
