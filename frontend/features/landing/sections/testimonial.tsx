"use client";

import { BookOpen, Star, Users } from "lucide-react";
import { useTranslation } from "react-i18next";

export function TestimonialSection() {
  const { t } = useTranslation();
  return (
    <section
      className="px-5 py-14 sm:px-8 md:px-14 md:py-20"
      style={{
        background: "#222",
        borderTop: "2.5px solid #222",
        borderBottom: "2.5px solid #222",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(248,242,229,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(248,242,229,.04) 1px,transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div
        className="reveal"
        style={{ maxWidth: 900, margin: "0 auto", textAlign: "center", position: "relative", zIndex: 2 }}
      >
        <div className="coord-label text-on-dark-muted" style={{ color: "#AAAAAA", marginBottom: 24 }}>
          §06 — {t("home.testimonial.section")}
        </div>
        <div
          style={{
            fontFamily: "var(--font-space-grotesk, 'Space Grotesk'),sans-serif",
            fontSize: 80,
            color: "#B54843",
            lineHeight: 0.7,
            marginBottom: 16,
            fontWeight: 800,
          }}
        >
          "
        </div>
        <blockquote
          style={{
            fontFamily: "var(--font-space-grotesk, 'Space Grotesk'),sans-serif",
            fontSize: "clamp(22px,3.5vw,42px)",
            fontWeight: 700,
            color: "#F8F2E5",
            lineHeight: 1.4,
            margin: "0 0 32px",
            letterSpacing: "-.01em",
          }}
        >
          {t("home.testimonial.quote")}
        </blockquote>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "#B54843",
              border: "2.5px solid #F8F2E5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-space-grotesk, 'Space Grotesk'),sans-serif",
              color: "#fff",
              fontWeight: 700,
              fontSize: 18,
            }}
          >
            S
          </div>
          <div style={{ textAlign: "left" }}>
            <div
              style={{
                fontFamily: "var(--font-space-grotesk, 'Space Grotesk'),sans-serif",
                color: "#F8F2E5",
                fontWeight: 700,
                fontSize: 16,
              }}
            >
              {t("home.testimonial.name")}
            </div>
            <div
              style={{
                fontFamily: "var(--font-jetbrains-mono, 'JetBrains Mono'),monospace",
                fontSize: 12,
                color: "#AAAAAA",
                letterSpacing: ".05em",
              }}
            >
              {t("home.testimonial.detail")}
            </div>
          </div>
          <div style={{ display: "flex", gap: 2, marginLeft: 8 }}>
            {Array(5)
              .fill(0)
              .map((_, i) => (
                <Star key={i} size={14} fill="#D97706" color="#D97706" />
              ))}
          </div>
        </div>
        <div
          className="grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-px"
          style={{
            marginTop: 64,
            borderTop: "1px solid rgba(248,242,229,.15)",
            paddingTop: 48,
          }}
        >
          {[
            { val: "50,000+", icon: <BookOpen size={16} /> },
            { val: "4.9★", icon: <Star size={16} /> },
            { val: "98%", icon: <Users size={16} /> },
          ].map((stat, i) => (
              <div
                key={i}
                className="md:border-l md:border-[rgba(248,242,229,.15)] md:first:border-l-0"
                style={{
                  textAlign: "center",
                  padding: "0 20px",
                }}
              >
              <div style={{ color: "#D97706", marginBottom: 6 }}>{stat.icon}</div>
              <div
                style={{
                  fontFamily: "var(--font-space-grotesk, 'Space Grotesk'),sans-serif",
                  fontSize: 36,
                  fontWeight: 800,
                  color: "#F8F2E5",
                  lineHeight: 1,
                }}
              >
                {stat.val}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-jetbrains-mono, 'JetBrains Mono'),monospace",
                  fontSize: 10,
                  color: "#666",
                  letterSpacing: ".12em",
                  textTransform: "uppercase",
                  marginTop: 6,
                }}
              >
                {(t("home.testimonial.statsLabels", { returnObjects: true }) as string[])[i]}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
