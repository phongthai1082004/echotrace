"use client";
import { useState } from "react";
import { Printer } from "lucide-react";
import { label, card, input } from "@/lib/styles";
import { StatusBadge } from "@/components/status-badge";

interface CostConfig {
  basePrice: string;
  extraPagePrice: string;
}

interface OutsourcingOrder {
  id: string; partner: string; journal: string; pages: number; cost: number; status: "unpaid" | "paid";
}

const initialOutsource: OutsourcingOrder[] = [
  { id: "#EXT-001", partner: "PrintCo Vietnam", journal: "Summer Memories", pages: 48, cost: 28, status: "unpaid" },
  { id: "#EXT-002", partner: "PhotoPress Ltd", journal: "Wedding Album", pages: 64, cost: 36, status: "unpaid" },
  { id: "#EXT-003", partner: "PrintCo Vietnam", journal: "Travel Diary 2026", pages: 32, cost: 22, status: "paid" },
  { id: "#EXT-004", partner: "QuickPrint SG", journal: "Baby Journal", pages: 40, cost: 30, status: "unpaid" },
];

export default function ConfigPage() {
  const [cost, setCost] = useState<CostConfig>({ basePrice: "24.00", extraPagePrice: "0.85" });
  const [saved, setSaved] = useState(false);
  const [outsource, setOutsource] = useState(initialOutsource);

  const saveCost = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const togglePay = (id: string) => {
    setOutsource(prev => prev.map(o => o.id === id ? { ...o, status: o.status === "unpaid" ? "paid" : "unpaid" } : o));
  };

  const unpaidTotal = outsource.filter(o => o.status === "unpaid").reduce((s, o) => s + o.cost, 0);

  return (
    <div>
      <div className="px-8 py-8 border-b-[3px] border-[#222]">
        <p className={`${label} mb-1 text-[#666]`}>Admin — Configuration</p>
        <h1 className="text-3xl font-bold">Settings</h1>
      </div>
      <div className="px-8 py-8 space-y-8">
        <div className={`p-6 ${card}`}>
          <p className={`${label} mb-6 text-[#666]`}>Printing Cost Setup</p>
          <form onSubmit={saveCost} className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
            <div>
              <label className={`${label} block mb-1.5 text-[#666]`}>Base Book Price (first 20 pages)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm font-bold text-[#666]">$</span>
                <input type="number" step="0.01" min="0" value={cost.basePrice}
                  onChange={e => setCost(p => ({ ...p, basePrice: e.target.value }))}
                  className={`${input} pl-7`} />
              </div>
            </div>
            <div>
              <label className={`${label} block mb-1.5 text-[#666]`}>Additional Page Price (per page)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm font-bold text-[#666]">$</span>
                <input type="number" step="0.01" min="0" value={cost.extraPagePrice}
                  onChange={e => setCost(p => ({ ...p, extraPagePrice: e.target.value }))}
                  className={`${input} pl-7`} />
              </div>
            </div>
            <div className="sm:col-span-2 flex items-center gap-4 pt-2">
              <button type="submit" className="bg-[#222] text-white rounded-[10px] border-[3px] border-[#222] shadow-[4px_4px_0_#222] font-mono text-[9px] font-bold tracking-widest uppercase px-6 py-2.5 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#222] transition-all">
                {saved ? "Saved ✓" : "Save Pricing"}
              </button>
              {saved && <span className="font-mono text-[9px] font-bold text-[#2D6A2D]">Pricing updated successfully</span>}
            </div>
          </form>
        </div>

        <div className={`${card} overflow-hidden`}>
          <div className="px-6 py-4 border-b-[3px] border-[#222] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Printer size={14} className="text-[#666]" />
              <p className={`${label} text-[#666]`}>Outsourcing Wallet</p>
            </div>
            <p className={`${label} text-[#B54843]`}>Unpaid: ${unpaidTotal.toFixed(2)}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-[3px] border-[#222]">
                  {["Order ID", "Print Partner", "Journal", "Pages", "Cost", "Status", ""].map(h => (
                    <th key={h} className={`text-left px-4 py-3 ${label} text-[#666] whitespace-nowrap`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {outsource.map(o => (
                  <tr key={o.id} className="hover:bg-[#e8e6e0] transition-colors border-b-[2px] border-[#222]/10">
                    <td className="px-4 py-3 font-mono text-[10px] font-bold text-[#666]">{o.id}</td>
                    <td className="px-4 py-3 text-sm font-bold">{o.partner}</td>
                    <td className="px-4 py-3 text-sm font-bold">{o.journal}</td>
                    <td className="px-4 py-3 font-mono text-[10px] font-bold">{o.pages}pp</td>
                    <td className="px-4 py-3 font-mono text-[10px] font-bold">${o.cost.toFixed(2)}</td>
                    <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                    <td className="px-4 py-3">
                      <button onClick={() => togglePay(o.id)}
                        className={`font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded-md border-2 transition-all whitespace-nowrap ${
                          o.status === "unpaid"
                            ? "bg-[#222] text-white border-[#222] hover:translate-x-px hover:translate-y-px"
                            : "bg-transparent text-[#999] border-[#999] hover:text-[#222] hover:border-[#222]"
                        }`}>
                        {o.status === "unpaid" ? "Confirm Payment to Printer" : "Mark Unpaid"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-3 border-t-[3px] border-[#222] flex items-center justify-between">
            <p className={`${label} text-[#666]`}>{outsource.filter(o => o.status === "paid").length} of {outsource.length} orders paid</p>
            <p className={`${label} text-[#666]`}>Total: ${outsource.reduce((s, o) => s + o.cost, 0).toFixed(2)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
