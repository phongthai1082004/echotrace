"use client";

import { useTranslation } from "react-i18next";
import { InstagramIcon, TwitterIcon, YoutubeIcon } from "@/features/landing/icons";

export function FooterSection() {
  const { t } = useTranslation();
  return (
    <footer
      className="px-5 pt-10 pb-8 sm:px-8 md:px-14 md:pt-14"
      style={{ background: "#222", borderTop: "2.5px solid #222" }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div
          className="grid grid-cols-1 gap-10 md:grid-cols-2 md:gap-12 lg:grid-cols-[2fr_1fr_1fr_1fr] lg:gap-12"
          style={{ marginBottom: 48 }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <div
                className="t-h3"
                style={{
                  background: "#F8F2E5",
                  color: "#222",
                  padding: "4px 12px",
                  borderRadius: 6,
                }}
              >
                {t("home.footer.brandBox")}
              </div>
              <div
                className="t-label"
                style={{
                  color: "#666",
                }}
              >
                {t("home.footer.brandTag")}
              </div>
            </div>
            <p
              className="t-small"
              style={{
                color: "#AAAAAA",
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
            <div key={i} className="text-center md:text-left">
              <div
                className="neo-label"
                style={{
                  color: "#AAAAAA",
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
                        className="t-small"
                        style={{
                          color: "#999999",
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
            className="t-caption"
            style={{
              color: "#555",
            }}
          >
            {t("home.footer.legal")}
          </div>
          <div style={{ display: "flex", gap: 20 }} className="mx-auto md:mx-0">
            {(t("home.footer.links", { returnObjects: true }) as string[]).map((link, i) => (
              <a
                key={i}
                href="#"
                className="t-label"
                style={{
                  color: "#555",
                  textDecoration: "none",
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
            className="t-label"
            style={{
              color: "#444",
            }}
          >
            {t("home.footer.coords")}
          </div>
        </div>
      </div>
    </footer>
  );
}
