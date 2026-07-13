"use client";
import { DollarSign, TrendingUp, Clock, Truck, Wallet } from "lucide-react";
import { label, card } from "@/lib/styles";
import { DualLineChart } from "@/components/charts";
import { AdminHeader } from "@/components/admin-header";

const kpis = [
  { label: "Cash Inflow", value: "$48,920", change: "+12.3%", icon: DollarSign, color: "#222" },
  { label: "Gross Profit", value: "$18,340", change: "+8.7%", icon: TrendingUp, color: "#222" },
  { label: "Cash on Hand", value: "$32,600", change: "+$4,200", icon: Wallet, color: "#222" },
  { label: "Receivables", value: "$6,280", change: "4 orders", icon: Clock, color: "#D4A017" },
  { label: "Payables", value: "$14,210", change: "8 invoices", icon: Truck, color: "#B54843" },
];

const chartData = Array.from({ length: 30 }, (_, i) => ({
  label: `D${i + 1}`,
  series1: Math.round(2800 + Math.sin(i * 1.2) * 1200 + Math.random() * 800 + i * 90),
  series2: Math.round(980 + Math.sin(i * 1.2) * 420 + Math.random() * 280 + i * 32),
}));

export default function FinancePage() {
  return (
    <div>
      <AdminHeader label="Admin — Finance" title="Financial Overview" />
      <div className="px-8 py-8 space-y-8">
        <div className="grid grid-cols-5 gap-5">
          {kpis.map(k => {
            const Icon = k.icon;
            return (
              <div key={k.label} className={`p-6 ${card}`}>
                <div className="flex items-center gap-2 mb-3"><Icon size={14} className={k.color === "#222" ? "text-[#666]" : ""} style={{ color: k.color !== "#222" ? k.color : undefined }} /><p className={`${label} text-[#666]`}>{k.label}</p></div>
                <p className="text-2xl font-bold">{k.value}</p>
                <p className={`font-mono text-[9px] font-bold mt-1 ${k.change.startsWith("+") ? "text-[#2D6A2D]" : "text-[#999]"}`}>{k.change}</p>
              </div>
            );
          })}
        </div>

        <div className={`p-6 ${card}`}>
          <div className="flex items-center justify-between mb-4">
            <p className={`${label} text-[#666]`}>Revenue vs Gross Profit (30 Days)</p>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 font-mono text-[8px] font-bold tracking-widest uppercase text-[#666]"><span className="w-3 h-[2px] bg-[#222] inline-block" /> Revenue</span>
              <span className="flex items-center gap-1.5 font-mono text-[8px] font-bold tracking-widest uppercase text-[#666]"><span className="w-3 h-[2px] bg-[#5A8F4A] inline-block border-0" style={{ borderTop: "2px dashed #5A8F4A", height: 0 }} /> Gross Profit</span>
            </div>
          </div>
          <DualLineChart data={chartData} labelInterval={3} formatValue1={(v) => `$${v.toLocaleString()}`} formatValue2={(v) => `$${v.toLocaleString()}`} />
        </div>
      </div>
    </div>
  );
}
