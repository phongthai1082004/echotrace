"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";

const travelLogs = [
  { id: "1", title: "Ha Long Bay at Dawn", location: "Quảng Ninh Province, Vietnam", coords: "20.9101° N, 107.1839° E", timestamp: "2024-03-14T05:42:00+07:00", excerpt: "The limestone karsts emerged from the fog like ancient sentinels, their reflections trembling on water the color of oxidized pewter.", image: "https://images.unsplash.com/photo-1775830150436-1cbe3d5ad3c6?w=800&h=1000&fit=crop&auto=format" },
  { id: "2", title: "The Road Through Connemara", location: "County Galway, Ireland", coords: "53.5279° N, 9.8960° W", timestamp: "2024-06-21T17:15:00+01:00", excerpt: "A single road threaded through bog and mountain, the sky a bruised violet pressing down on fields of impossible green.", image: "https://images.unsplash.com/photo-1757679789909-29f58dfd065b?w=1200&h=800&fit=crop&auto=format" },
  { id: "3", title: "Harvest Plain, Hokkaido", location: "Furano, Hokkaido, Japan", coords: "43.3422° N, 142.3832° E", timestamp: "2024-08-09T14:28:00+09:00", excerpt: "Wheat moved in long, synchronized waves — a golden manuscript written by the wind across the valley floor.", image: "https://images.unsplash.com/photo-1533093814449-96af23c8f43f?w=800&h=1100&fit=crop&auto=format" },
  { id: "4", title: "High Atlas Summit", location: "Toubkal, Morocco", coords: "31.0601° N, 7.9150° W", timestamp: "2024-01-31T11:05:00+01:00", excerpt: "Standing above the cloud layer felt less like conquest and more like erasure — identity dissolving into thin air and ancient stone.", image: "https://images.unsplash.com/photo-1765660996991-31f345c40247?w=900&h=1200&fit=crop&auto=format" },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <section className="pt-15 min-h-screen flex flex-col lg:flex-row">
        <div className="relative overflow-hidden bg-[#e8e6e0] lg:w-[60%] min-h-[50vh] lg:min-h-[calc(100vh-60px)]">
          <img src="https://images.unsplash.com/photo-1775830150436-1cbe3d5ad3c6?w=1400&h=1000&fit=crop&auto=format" alt="Ha Long Bay" className="w-full h-full object-cover object-center absolute inset-0" />
          <div className="absolute inset-0 bg-[#1a1a1a]/12" />
          <div className="absolute bottom-0 left-0 right-0 p-8 lg:p-10" style={{ borderTop: "0.5px solid rgba(253,251,247,0.28)" }}>
            <p className="font-['JetBrains_Mono'] text-[9px] text-[#FDFBF7]/65 tracking-widest uppercase mb-1">20.9101° N, 107.1839° E — Ha Long Bay, Vietnam</p>
            <p className="font-['JetBrains_Mono'] text-[9px] text-[#FDFBF7]/40 tracking-widest">2024-03-14T05:42:00+07:00</p>
          </div>
        </div>
        <div className="flex flex-col justify-between p-8 lg:p-12 lg:w-[40%]" style={{ borderLeft: "0.5px solid #dbdad6" }}>
          <div>
            <p className="font-['JetBrains_Mono'] text-[9px] tracking-widest uppercase mb-10" style={{ color: "rgba(26,26,26,0.38)" }}>Vol. IV — 2024</p>
            <h1 className="font-['Playfair_Display'] text-5xl lg:text-6xl leading-[0.93] text-[#1a1a1a] mb-6">Your<br />Journey,<br />Bound<br />in Print.</h1>
            <p className="font-['Inter'] text-sm leading-relaxed max-w-xs" style={{ color: "rgba(26,26,26,0.55)" }}>Design bespoke travel journals with editorial-grade layouts. Every photograph placed with intent. Every coordinate preserved in ink.</p>
          </div>
          <div className="space-y-2.5 mt-12">
            <Link href="/studio" className="w-full bg-[#0D1F1A] text-[#FDFBF7] font-['JetBrains_Mono'] text-[10px] tracking-widest uppercase py-4 px-6 flex items-center justify-between hover:bg-[#1a1a1a] transition-colors group">
              Open Studio <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link href="/checkout" className="w-full font-['JetBrains_Mono'] text-[10px] tracking-widest uppercase py-4 px-6 flex items-center justify-between hover:bg-[#1a1a1a] hover:text-[#FDFBF7] transition-colors" style={{ border: "0.5px solid #dbdad6" }}>
              Order a Journal
            </Link>
          </div>
        </div>
      </section>

      <section className="py-4 px-8 overflow-hidden" style={{ borderTop: "0.5px solid #dbdad6", borderBottom: "0.5px solid #dbdad6" }}>
        <div className="flex gap-14 items-center whitespace-nowrap">
          {["Editorial Typography", "Asymmetric Layouts", "GPS Metadata", "Archival Paper Stock", "Hairline Borders", "Premium Binding", "Handcrafted in Hanoi"].map((t) => (
            <span key={t} className="font-['JetBrains_Mono'] text-[9px] tracking-widest uppercase shrink-0" style={{ color: "rgba(26,26,26,0.35)" }}>— {t}</span>
          ))}
        </div>
      </section>

      <section className="px-8 lg:px-16 py-16">
        <div className="flex items-end justify-between mb-10 pb-5" style={{ borderBottom: "0.5px solid #dbdad6" }}>
          <h2 className="font-['Playfair_Display'] text-4xl lg:text-5xl text-[#1a1a1a]">Field Journals</h2>
          <p className="font-['JetBrains_Mono'] text-[9px] tracking-widest uppercase" style={{ color: "rgba(26,26,26,0.38)" }}>Selected Entries</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4" style={{ borderLeft: "0.5px solid #dbdad6" }}>
          {travelLogs.map((log) => (
            <article key={log.id} className="group cursor-pointer" style={{ borderRight: "0.5px solid #dbdad6" }}>
              <div className="overflow-hidden relative bg-[#e8e6e0] aspect-[3/4]">
                <img src={log.image} alt={log.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
              </div>
              <div className="p-5" style={{ borderTop: "0.5px solid #dbdad6" }}>
                <p className="font-['JetBrains_Mono'] text-[9px] tracking-widest uppercase mb-2" style={{ color: "rgba(26,26,26,0.32)" }}>{log.coords}</p>
                <h3 className="font-['Playfair_Display'] text-lg text-[#1a1a1a] mb-2 leading-tight">{log.title}</h3>
                <p className="font-['Inter'] text-sm leading-relaxed line-clamp-3" style={{ color: "rgba(26,26,26,0.52)" }}>{log.excerpt}</p>
                <p className="font-['JetBrains_Mono'] text-[9px] mt-3" style={{ color: "rgba(26,26,26,0.28)" }}>{log.timestamp.replace("T", " ").slice(0, 16)}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="flex flex-col lg:flex-row" style={{ borderTop: "0.5px solid #dbdad6" }}>
        <div className="p-12 lg:p-20 flex flex-col justify-center lg:w-1/2" style={{ borderRight: "0.5px solid #dbdad6" }}>
          <p className="font-['Playfair_Display'] text-2xl lg:text-[2.4rem] text-[#1a1a1a] leading-tight italic mb-8">&ldquo;Memory is not storage. It is the texture of the paper on which a moment insists on being pressed.&rdquo;</p>
          <p className="font-['JetBrains_Mono'] text-[9px] tracking-widest uppercase" style={{ color: "rgba(26,26,26,0.38)" }}>— Travel Canvas Manifesto, 2024</p>
        </div>
        <div className="relative overflow-hidden bg-[#e8e6e0] lg:w-1/2 min-h-[300px] lg:min-h-[400px]">
          <img src="https://images.unsplash.com/photo-1762810629910-5ad48ad9b181?w=900&h=700&fit=crop&auto=format" alt="Field documentation" className="w-full h-full object-cover absolute inset-0" />
        </div>
      </section>

      <footer className="px-8 py-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-3" style={{ borderTop: "0.5px solid #dbdad6" }}>
        <p className="font-['Playfair_Display'] text-lg text-[#1a1a1a]">Travel Canvas</p>
        <p className="font-['JetBrains_Mono'] text-[9px] tracking-widest uppercase" style={{ color: "rgba(26,26,26,0.28)" }}>© 2024 — All Journals Printed in Hanoi, Vietnam</p>
      </footer>
    </div>
  );
}
