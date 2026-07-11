"use client";
import { useState } from "react";
import { DollarSign, TrendingUp, Clock, Truck } from "lucide-react";
import { label, card } from "@/lib/styles";
import { StatusBadge } from "@/components/status-badge";
import { DualLineChart } from "@/components/charts";

const kpis = [
  { label: "Cash Inflow (Actual Revenue)", value: "$48,920", change: "+12.3%", icon: DollarSign, color: "#222" },
  { label: "Gross Profit", value: "$18,340", change: "+8.7%", icon: TrendingUp, color: "#222" },
  { label: "Accounts Receivable (COD Hold)", value: "$6,280", change: "4 orders", icon: Clock, color: "#D4A017" },
  { label: "Accounts Payable (Print Partners)", value: "$14,210", change: "8 invoices", icon: Truck, color: "#B54843" },
];

const chartData = [
  { label: "Mon", series1: 8200, series2: 3100 },
  { label: "Tue", series1: 10400, series2: 4200 },
  { label: "Wed", series1: 9100, series2: 3600 },
  { label: "Thu", series1: 12800, series2: 5100 },
  { label: "Fri", series1: 15300, series2: 6400 },
  { label: "Sat", series1: 11200, series2: 4700 },
  { label: "Sun", series1: 9800, series2: 3900 },
];

type TxStatus = "collected" | "hold";

interface Transaction {
  id: string; date: string; customer: string; price: number; printCost: number; shipping: number; profit: number; payment: "Online" | "COD"; status: TxStatus;
}

const txs: Transaction[] = [
  { id: "#ORD-1024", date: "2026-07-10", customer: "Alice Nguyen", price: 89, printCost: 32, shipping: 8, profit: 49, payment: "Online", status: "collected" },
  { id: "#ORD-1023", date: "2026-07-10", customer: "Bob Tran", price: 120, printCost: 40, shipping: 10, profit: 70, payment: "COD", status: "hold" },
  { id: "#ORD-1022", date: "2026-07-09", customer: "Carol Le", price: 65, printCost: 28, shipping: 6, profit: 31, payment: "Online", status: "collected" },
  { id: "#ORD-1021", date: "2026-07-09", customer: "David Pham", price: 150, printCost: 48, shipping: 12, profit: 90, payment: "COD", status: "hold" },
  { id: "#ORD-1020", date: "2026-07-08", customer: "Eve Hoang", price: 95, printCost: 35, shipping: 8, profit: 52, payment: "COD", status: "hold" },
];



export default function FinancePage() {
  const [txList, setTxList] = useState(txs);
  const reconcile = (id: string) => setTxList(prev => prev.map(tx => tx.id === id ? { ...tx, status: "collected" as TxStatus } : tx));

  const total = (field: keyof Transaction) => txList.reduce((s, t) => s + (typeof t[field] === "number" ? t[field] as number : 0), 0);

  return (
    <div>
      <div className="px-8 py-8 border-b-[3px] border-[#222]">
        <p className={`${label} mb-1 text-[#666]`}>Admin — Finance</p>
        <h1 className="text-3xl font-bold">Financial Overview</h1>
      </div>
      <div className="px-8 py-8 space-y-8">
        <div className="grid grid-cols-4 gap-5">
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
            <p className={`${label} text-[#666]`}>Revenue vs Gross Profit (This Week)</p>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 font-mono text-[8px] font-bold tracking-widest uppercase text-[#666]"><span className="w-3 h-[2px] bg-[#222] inline-block" /> Revenue</span>
              <span className="flex items-center gap-1.5 font-mono text-[8px] font-bold tracking-widest uppercase text-[#666]"><span className="w-3 h-[2px] bg-[#5A8F4A] inline-block border-0" style={{ borderTop: "2px dashed #5A8F4A", height: 0 }} /> Gross Profit</span>
            </div>
          </div>
          <DualLineChart data={chartData} formatValue1={(v) => `$${v.toLocaleString()}`} formatValue2={(v) => `$${v.toLocaleString()}`} />
        </div>

        <div className={`${card} overflow-hidden`}>
          <div className="px-6 py-4 border-b-[3px] border-[#222] flex items-center justify-between">
            <p className={`${label} text-[#666]`}>Transactions ({txList.length})</p>
            <p className={`${label} text-[#666]`}>Total Profit: <span className="text-[#2D6A2D]">${total("profit").toLocaleString()}</span></p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-[3px] border-[#222]">
                  {["Order ID", "Date", "Customer", "Price", "Print Cost", "Shipping", "Profit", "Payment", "Status", ""].map(h => (
                    <th key={h} className={`text-left px-4 py-3 ${label} text-[#666] whitespace-nowrap`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {txList.map(tx => (
                  <tr key={tx.id} className="hover:bg-[#e8e6e0] transition-colors border-b-[2px] border-[#222]/10">
                    <td className="px-4 py-3 font-mono text-[10px] font-bold text-[#666]">{tx.id}</td>
                    <td className="px-4 py-3 font-mono text-[10px] font-bold text-[#999]">{tx.date}</td>
                    <td className="px-4 py-3 text-sm font-bold">{tx.customer}</td>
                    <td className="px-4 py-3 font-mono text-[10px] font-bold">${tx.price}</td>
                    <td className="px-4 py-3 font-mono text-[10px] font-bold text-[#B54843]">${tx.printCost}</td>
                    <td className="px-4 py-3 font-mono text-[10px] font-bold">${tx.shipping}</td>
                    <td className="px-4 py-3 font-mono text-[10px] font-bold text-[#2D6A2D]">${tx.profit}</td>
                    <td className="px-4 py-3 font-mono text-[10px] font-bold">{tx.payment}</td>
                    <td className="px-4 py-3"><StatusBadge status={tx.status} /></td>
                    <td className="px-4 py-3">
                      {tx.status === "hold" && (
                        <button onClick={() => reconcile(tx.id)}
                          className="font-mono text-[9px] font-bold tracking-widest uppercase px-2.5 py-1.5 rounded-md border-2 border-[#222] bg-[#222] text-white hover:translate-x-px hover:translate-y-px transition-all whitespace-nowrap">
                          Reconcile
                        </button>
                      )}
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
