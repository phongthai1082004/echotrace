"use client";
import { Users, Percent } from "lucide-react";
import { label, card } from "@/lib/styles";
import { FunnelChart } from "@/components/charts";

const kpis = [
  { label: "Total Visitors (This Week)", value: "12,840", change: "+5.2%", icon: Users },
  { label: "Overall Conversion Rate", value: "3.42%", change: "+0.31pp", icon: Percent },
];

const funnel = [
  { step: "Visited Site", count: 12840, pct: 100 },
  { step: "Opened Designer App", count: 6420, pct: 50 },
  { step: "Viewed Book Preview", count: 3852, pct: 30 },
  { step: "Clicked Checkout", count: 1798, pct: 14 },
  { step: "Successful Payment", count: 439, pct: 3.42 },
];

const trafficSources = [
  { channel: "Facebook Ads", visitors: 4120, orders: 158, conv: 3.83, spend: 1200, roas: 4.2 },
  { channel: "TikTok Bio", visitors: 2840, orders: 92, conv: 3.24, spend: 800, roas: 3.8 },
  { channel: "Google Search (Organic)", visitors: 3210, orders: 126, conv: 3.93, spend: 0, roas: null },
  { channel: "Instagram Reels", visitors: 1890, orders: 43, conv: 2.28, spend: 600, roas: 2.5 },
  { channel: "Email Campaign", visitors: 780, orders: 20, conv: 2.56, spend: 200, roas: 3.1 },
];

export default function MarketingPage() {
  return (
    <div>
      <div className="px-8 py-8 border-b-[3px] border-[#222]">
        <p className={`${label} mb-1 text-[#666]`}>Admin — Marketing</p>
        <h1 className="text-3xl font-bold">Traffic & Conversion Analytics</h1>
      </div>
      <div className="px-8 py-8 space-y-8">
        <div className="grid grid-cols-4 gap-5">
          {kpis.map(k => {
            const Icon = k.icon;
            return (
              <div key={k.label} className={`p-6 ${card}`}>
                <div className="flex items-center gap-2 mb-3"><Icon size={14} className="text-[#666]" /><p className={`${label} text-[#666]`}>{k.label}</p></div>
                <p className="text-2xl font-bold">{k.value}</p>
                <p className="font-mono text-[9px] font-bold mt-1 text-[#2D6A2D]">{k.change}</p>
              </div>
            );
          })}
          <div className={`p-6 ${card} flex flex-col justify-center`}>
            <p className={`${label} mb-2 text-[#666]`}>Avg. Order Value</p>
            <p className="text-2xl font-bold">$97.20</p>
            <p className="font-mono text-[9px] font-bold mt-1 text-[#999]">Across all channels</p>
          </div>
          <div className={`p-6 ${card} flex flex-col justify-center`}>
            <p className={`${label} mb-2 text-[#666]`}>Total Revenue (Marketing)</p>
            <p className="text-2xl font-bold">$42,680</p>
            <p className="font-mono text-[9px] font-bold mt-1 text-[#999]">Attributed this week</p>
          </div>
        </div>

        <div className={`p-6 ${card}`}>
          <p className={`${label} mb-6 text-[#666]`}>Conversion Funnel</p>
          <FunnelChart data={funnel} />
          <div className="mt-6 pt-4 border-t-[2px] border-[#222]/10 flex items-center gap-6">
            {[
              { label: "Drop-off (Site → Designer)", val: "50%" },
              { label: "Drop-off (Preview → Checkout)", val: "53.3%" },
              { label: "Overall CR", val: "3.42%" },
            ].map(d => (
              <div key={d.label}><p className="font-mono text-[8px] font-bold tracking-widest uppercase text-[#999]">{d.label}</p><p className="text-lg font-bold mt-0.5">{d.val}</p></div>
            ))}
          </div>
        </div>

        <div className={`${card} overflow-hidden`}>
          <div className="px-6 py-4 border-b-[3px] border-[#222]">
            <p className={`${label} text-[#666]`}>Traffic Sources (UTM)</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-[3px] border-[#222]">
                  {["Channel", "Visitors", "Orders", "Conv. Rate", "Ad Spend", "ROAS"].map(h => (
                    <th key={h} className={`text-left px-4 py-3 ${label} text-[#666] whitespace-nowrap`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {trafficSources.map(s => (
                  <tr key={s.channel} className="hover:bg-[#e8e6e0] transition-colors border-b-[2px] border-[#222]/10">
                    <td className="px-4 py-3 text-sm font-bold">{s.channel}</td>
                    <td className="px-4 py-3 font-mono text-[10px] font-bold">{s.visitors.toLocaleString()}</td>
                    <td className="px-4 py-3 font-mono text-[10px] font-bold">{s.orders}</td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#E6F4E6] text-[#2D6A2D] border-2 border-[#2D6A2D]">{s.conv}%</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[10px] font-bold">{s.spend ? `$${s.spend}` : <span className="text-[#999]">—</span>}</td>
                    <td className="px-4 py-3 font-mono text-[10px] font-bold">{s.roas ? `${s.roas}x` : <span className="text-[#999]">Organic</span>}</td>
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
