"use client";

import Link from "next/link";
import { cloudinaryUrl } from "@/lib/cloudinary";

const travelLogs = [
  { id: "1", title: "Ha Long Bay at Dawn", location: "Quảng Ninh, Vietnam", coords: "20.91° N, 107.18° E", image: "https://images.unsplash.com/photo-1775830150436-1cbe3d5ad3c6?w=800&h=1000&fit=crop&auto=format" },
  { id: "2", title: "Road Through Connemara", location: "County Galway, Ireland", coords: "53.53° N, 9.90° W", image: "https://images.unsplash.com/photo-1757679789909-29f58dfd065b?w=1200&h=800&fit=crop&auto=format" },
  { id: "3", title: "Harvest Plain, Hokkaido", location: "Furano, Japan", coords: "43.34° N, 142.38° E", image: "https://images.unsplash.com/photo-1533093814449-96af23c8f43f?w=800&h=1100&fit=crop&auto=format" },
  { id: "4", title: "High Atlas Summit", location: "Toubkal, Morocco", coords: "31.06° N, 7.92° W", image: "https://images.unsplash.com/photo-1765660996991-31f345c40247?w=900&h=1200&fit=crop&auto=format" },
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <section className="pt-15 min-h-screen flex flex-col lg:flex-row">
        <div className="relative overflow-hidden bg-[#e8e6e0] lg:w-[60%] min-h-[50vh] lg:min-h-[calc(100vh-60px)]">
          <img src="https://images.unsplash.com/photo-1775830150436-1cbe3d5ad3c6?w=1400&h=1000&fit=crop&auto=format" alt="Ha Long Bay" className="w-full h-full object-cover object-center absolute inset-0" loading="lazy" />
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-[#222] border-t-[3px] border-[#222]">
            <p className="font-mono text-[10px] font-bold text-white tracking-wider uppercase">20.91° N, 107.18° E — Ha Long Bay, Vietnam</p>
          </div>
        </div>
        <div className="flex flex-col justify-between p-8 max-[1600px]:p-6 max-[1440px]:p-5 lg:p-12 lg:w-[40%] bg-[#FFF7D6] border-l-[3px] border-[#222]">
          <div>
            <p className="font-mono text-[10px] font-bold tracking-widest uppercase mb-8 text-[#666]">Vol. IV — 2024</p>
            <h1 className="text-5xl lg:text-6xl font-bold leading-[0.95] mb-6">Your<br />Journey,<br />Bound<br />in Print.</h1>
            <p className="text-sm leading-relaxed max-w-xs text-[#666]">Design bespoke travel journals with editorial-grade layouts. Every photograph placed with intent.</p>
          </div>
          <div className="space-y-3 mt-12">
            <Link href="/studio" className="w-full bg-[#222] text-white font-bold text-[11px] tracking-widest uppercase py-4 px-6 flex items-center justify-between rounded-[10px] border-[3px] border-[#222] shadow-[4px_4px_0_#222] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#222] transition-all">
              Open Studio →
            </Link>
            <Link href="/checkout" className="w-full bg-[#FFF7D6] text-[#222] font-bold text-[11px] tracking-widest uppercase py-4 px-6 flex items-center justify-between rounded-[10px] border-[3px] border-[#222] shadow-[4px_4px_0_#222] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#222] transition-all">
              Order a Journal
            </Link>
          </div>
        </div>
      </section>

      <section className="py-4 px-8 max-[1600px]:px-6 max-[1440px]:px-5 max-[1280px]:px-4 overflow-hidden border-y-[3px] border-[#222] bg-[#FFF7D6]">
        <div className="flex gap-10 items-center whitespace-nowrap">
          {["Editorial Typography", "Asymmetric Layouts", "GPS Metadata", "Archival Paper", "Hard Shadows", "Premium Binding", "Handcrafted"].map((t) => (
            <span key={t} className="font-mono text-[10px] font-bold tracking-widest uppercase shrink-0 text-[#666]">— {t}</span>
          ))}
        </div>
      </section>

      <section className="px-8 max-[1600px]:px-6 max-[1440px]:px-5 max-[1280px]:px-4 lg:px-16 py-16 max-[1600px]:py-12 max-[1440px]:py-10 max-[1280px]:py-8">
        <div className="flex items-end justify-between mb-10 pb-5 border-b-[3px] border-[#222]">
          <h2 className="text-4xl lg:text-5xl font-bold">Field Journals</h2>
          <p className="font-mono text-[10px] font-bold tracking-widest uppercase text-[#666]">Selected Entries</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {travelLogs.map((log) => (
            <article key={log.id} className="bg-[#FFF7D6] rounded-[10px] border-[3px] border-[#222] shadow-[4px_4px_0_#222] overflow-hidden cursor-pointer hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#222] transition-all">
              <div className="overflow-hidden aspect-[3/4]">
                <img src={cloudinaryUrl(log.image)} alt={log.title} className="w-full h-full object-cover" loading="lazy" />
              </div>
              <div className="p-4 border-t-[3px] border-[#222]">
                <p className="font-mono text-[9px] font-bold tracking-widest uppercase text-[#666] mb-2">{log.coords}</p>
                <h3 className="text-base font-bold mb-1">{log.title}</h3>
                <p className="font-mono text-[9px] text-[#999]">{log.location}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="flex flex-col lg:flex-row border-t-[3px] border-[#222]">
        <div className="p-12 max-[1600px]:p-10 max-[1440px]:p-8 max-[1280px]:p-6 lg:p-16 flex flex-col justify-center lg:w-1/2 border-b-[3px] lg:border-b-0 lg:border-r-[3px] border-[#222]">
          <p className="text-xl lg:text-2xl font-bold leading-snug italic mb-6 text-[#444]">&ldquo;Memory is not storage. It is the texture of the paper on which a moment insists on being pressed.&rdquo;</p>
          <p className="font-mono text-[10px] font-bold tracking-widest uppercase text-[#999]">— Cabinet Memoir Manifesto</p>
        </div>
        <div className="relative overflow-hidden bg-[#e8e6e0] lg:w-1/2 min-h-[300px] lg:min-h-[400px]">
          <img src="https://images.unsplash.com/photo-1762810629910-5ad48ad9b181?w=900&h=700&fit=crop&auto=format" alt="Field documentation" className="w-full h-full object-cover absolute inset-0" />
        </div>
      </section>

      <footer className="px-8 max-[1600px]:px-6 max-[1440px]:px-5 max-[1280px]:px-4 py-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-t-[3px] border-[#222] bg-[#FFF7D6]">
        <p className="text-lg font-bold">Cabinet Memoir</p>
        <p className="font-mono text-[9px] font-bold tracking-widest uppercase text-[#999]">© 2024 — Printed in Hanoi, Vietnam</p>
      </footer>
    </div>
  );
}
