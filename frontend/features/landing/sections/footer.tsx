"use client";

import { useTranslation } from "react-i18next";
import { InstagramIcon, TwitterIcon, YoutubeIcon } from "@/features/landing/icons";

export function FooterSection() {
  const { t } = useTranslation();
  return (
    <footer style={{ background: "#222", borderTop: "2.5px solid #222", padding: "56px 56px 32px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 48, marginBottom: 48 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <div
                style={{
                  background: "#F8F2E5",
                  color: "#222",
                  fontFamily: "var(--font-space-grotesk, 'Space Grotesk'),sans-serif",
                  fontWeight: 800,
                  fontSize: 20,
                  padding: "4px 12px",
                  borderRadius: 6,
                }}
              >
                {t("home.footer.brandBox")}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-jetbrains-mono, 'JetBrains Mono'),monospace",
                  fontSize: 10,
                  color: "#666",
                  letterSpacing: ".1em",
                }}
              >
                {t("home.footer.brandTag")}
              </div>
            </div>
            <p
              style={{
                fontFamily: "var(--font-space-grotesk, 'Space Grotesk'),sans-serif",
                color: "#888",
                fontSize: 14,
                lineHeight: 1.65,
                maxWidth: 260,
                margin: "0 0 20px",
              }}
            >
              {t("home.footer.desc")}
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              {[InstagramIcon, TwitterIcon, YoutubeIcon].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 36,
                    height: 36,
                    background: "rgba(248,242,229,.08)",
                    border: "1.5px solid rgba(248,242,229,.2)",
                    borderRadius: 6,
                    color: "#F8F2E5",
                    transition: "background .15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(248,242,229,.15)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(248,242,229,.08)")}
                >
                  <Icon size={15} />
                </a>
              ))}
            </div>
          </div>
          {(t("home.footer.cols", { returnObjects: true }) as { title: string; links: string[] }[]).map((col, i) => (
            <div key={i}>
              <div
                style={{
                  fontFamily: "var(--font-jetbrains-mono, 'JetBrains Mono'),monospace",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: ".15em",
                  color: "#666",
                  textTransform: "uppercase",
                  marginBottom: 16,
                }}
              >
                {col.title}
              </div>
              <ul
                style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}
              >
                {col.links.map((link, j) => (
                  <li key={j}>
                    <a
                      href="#"
                      style={{
                        fontFamily: "var(--font-space-grotesk, 'Space Grotesk'),sans-serif",
                        color: "#888",
                        fontSize: 14,
                        textDecoration: "none",
                        transition: "color .15s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#F8F2E5")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "#888")}
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div
          style={{
            borderTop: "1px solid rgba(248,242,229,.12)",
            paddingTop: 24,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-jetbrains-mono, 'JetBrains Mono'),monospace",
              fontSize: 11,
              color: "#555",
              letterSpacing: ".06em",
            }}
          >
            {t("home.footer.legal")}
          </div>
          <div style={{ display: "flex", gap: 20 }}>
            {(t("home.footer.links", { returnObjects: true }) as string[]).map((link, i) => (
              <a
                key={i}
                href="#"
                style={{
                  fontFamily: "var(--font-jetbrains-mono, 'JetBrains Mono'),monospace",
                  fontSize: 10,
                  color: "#555",
                  textDecoration: "none",
                  letterSpacing: ".06em",
                  transition: "color .15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#F8F2E5")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#555")}
              >
                {link}
              </a>
            ))}
          </div>
          <div
            style={{
              fontFamily: "var(--font-jetbrains-mono, 'JetBrains Mono'),monospace",
              fontSize: 10,
              color: "#444",
              letterSpacing: ".06em",
            }}
          >
            {t("home.footer.coords")}
          </div>
        </div>
      </div>
    </footer>
  );
}
