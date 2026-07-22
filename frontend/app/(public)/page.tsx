"use client";

import { useRef } from "react";
import Link from "next/link";
import { cloudinaryUrl } from "@/lib/cloudinary";
import { useTranslation, Trans } from "react-i18next";

const ITEM_W = 260;

const originLogs = [
  { id: "1", title: "Ha Long Bay at Dawn", location: "Quảng Ninh, Vietnam", coords: "20.91° N, 107.18° E", image: "https://images.unsplash.com/photo-1775830150436-1cbe3d5ad3c6?w=800&h=1000&fit=crop&auto=format" },
  { id: "2", title: "Road Through Connemara", location: "County Galway, Ireland", coords: "53.53° N, 9.90° W", image: "https://images.unsplash.com/photo-1757679789909-29f58dfd065b?w=1200&h=800&fit=crop&auto=format" },
  { id: "3", title: "Harvest Plain, Hokkaido", location: "Furano, Japan", coords: "43.34° N, 142.38° E", image: "https://images.unsplash.com/photo-1533093814449-96af23c8f43f?w=800&h=1100&fit=crop&auto=format" },
  { id: "4", title: "High Atlas Summit", location: "Toubkal, Morocco", coords: "31.06° N, 7.92° W", image: "https://images.unsplash.com/photo-1765660996991-31f345c40247?w=900&h=1200&fit=crop&auto=format" },
  { id: "5", title: "Sapa Misty Morning", location: "Lào Cai, Vietnam", coords: "22.34° N, 103.84° E", image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=1000&fit=crop&auto=format" },
  { id: "6", title: "Venice Canals", location: "Veneto, Italy", coords: "45.44° N, 12.32° E", image: "https://images.unsplash.com/photo-1514890547357-a9ee288728e0?w=800&h=1000&fit=crop&auto=format" },
  { id: "7", title: "Bali Rice Terraces", location: "Tegalalang, Indonesia", coords: "8.43° S, 115.28° E", image: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&h=1000&fit=crop&auto=format" },
  { id: "8", title: "Patagonia Glacier", location: "Torres del Paine, Chile", coords: "51.00° S, 73.00° W", image: "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=800&h=1000&fit=crop&auto=format" },
  { id: "9", title: "Santorini Sunset", location: "Cyclades, Greece", coords: "36.39° N, 25.46° E", image: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=800&h=1000&fit=crop&auto=format" },
  { id: "10", title: "Kyoto Bamboo Grove", location: "Kyoto, Japan", coords: "35.00° N, 135.67° E", image: "https://arashiyamabambooforest.com/wp-content/uploads/2025/01/Arashiyama-Bamboo-Grove-5-683x1024.jpg" },
  { id: "11", title: "Mountain Lore", location: "Cappadocia, Turkey", coords: "38.64° N, 34.83° E", image: "https://images.unsplash.com/photo-1539367628448-4bc5c9d171c8?w=800&h=1000&fit=crop&auto=format" },
  { id: "12", title: "Namib Dune", location: "Sossusvlei, Namibia", coords: "24.73° S, 15.38° E", image: "https://images.unsplash.com/photo-1504151932400-72d4384f04b3?w=800&h=1000&fit=crop&auto=format" },
];

const plans = [
  { nameKey: "home.pricing.plans.softcover.name", price: "$29", pagesKey: "home.pricing.plans.softcover.pages", paperKey: "home.pricing.plans.softcover.paper", bindingKey: "home.pricing.plans.softcover.binding", coverKey: "home.pricing.plans.softcover.cover", popular: false },
  { nameKey: "home.pricing.plans.hardcover.name", price: "$49", pagesKey: "home.pricing.plans.hardcover.pages", paperKey: "home.pricing.plans.hardcover.paper", bindingKey: "home.pricing.plans.hardcover.binding", coverKey: "home.pricing.plans.hardcover.cover", popular: true },
  { nameKey: "home.pricing.plans.leather.name", price: "$89", pagesKey: "home.pricing.plans.leather.pages", paperKey: "home.pricing.plans.leather.paper", bindingKey: "home.pricing.plans.leather.binding", coverKey: "home.pricing.plans.leather.cover", popular: false },
];

const allLogs = [...originLogs, ...originLogs.map((l, i) => ({ ...l, id: `${l.id}-${i}` }))];

export default function HomePage() {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);

  const slide = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -ITEM_W : ITEM_W, behavior: "smooth" });
    clearTimeout((el as any)._infTimer);
    (el as any)._infTimer = setTimeout(() => {
      const half = el.scrollWidth / 2;
      if (el.scrollLeft >= half) el.scrollLeft -= half;
      else if (el.scrollLeft <= 10) el.scrollLeft += half;
    }, 400);
  };

  return (
    <div className="min-h-screen">
      {/* ─── Hero ─── */}
      <section className="pt-15 min-h-screen flex flex-col lg:flex-row border-b-[3px] border-[#222]">
        <div className="relative overflow-hidden bg-[#e8e6e0] lg:w-[60%] min-h-[50vh] lg:min-h-[calc(100vh-60px)]">
          <img src="https://images.unsplash.com/photo-1775830150436-1cbe3d5ad3c6?w=1400&h=1000&fit=crop&auto=format" alt="Ha Long Bay" className="w-full h-full object-cover object-center absolute inset-0" loading="lazy" />
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-[#222] border-t-[3px] border-[#222]">
            <p className="font-mono text-[10px] font-bold text-white tracking-wider uppercase">20.91° N, 107.18° E — Ha Long Bay, Vietnam</p>
          </div>
        </div>
        <div className="flex flex-col justify-between p-8 max-[1600px]:p-6 max-[1440px]:p-5 lg:p-12 lg:w-[40%] bg-[#FFF7D6] border-l-[3px] border-[#222]">
          <div>
            <p className="font-mono text-[10px] font-bold tracking-widest uppercase mb-8 text-[#666]">{t("home.hero.vol")}</p>
            <h1 className="text-5xl lg:text-6xl font-bold leading-[0.95] mb-6 whitespace-pre-line">
              {t("home.hero.headline")?.replace(/\\n/g, '\n')}
            </h1>
            <p className="text-sm leading-relaxed max-w-xs text-[#666] mb-8">{t("home.hero.subhead")}</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/studio" className="bg-[#222] text-white font-bold text-[11px] tracking-widest uppercase py-4 px-6 rounded-[10px] border-[3px] border-[#222] shadow-[4px_4px_0_#222] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#222] transition-all text-center">
                {t("home.hero.ctaPrimary")} →
              </Link>
              <Link href="/explore" className="bg-transparent text-[#222] font-bold text-[11px] tracking-widest uppercase py-4 px-6 rounded-[10px] border-[3px] border-[#222] hover:bg-white/50 transition-all text-center">
                {t("home.hero.ctaSecondary")}
              </Link>
            </div>
            <div className="flex items-center gap-2 mt-6">
              <div className="flex -space-x-2">
                {["https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=48&h=48&fit=crop", "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=48&h=48&fit=crop", "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=48&h=48&fit=crop"].map((u, i) => (
                  <img key={i} src={u} alt="" className="w-8 h-8 rounded-full border-[2px] border-[#222]" loading="lazy" />
                ))}
              </div>
              <p className="font-mono text-[8px] font-bold tracking-widest uppercase text-[#666]"><Trans i18nKey="home.hero.socialProof" values={{ count: "10,000+" }} components={{ bold: <span className="text-[#222]" /> }} /></p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Field Journals (slider) ─── */}
      <section className="px-8 max-[1600px]:px-6 max-[1440px]:px-5 max-[1280px]:px-4 lg:px-16 py-16 max-[1600px]:py-12 max-[1440px]:py-10 max-[1280px]:py-8 overflow-hidden">
        <div className="flex items-end justify-between mb-10 pb-5 border-b-[3px] border-[#222]">
          <div>
            <p className="font-mono text-[10px] font-bold tracking-widest uppercase mb-1 text-[#666]">{t("home.fieldJournals.sub")}</p>
            <h2 className="text-4xl lg:text-5xl font-bold">{t("home.fieldJournals.title")}</h2>
          </div>
        </div>
        <div className="relative">
          <button onClick={() => slide("left")} className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 w-10 h-10 rounded-full bg-[#FFF7D6] text-[#222] flex items-center justify-center border-[3px] border-[#222] shadow-[3px_3px_0_#222] hover:bg-white transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button onClick={() => slide("right")} className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 w-10 h-10 rounded-full bg-[#FFF7D6] text-[#222] flex items-center justify-center border-[3px] border-[#222] shadow-[3px_3px_0_#222] hover:bg-white transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          </button>
          <div ref={scrollRef} className="flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide" style={{ scrollbarWidth: "none" }}>
          {allLogs.map((log) => (
            <Link key={log.id} href="/explore" className="snap-start shrink-0 w-[220px] bg-[#FFF7D6] rounded-[10px] border-[3px] border-[#222] shadow-[4px_4px_0_#222] overflow-hidden hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#222] transition-all">
              <div className="overflow-hidden aspect-[3/4]">
                <img src={cloudinaryUrl(log.image)} alt={log.title} className="w-full h-full object-cover" loading="lazy" />
              </div>
              <div className="p-4 border-t-[3px] border-[#222]">
                <p className="font-mono text-[9px] font-bold tracking-widest uppercase text-[#666] mb-2">{log.coords}</p>
                <h3 className="text-base font-bold mb-1 truncate">{log.title}</h3>
                <p className="font-mono text-[9px] text-[#999] truncate">{log.location}</p>
              </div>
            </Link>
          ))}
        </div>
        </div>
      </section>

      {/* ─── Feature Marquee ─── */}
      <section className="py-4 px-8 max-[1600px]:px-6 max-[1440px]:px-5 max-[1280px]:px-4 overflow-hidden border-y-[3px] border-[#222] bg-[#FFF7D6]">
        <div className="flex gap-10 items-center whitespace-nowrap">
          {["home.marquee.editorialTypography", "home.marquee.asymmetricLayouts", "home.marquee.gpsMetadata", "home.marquee.archivalPaper", "home.marquee.hardShadows", "home.marquee.premiumBinding", "home.marquee.handcrafted"].map((k) => (
            <span key={k} className="font-mono text-[10px] font-bold tracking-widest uppercase shrink-0 text-[#666]">— {t(k)}</span>
          ))}
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section className="px-8 max-[1600px]:px-6 max-[1440px]:px-5 max-[1280px]:px-4 lg:px-16 py-20 max-[1600px]:py-16 max-[1440px]:py-14 max-[1280px]:py-12 bg-[#FFF7D6] border-b-[3px] border-[#222]">
        <div className="max-w-4xl mx-auto">
          <p className="font-mono text-[10px] font-bold tracking-widest uppercase mb-2 text-[#666]">{t("home.howItWorks.sub")}</p>
          <h2 className="text-4xl lg:text-5xl font-bold mb-14">{t("home.howItWorks.title")}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "01", title: t("home.howItWorks.step1Title"), desc: t("home.howItWorks.step1Desc") },
              { step: "02", title: t("home.howItWorks.step2Title"), desc: t("home.howItWorks.step2Desc") },
              { step: "03", title: t("home.howItWorks.step3Title"), desc: t("home.howItWorks.step3Desc") },
            ].map((s) => (
              <div key={s.step} className="bg-white rounded-[10px] border-[3px] border-[#222] shadow-[4px_4px_0_#222] p-6">
                <p className="font-mono text-3xl font-bold text-[#222] mb-4">{s.step}</p>
                <h3 className="text-lg font-bold mb-2">{s.title}</h3>
                <p className="text-sm text-[#666] leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link href="/explore" className="inline-flex bg-transparent text-[#222] font-bold text-[10px] tracking-widest uppercase py-3.5 px-6 rounded-[8px] border-[3px] border-[#222] hover:bg-white transition-all">
              {t("home.howItWorks.cta")}
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Why Cabinet Memoir ─── */}
      <section className="px-8 max-[1600px]:px-6 max-[1440px]:px-5 max-[1280px]:px-4 lg:px-16 py-20 max-[1600px]:py-16 max-[1440px]:py-14 max-[1280px]:py-12 border-b-[3px] border-[#222]">
        <div className="max-w-5xl mx-auto">
          <p className="font-mono text-[10px] font-bold tracking-widest uppercase mb-2 text-[#666]">{t("home.why.sub")}</p>
          <h2 className="text-4xl lg:text-5xl font-bold mb-14">{t("home.why.title")}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[
              { title: t("home.why.feature1Title"), desc: t("home.why.feature1Desc") },
              { title: t("home.why.feature2Title"), desc: t("home.why.feature2Desc") },
              { title: t("home.why.feature3Title"), desc: t("home.why.feature3Desc") },
              { title: t("home.why.feature4Title"), desc: t("home.why.feature4Desc") },
            ].map((f) => (
              <div key={f.title} className="bg-[#FFF7D6] rounded-[10px] border-[3px] border-[#222] shadow-[4px_4px_0_#222] p-6 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#222] transition-all">
                <h3 className="text-lg font-bold mb-2">{f.title}</h3>
                <p className="text-sm text-[#666] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link href="/studio" className="inline-flex bg-[#222] text-white font-bold text-[10px] tracking-widest uppercase py-3.5 px-6 rounded-[8px] border-[3px] border-[#222] shadow-[3px_3px_0_#222] hover:translate-x-px hover:translate-y-px hover:shadow-[2px_2px_0_#222] transition-all">
              {t("home.why.cta")} →
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section className="px-8 max-[1600px]:px-6 max-[1440px]:px-5 max-[1280px]:px-4 lg:px-16 py-20 max-[1600px]:py-16 max-[1440px]:py-14 max-[1280px]:py-12 border-b-[3px] border-[#222]">
        <div className="max-w-5xl mx-auto">
          <p className="font-mono text-[10px] font-bold tracking-widest uppercase mb-2 text-[#666]">{t("home.pricing.sub")}</p>
          <h2 className="text-4xl lg:text-5xl font-bold mb-4">{t("home.pricing.title")}</h2>
          <p className="text-sm text-[#666] mb-14 max-w-lg">{t("home.pricing.desc")}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {plans.map((p) => (
              <div key={p.nameKey} className={`relative bg-white rounded-[10px] border-[3px] border-[#222] shadow-[4px_4px_0_#222] p-6 flex flex-col ${p.popular ? 'ring-[3px] ring-[#222]' : ''}`}>
                {p.popular && <span className="absolute -top-3 left-1/2 -translate-x-1/2 font-mono text-[8px] font-bold tracking-widest uppercase bg-[#222] text-white px-3 py-1 rounded-md">{t("home.pricing.mostPopular")}</span>}
                <p className="font-mono text-[9px] font-bold tracking-widest uppercase text-[#666] mb-1">{t(p.nameKey)}</p>
                <p className="text-4xl font-bold mb-4">{p.price}</p>
                <ul className="space-y-2 mb-6 flex-1">
                  {[{ label: t("home.pricing.labels.pages"), val: t(p.pagesKey) }, { label: t("home.pricing.labels.paper"), val: t(p.paperKey) }, { label: t("home.pricing.labels.binding"), val: t(p.bindingKey) }, { label: t("home.pricing.labels.cover"), val: t(p.coverKey) }].map((spec) => (
                    <li key={spec.label} className="flex items-center justify-between text-sm">
                      <span className="text-[#999]">{spec.label}</span>
                      <span className="font-medium text-right">{spec.val}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/checkout" className={`w-full font-bold text-[10px] tracking-widest uppercase py-3 text-center rounded-[8px] border-[2px] border-[#222] shadow-[3px_3px_0_#222] hover:translate-x-px hover:translate-y-px hover:shadow-[2px_2px_0_#222] transition-all block ${p.popular ? 'bg-[#222] text-white' : 'bg-white text-[#222]'}`}>
                  {t("home.pricing.choose")} {t(p.nameKey)} →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Quote ─── */}
      <section className="flex flex-col lg:flex-row border-b-[3px] border-[#222]">
        <div className="p-12 max-[1600px]:p-10 max-[1440px]:p-8 max-[1280px]:p-6 lg:p-16 flex flex-col justify-center lg:w-1/2 border-b-[3px] lg:border-b-0 lg:border-r-[3px] border-[#222] bg-[#FFF7D6]">
          <p className="text-xl lg:text-2xl font-bold leading-snug italic mb-6 text-[#444]">&ldquo;{t("home.quote.text")}&rdquo;</p>
          <p className="font-mono text-[10px] font-bold tracking-widest uppercase text-[#999]">{t("home.quote.author")}</p>
        </div>
        <div className="relative overflow-hidden bg-[#e8e6e0] lg:w-1/2 min-h-[300px] lg:min-h-[400px]">
          <img src="https://images.unsplash.com/photo-1473116763249-2faaef81ccda?auto=format&fit=crop&w=2500&q=80" alt={t("home.quote.alt")} className="w-full h-full object-cover absolute inset-0" />
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="px-8 max-[1600px]:px-6 max-[1440px]:px-5 max-[1280px]:px-4 lg:px-16 py-20 max-[1600px]:py-16 max-[1440px]:py-14 max-[1280px]:py-12 bg-[#222]">
        <div className="max-w-2xl mx-auto text-center">
          <p className="font-mono text-[10px] font-bold tracking-widest uppercase mb-2 text-[#999]">{t("home.cta.sub")}</p>
          <h2 className="text-4xl lg:text-5xl font-bold mb-4 text-white">{t("home.cta.title")}</h2>
          <p className="text-sm text-[#999] mb-10 max-w-md mx-auto">{t("home.cta.desc")}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/studio" className="bg-[#FFF7D6] text-[#222] font-bold text-[11px] tracking-widest uppercase py-4 px-8 rounded-[10px] border-[3px] border-[#FFF7D6] shadow-[4px_4px_0_#222] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#222] transition-all">
              {t("home.cta.ctaPrimary")} →
            </Link>
            <Link href="/explore" className="bg-transparent text-white font-bold text-[11px] tracking-widest uppercase py-4 px-8 rounded-[10px] border-[3px] border-white hover:bg-white/10 transition-all">
              {t("home.cta.ctaSecondary")}
            </Link>
          </div>
          <p className="font-mono text-[8px] font-bold tracking-widest uppercase text-[#666] mt-6">{t("home.cta.noCard")}</p>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="bg-[#222] border-t-[3px] border-[#444]">
        <div className="px-8 max-[1600px]:px-6 max-[1440px]:px-5 max-[1280px]:px-4 lg:px-16 py-12 max-[1600px]:py-10 max-[1440px]:py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="col-span-2 md:col-span-1">
              <p className="text-lg font-bold mb-3 text-white">{t("brand")}</p>
              <p className="text-xs text-[#999] leading-relaxed">{t("home.footer.desc")}</p>
            </div>
            <div>
              <p className="font-mono text-[9px] font-bold tracking-widest uppercase mb-3 text-[#777]">{t("home.footer.product")}</p>
              <ul className="space-y-2">
                {[t("home.footer.studio"), t("home.footer.pricing"), t("home.footer.samples"), t("home.footer.shipping")].map((l) => (
                  <li key={l}><Link href="/" className="text-sm text-[#BBB] font-medium hover:text-white transition-colors">{l}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-mono text-[9px] font-bold tracking-widest uppercase mb-3 text-[#777]">{t("home.footer.company")}</p>
              <ul className="space-y-2">
                {[t("home.footer.about"), t("home.footer.blog"), t("home.footer.careers"), t("home.footer.contact")].map((l) => (
                  <li key={l}><Link href="/" className="text-sm text-[#BBB] font-medium hover:text-white transition-colors">{l}</Link></li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        <div className="px-8 max-[1600px]:px-6 max-[1440px]:px-5 max-[1280px]:px-4 lg:px-16 py-5 border-t-[3px] border-[#444] flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
          <p className="font-mono text-[8px] font-bold tracking-widest uppercase text-[#666]">{t("home.footer.copyright", { year: "2024" })}</p>
          <div className="flex gap-4">
            {[t("home.footer.privacy"), t("home.footer.terms"), t("home.footer.returns")].map((l) => (
              <Link key={l} href="/" className="font-mono text-[8px] font-bold tracking-widest uppercase text-[#666] hover:text-white transition-colors">{l}</Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
