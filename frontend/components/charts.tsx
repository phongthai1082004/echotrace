"use client";

import { useState, useEffect } from "react";

interface BarChartProps {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
  formatValue?: (v: number) => string;
}

export function BarChart({ data, height = 260, color = "#222", formatValue }: BarChartProps) {
  const W = 480, H = height, PAD = { top: 28, right: 0, bottom: 28, left: 0 };
  const maxVal = Math.max(...data.map((d) => d.value));
  const iw = W - PAD.left - PAD.right;
  const ih = H - PAD.top - PAD.bottom;
  const barW = Math.floor(iw / data.length * 0.45);
  const gap = iw / data.length;
  const fmt = formatValue ?? ((v: number) => v.toLocaleString());

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="overflow-visible">
      <defs>
        <style>{`
          @keyframes barReveal { from { clip-path: inset(100% 0 0 0); } to { clip-path: inset(0 0 0 0); } }
          @keyframes fadeUp { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        `}</style>
      </defs>
      {data.map((d, i) => {
        const barH = Math.round((d.value / maxVal) * ih);
        const x = PAD.left + gap * i + (gap - barW) / 2;
        const y = PAD.top + ih - barH;
        const delay = i * 0.04;
        return (
          <g key={d.label}>
            <rect x={x} y={y} width={barW} height={barH} fill={color} rx={2}
              style={{ animation: `barReveal 0.6s ease-out ${delay}s both` }} />
            <text x={x + barW / 2} y={y - 6} textAnchor="middle" fontFamily="'DM Mono', monospace" fontSize={8} fontWeight="bold" fill={color}
              style={{ opacity: 0, animation: `fadeUp 0.3s ease-out ${0.6 + delay}s forwards` }}>{fmt(d.value)}</text>
            <text x={x + barW / 2} y={PAD.top + ih + 16} textAnchor="middle" fontFamily="'DM Mono', monospace" fontSize={9} fontWeight="bold" fill="#999"
              style={{ opacity: 0, animation: `fadeUp 0.3s ease-out ${0.6 + delay}s forwards` }}>{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

interface LineChartProps {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
  formatValue?: (v: number) => string;
}

export function LineChart({ data, height = 260, color = "#222", formatValue }: LineChartProps) {
  const W = 480, H = height, PAD = { top: 28, right: 8, bottom: 28, left: 8 };
  const maxVal = Math.max(...data.map((d) => d.value));
  const iw = W - PAD.left - PAD.right;
  const ih = H - PAD.top - PAD.bottom;
  const gap = iw / (data.length - 1);
  const fmt = formatValue ?? ((v: number) => v.toLocaleString());

  const pts = data.map((d, i) => ({ x: PAD.left + gap * i, y: PAD.top + ih - (d.value / maxVal) * ih, d, i }));
  const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="overflow-visible">
      <defs>
        <style>{`
          @keyframes drawLine { from { stroke-dashoffset: 2000; } to { stroke-dashoffset: 0; } }
          @keyframes fadeUp { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        `}</style>
      </defs>
      <path d={pathD} fill="none" stroke={color} strokeWidth={2} strokeDasharray="2000" strokeDashoffset="2000"
        style={{ animation: "drawLine 1s ease-out forwards" }} />
      {pts.map((p, i) => (
        <g key={p.d.label}>
          <circle cx={p.x} cy={p.y} r={3} fill={color} stroke="#FFF7D6" strokeWidth={2}
            style={{ opacity: 0, animation: `fadeUp 0.3s ease-out ${1 + i * 0.04}s forwards` }} />
          <text x={p.x} y={p.y - 10} textAnchor="middle" fontFamily="'DM Mono', monospace" fontSize={9} fontWeight="bold" fill={color}
            style={{ opacity: 0, animation: `fadeUp 0.3s ease-out ${1 + i * 0.04}s forwards` }}>{fmt(p.d.value)}</text>
          <text x={p.x} y={PAD.top + ih + 16} textAnchor="middle" fontFamily="'DM Mono', monospace" fontSize={9} fontWeight="bold" fill="#999"
            style={{ opacity: 0, animation: `fadeUp 0.3s ease-out ${1 + i * 0.04}s forwards` }}>{p.d.label}</text>
        </g>
      ))}
    </svg>
  );
}

interface DualLineChartProps {
  data: { label: string; series1: number; series2: number }[];
  color1?: string;
  color2?: string;
  height?: number;
  formatValue1?: (v: number) => string;
  formatValue2?: (v: number) => string;
}

export function DualLineChart({ data, color1 = "#222", color2 = "#5A8F4A", height = 260, formatValue1, formatValue2 }: DualLineChartProps) {
  const W = 600, H = height, pad = { top: 32, right: 16, bottom: 28, left: 16 };
  const maxVal = Math.max(...data.map((d) => Math.max(d.series1, d.series2))) * 1.3;
  const iw = W - pad.left - pad.right, ih = H - pad.top - pad.bottom;
  const gap = iw / (data.length - 1);
  const fmt1 = formatValue1 ?? ((v: number) => `$${v.toLocaleString()}`);
  const fmt2 = formatValue2 ?? ((v: number) => `$${v.toLocaleString()}`);

  const toPts = (field: "series1" | "series2") => data.map((d, i) => ({
    x: pad.left + gap * i, y: pad.top + ih - (d[field] / maxVal) * ih, d, i
  }));
  const toPath = (pts: { x: number; y: number }[]) => pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const pts1 = toPts("series1"), pts2 = toPts("series2");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="overflow-visible">
      <defs>
        <style>{`
          @keyframes drawLine { from { stroke-dashoffset: 2000; } to { stroke-dashoffset: 0; } }
          @keyframes fadeUp { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        `}</style>
      </defs>
      {[0.25, 0.5, 0.75].map(r => (
        <line key={r} x1={pad.left} x2={W - pad.right} y1={pad.top + ih * (1 - r)} y2={pad.top + ih * (1 - r)} stroke="#e8e6e0" strokeWidth={1} />
      ))}
      <path d={toPath(pts1)} fill="none" stroke={color1} strokeWidth={2.5} strokeLinejoin="round" strokeDasharray="2000" strokeDashoffset="2000"
        style={{ animation: "drawLine 1s ease-out forwards" }} />
      <path d={toPath(pts2)} fill="none" stroke={color2} strokeWidth={2.5} strokeLinejoin="round" strokeDasharray="2000" strokeDashoffset="2000"
        style={{ animation: "drawLine 1.2s ease-out 0.2s forwards" }} />
      {pts1.map((p, i) => (
        <g key={`s1${i}`}>
          <circle cx={p.x} cy={p.y} r={3} fill={color1} stroke="#FFF7D6" strokeWidth={2}
            style={{ opacity: 0, animation: `fadeUp 0.3s ease-out ${1 + i * 0.04}s forwards` }} />
          <text x={p.x} y={p.y - 12} textAnchor="middle" fontFamily="'DM Mono',monospace" fontSize={9} fontWeight="bold" fill={color1}
            style={{ opacity: 0, animation: `fadeUp 0.3s ease-out ${1 + i * 0.04}s forwards` }}>{fmt1(p.d.series1)}</text>
          <text x={p.x} y={H - 4} textAnchor="middle" fontFamily="'DM Mono',monospace" fontSize={9} fontWeight="bold" fill="#999"
            style={{ opacity: 0, animation: `fadeUp 0.3s ease-out ${1 + i * 0.04}s forwards` }}>{p.d.label}</text>
        </g>
      ))}
      {pts2.map((p, i) => (
        <g key={`s2${i}`}>
          <circle cx={p.x} cy={p.y} r={2.5} fill={color2} stroke="#FFF7D6" strokeWidth={2}
            style={{ opacity: 0, animation: `fadeUp 0.3s ease-out ${1.2 + i * 0.04}s forwards` }} />
          <text x={p.x} y={p.y + 16} textAnchor="middle" fontFamily="'DM Mono',monospace" fontSize={8} fontWeight="bold" fill={color2}
            style={{ opacity: 0, animation: `fadeUp 0.3s ease-out ${1.2 + i * 0.04}s forwards` }}>{fmt2(p.d.series2)}</text>
        </g>
      ))}
    </svg>
  );
}

interface FunnelChartProps {
  data: { step: string; count: number; pct: number }[];
}

export function FunnelChart({ data }: FunnelChartProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 50); return () => clearTimeout(t); }, []);

  return (
    <div className="space-y-3">
      {data.map((f, i) => {
        const isHovered = hovered === i;
        return (
          <div key={f.step} className="flex items-center gap-4"
            onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
            <div className="w-36 shrink-0 text-left">
              <p className={`font-mono text-[9px] font-bold tracking-widest ${isHovered ? "text-[#222]" : "text-[#666]"}`}>{f.step}</p>
            </div>
            <div className="flex-1 h-9">
              <div className="h-full rounded-r-lg border-2 border-[#222] bg-[#222] transition-all duration-700 ease-out"
                style={{ width: mounted ? `${f.pct}%` : "0%" }} />
            </div>
            <div className="w-28 shrink-0" style={{ opacity: mounted ? 1 : 0, transition: "opacity 0.3s ease-out 0.6s" }}>
              <p className={`font-mono text-[10px] font-bold ${isHovered ? "text-[#222]" : "text-[#666]"}`}>{f.count.toLocaleString()}</p>
              <p className={`font-mono text-[8px] font-bold ${isHovered ? "text-[#666]" : "text-[#999]"}`}>{f.pct}%</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
