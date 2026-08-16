"use client";

import { useTranslation } from "react-i18next";
import { Book3D } from "@/features/landing/book-3d";
import weddingImg from "@/assets/images/travel.jpg";

export function CtaSection() {
  const { t } = useTranslation();
  return (
    <section className="grid-paper" style={{
      padding:"100px 56px", background:"#F8F2E5", borderBottom:"2.5px solid #222",
      display:"grid", gridTemplateColumns:"1fr 1fr", gap:60, alignItems:"center",
    }}>
      <div className="reveal">
        <div className="coord-label" style={{ marginBottom:12 }}>§07 — {t("home.cta.section")}</div>
        <h2 style={{ fontFamily:"var(--font-space-grotesk, 'Space Grotesk'),sans-serif", fontSize:"clamp(36px,5vw,64px)", fontWeight:800, color:"#222", lineHeight:1.0, margin:"0 0 22px", letterSpacing:"-.025em" }}>
          {t("home.cta.titleLine1")}<br />
          <span style={{ color:"#B54843" }}>{t("home.cta.titleLine2")}</span><br />
          {t("home.cta.titleLine3")}
        </h2>
        <p style={{ fontFamily:"var(--font-space-grotesk, 'Space Grotesk'),sans-serif", color:"#555", fontSize:16, lineHeight:1.65, maxWidth:400, margin:"0 0 36px" }}>
          {t("home.cta.desc")}
        </p>
        <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
          <a href="/studio" className="btn-brutalist" style={{ background:"#B54843", color:"#fff", fontSize:17, padding:"16px 32px" }}>
            {t("home.cta.ctaPrimary")}
          </a>
          <a href="/explore" className="btn-brutalist" style={{ background:"#FFF7D6", color:"#222", fontSize:17, padding:"16px 32px" }}>
            {t("home.cta.ctaSecondary")}
          </a>
        </div>
      </div>
      <div style={{ position:"relative", paddingBottom:80 }}>
        <Book3D
          autoRotate height={460}
          coverUrl={weddingImg.src}
        />
        <div className="float-badge" style={{
          position:"absolute", bottom:-12, left:-22,
          background:"#fda4af", border:"2.5px solid #222",
          borderRadius:8, padding:"9px 13px", boxShadow:"4px 4px 0 #222",
          transform:"rotate(-3deg)", zIndex:10,
        }}>
          <div style={{ fontFamily:"var(--font-jetbrains-mono, 'JetBrains Mono'),monospace", fontSize:9, color:"#7a2430", letterSpacing:".1em", textTransform:"uppercase", fontWeight:700 }}>{t("home.showcase.badgeWedding")}</div>
          <div style={{ fontFamily:"var(--font-space-grotesk, 'Space Grotesk'),sans-serif", fontSize:16, fontWeight:800, color:"#222" }}>{t("home.showcase.badgeWeddingValue")}</div>
        </div>
        <div className="float-badge" style={{
          position:"absolute", top:30, right:-10,
          background:"#fcd34d", border:"2.5px solid #222",
          borderRadius:8, padding:"9px 13px", boxShadow:"4px 4px 0 #222",
          animationDelay:"1s", transform:"rotate(3deg)", zIndex:10,
        }}>
          <div style={{ fontFamily:"var(--font-jetbrains-mono, 'JetBrains Mono'),monospace", fontSize:9, color:"#713f12", letterSpacing:".1em", textTransform:"uppercase", fontWeight:700 }}>{t("home.showcase.badgeBaby")}</div>
          <div style={{ fontFamily:"var(--font-space-grotesk, 'Space Grotesk'),sans-serif", fontSize:16, fontWeight:800, color:"#222" }}>{t("home.showcase.badgeBabyValue")}</div>
        </div>
        <div className="float-badge" style={{
          position:"absolute", bottom:70, right:-6,
          background:"#86efac", border:"2.5px solid #222",
          borderRadius:8, padding:"9px 13px", boxShadow:"4px 4px 0 #222",
          animationDelay:"1.7s", transform:"rotate(-2deg)", zIndex:10,
        }}>
          <div style={{ fontFamily:"var(--font-jetbrains-mono, 'JetBrains Mono'),monospace", fontSize:9, color:"#14532d", letterSpacing:".1em", textTransform:"uppercase", fontWeight:700 }}>{t("home.showcase.badgeGraduation")}</div>
          <div style={{ fontFamily:"var(--font-space-grotesk, 'Space Grotesk'),sans-serif", fontSize:16, fontWeight:800, color:"#222" }}>{t("home.showcase.badgeGraduationValue")}</div>
        </div>
      </div>
    </section>
  );
}