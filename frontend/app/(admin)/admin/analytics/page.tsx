"use client";

import { useState } from "react";
import { TrendingUp, Package, Users } from "lucide-react";
import { kanbanOrders, analyticsData } from "@/features/order-kanban/data";

function BarChartSVG({ data }: { data: typeof analyticsData }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const W = 480, H = 240, PAD = { top: 8, right: 0, bottom: 28, left: 0 };
  const maxVal = Math.max(...data.map((d) => d.revenue));
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const barW = Math.floor(innerW / data.length * 0.45);
  const gap = innerW / data.length;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ overflow: "visible" }}>
      {data.map((d, i) => {
        const barH = Math.round((d.revenue / maxVal) * innerH);
        const x = PAD.left + gap * i + (gap - barW) / 2;
        const y = PAD.top + innerH - barH;
        return (
          <g key={d.month} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
            <rect x={x} y={y} width={barW} height={barH} fill={hovered === i ? "#1a1a1a" : "#0D1F1A"} style={{ transition: "fill 0.1s" }} />
            <text x={x + barW / 2} y={PAD.top + innerH + 16} textAnchor="middle" fontFamily="JetBrains Mono" fontSize={9} fill="rgba(26,26,26,0.4)">{d.month}</text>
            {hovered === i && <text x={x + barW / 2} y={y - 6} textAnchor="middle" fontFamily="JetBrains Mono" fontSize={9} fill="#1a1a1a">₫{(d.revenue / 1000000).toFixed(1)}M</text>}
          </g>
        );
      })}
    </svg>
  );
}

function LineChartSVG({ data }: { data: typeof analyticsData }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const W = 480, H = 240, PAD = { top: 16, right: 8, bottom: 28, left: 8 };
  const maxVal = Math.max(...data.map((d) => d.orders));
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const gap = innerW / (data.length - 1);

  const pts = data.map((d, i) => ({ x: PAD.left + gap * i, y: PAD.top + innerH - (d.orders / maxVal) * innerH, d, i }));
  const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ overflow: "visible" }}>
      <path d={pathD} fill="none" stroke="#0D1F1A" strokeWidth={1} />
      {pts.map((p) => (
        <g key={p.d.month} onMouseEnter={() => setHovered(p.i)} onMouseLeave={() => setHovered(null)}>
          <circle cx={p.x} cy={p.y} r={hovered === p.i ? 5 : 3} fill="#0D1F1A" />
          <text x={p.x} y={PAD.top + innerH + 16} textAnchor="middle" fontFamily="JetBrains Mono" fontSize={9} fill="rgba(26,26,26,0.4)">{p.d.month}</text>
          {hovered === p.i && <text x={p.x} y={p.y - 10} textAnchor="middle" fontFamily="JetBrains Mono" fontSize={9} fill="#1a1a1a">{p.d.orders}</text>}
        </g>
      ))}
    </svg>
  );
}

export default function AdminAnalyticsPage() {
  const totalRevenue = analyticsData.reduce((s, d) => s + d.revenue, 0);
  const totalOrders = analyticsData.reduce((s, d) => s + d.orders, 0);
  const avgOrder = Math.round(totalRevenue / totalOrders / 1000);

  const kpis = [
    { label: "Total Revenue YTD", value: `₫${(totalRevenue / 1000000).toFixed(1)}M`, icon: TrendingUp },
    { label: "Total Orders", value: String(totalOrders), icon: Package },
    { label: "Avg. Order Value", value: `₫${avgOrder}K`, icon: Users },
  ];

  return (
    <div className="min-h-screen bg-[#FDFBF7] pt-15">
      <div className="px-8 py-10" style={{ borderBottom: "0.5px solid #dbdad6" }}>
        <p className="font-['JetBrains_Mono'] text-[9px] tracking-widest uppercase mb-1" style={{ color: "rgba(26,26,26,0.38)" }}>Admin — Analytics</p>
        <h1 className="font-['Playfair_Display'] text-4xl text-[#1a1a1a]">Revenue Overview</h1>
      </div>

      <div className="px-8 py-10 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3" style={{ border: "0.5px solid #dbdad6" }}>
          {kpis.map((kpi, i) => {
            const Icon = kpi.icon;
            return (
              <div key={kpi.label} className="p-8" style={i < 2 ? { borderRight: "0.5px solid #dbdad6" } : {}}>
                <div className="flex items-center gap-2 mb-4">
                  <Icon size={13} style={{ color: "rgba(26,26,26,0.35)" }} />
                  <p className="font-['JetBrains_Mono'] text-[10px] tracking-widest uppercase" style={{ color: "rgba(26,26,26,0.38)" }}>{kpi.label}</p>
                </div>
                <p className="font-['Playfair_Display'] text-4xl text-[#1a1a1a]">{kpi.value}</p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2" style={{ border: "0.5px solid #dbdad6" }}>
          <div className="p-8" style={{ borderRight: "0.5px solid #dbdad6" }}>
            <p className="font-['JetBrains_Mono'] text-[9px] tracking-widest uppercase mb-6" style={{ color: "rgba(26,26,26,0.38)" }}>Monthly Revenue (₫)</p>
            <BarChartSVG data={analyticsData} />
          </div>
          <div className="p-8">
            <p className="font-['JetBrains_Mono'] text-[9px] tracking-widest uppercase mb-6" style={{ color: "rgba(26,26,26,0.38)" }}>Monthly Orders</p>
            <LineChartSVG data={analyticsData} />
          </div>
        </div>

        <div style={{ border: "0.5px solid #dbdad6" }}>
          <div className="px-6 py-4" style={{ borderBottom: "0.5px solid #dbdad6" }}>
            <p className="font-['JetBrains_Mono'] text-[9px] tracking-widest uppercase" style={{ color: "rgba(26,26,26,0.38)" }}>Recent Orders</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "0.5px solid #dbdad6" }}>
                  {["Order ID", "Customer", "Journal", "Pages", "Amount", "Date", "Status"].map((h) => (
                    <th key={h} className="text-left px-6 py-3 font-['JetBrains_Mono'] text-[9px] tracking-widest uppercase" style={{ color: "rgba(26,26,26,0.3)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {kanbanOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-[#f5f3ef] transition-colors" style={{ borderBottom: "0.5px solid #dbdad6" }}>
                    <td className="px-6 py-4 font-['JetBrains_Mono'] text-[10px]" style={{ color: "rgba(26,26,26,0.45)" }}>{o.id}</td>
                    <td className="px-6 py-4 font-['Inter'] text-sm text-[#1a1a1a]">{o.customer}</td>
                    <td className="px-6 py-4 font-['Playfair_Display'] text-sm text-[#1a1a1a]">{o.journal}</td>
                    <td className="px-6 py-4 font-['JetBrains_Mono'] text-[10px]" style={{ color: "rgba(26,26,26,0.45)" }}>{o.pages}</td>
                    <td className="px-6 py-4 font-['JetBrains_Mono'] text-[10px] text-[#1a1a1a]">{o.amount}</td>
                    <td className="px-6 py-4 font-['JetBrains_Mono'] text-[10px]" style={{ color: "rgba(26,26,26,0.38)" }}>{o.date}</td>
                    <td className="px-6 py-4">
                      <span className="font-['JetBrains_Mono'] text-[9px] tracking-widest uppercase px-2 py-1" style={{ border: "0.5px solid #dbdad6", color: "rgba(26,26,26,0.55)" }}>{o.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
