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
            <rect x={x} y={y} width={barW} height={barH} fill={hovered === i ? "#222" : "#222"} rx={2} style={{ transition: "all 0.1s" }} />
            <text x={x + barW / 2} y={PAD.top + innerH + 16} textAnchor="middle" fontFamily="'DM Mono', monospace" fontSize={9} fontWeight="bold" fill="#999">{d.month}</text>
            {hovered === i && <text x={x + barW / 2} y={y - 6} textAnchor="middle" fontFamily="'DM Mono', monospace" fontSize={9} fontWeight="bold" fill="#222">₫{(d.revenue / 1000000).toFixed(1)}M</text>}
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
      <path d={pathD} fill="none" stroke="#222" strokeWidth={2} />
      {pts.map((p) => (
        <g key={p.d.month} onMouseEnter={() => setHovered(p.i)} onMouseLeave={() => setHovered(null)}>
          <circle cx={p.x} cy={p.y} r={hovered === p.i ? 5 : 3} fill="#222" stroke="#FFF7D6" strokeWidth={2} />
          <text x={p.x} y={PAD.top + innerH + 16} textAnchor="middle" fontFamily="'DM Mono', monospace" fontSize={9} fontWeight="bold" fill="#999">{p.d.month}</text>
          {hovered === p.i && <text x={p.x} y={p.y - 10} textAnchor="middle" fontFamily="'DM Mono', monospace" fontSize={9} fontWeight="bold" fill="#222">{p.d.orders}</text>}
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
    <div className="min-h-screen pt-15">
      <div className="px-8 py-10 border-b-[3px] border-[#222]">
        <p className="font-mono text-[9px] font-bold tracking-widest uppercase mb-1 text-[#666]">Admin — Analytics</p>
        <h1 className="text-4xl font-bold">Revenue Overview</h1>
      </div>

      <div className="px-8 py-10 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div key={kpi.label} className="p-8 bg-[#FFF7D6] rounded-[10px] border-[3px] border-[#222] shadow-[4px_4px_0_#222]">
                <div className="flex items-center gap-2 mb-4">
                  <Icon size={13} className="text-[#666]" />
                  <p className="font-mono text-[10px] font-bold tracking-widest uppercase text-[#666]">{kpi.label}</p>
                </div>
                <p className="text-4xl font-bold">{kpi.value}</p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="p-8 bg-[#FFF7D6] rounded-[10px] border-[3px] border-[#222] shadow-[4px_4px_0_#222]">
            <p className="font-mono text-[9px] font-bold tracking-widest uppercase mb-6 text-[#666]">Monthly Revenue (₫)</p>
            <BarChartSVG data={analyticsData} />
          </div>
          <div className="p-8 bg-[#FFF7D6] rounded-[10px] border-[3px] border-[#222] shadow-[4px_4px_0_#222]">
            <p className="font-mono text-[9px] font-bold tracking-widest uppercase mb-6 text-[#666]">Monthly Orders</p>
            <LineChartSVG data={analyticsData} />
          </div>
        </div>

        <div className="bg-[#FFF7D6] rounded-[10px] border-[3px] border-[#222] shadow-[4px_4px_0_#222] overflow-hidden">
          <div className="px-6 py-4 border-b-[3px] border-[#222]">
            <p className="font-mono text-[9px] font-bold tracking-widest uppercase text-[#666]">Recent Orders</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-[3px] border-[#222]">
                  {["Order ID", "Customer", "Journal", "Pages", "Amount", "Date", "Status"].map((h) => (
                    <th key={h} className="text-left px-6 py-3 font-mono text-[9px] font-bold tracking-widest uppercase text-[#666]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {kanbanOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-[#e8e6e0] transition-colors border-b-[2px] border-[#222]/10">
                    <td className="px-6 py-4 font-mono text-[10px] font-bold text-[#666]">{o.id}</td>
                    <td className="px-6 py-4 text-sm font-bold">{o.customer}</td>
                    <td className="px-6 py-4 text-sm font-bold">{o.journal}</td>
                    <td className="px-6 py-4 font-mono text-[10px] font-bold text-[#666]">{o.pages}</td>
                    <td className="px-6 py-4 font-mono text-[10px] font-bold">{o.amount}</td>
                    <td className="px-6 py-4 font-mono text-[10px] font-bold text-[#999]">{o.date}</td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-1 bg-[#e8e6e0] rounded-[4px] border-[2px] border-[#222]">{o.status}</span>
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
