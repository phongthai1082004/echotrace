"use client";

import { TrendingUp, Package, Users } from "lucide-react";
import { kanbanOrders } from "@/features/order-kanban/data";
import { label, card } from "@/lib/styles";
import { StatusBadge } from "@/components/status-badge";
import { BarChart, LineChart } from "@/components/charts";

const months = ["Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar","Apr","May","Jun","Jul"];
const yearlyRevenue = [28900000, 31200000, 27500000, 34800000, 41200000, 22100000, 19800000, 31200000, 28700000, 34500000, 41200000, 43800000];
const yearlyOrders = [11, 13, 10, 14, 17, 9, 8, 13, 12, 14, 17, 19];
const revenueData = months.map((label, i) => ({ label, value: yearlyRevenue[i] }));
const ordersData = months.map((label, i) => ({ label, value: yearlyOrders[i] }));

export default function AdminAnalyticsPage() {
  const totalRevenue = yearlyRevenue.reduce((s, v) => s + v, 0);
  const totalOrders = yearlyOrders.reduce((s, v) => s + v, 0);
  const avgOrder = Math.round(totalRevenue / totalOrders / 1000);

  const kpis = [
    { label: "Total Revenue YTD", value: `₫${(totalRevenue / 1000000).toFixed(1)}M`, icon: TrendingUp },
    { label: "Total Orders", value: String(totalOrders), icon: Package },
    { label: "Avg. Order Value", value: `₫${avgOrder}K`, icon: Users },
  ];

  return (
    <div>
      <div className="px-8 py-8 border-b-[3px] border-[#222]">
        <p className={`${label} mb-1 text-[#666]`}>Admin — Analytics</p>
        <h1 className="text-3xl font-bold">Revenue Overview</h1>
      </div>

      <div className="px-8 py-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div key={kpi.label} className={`p-6 ${card}`}>
                <div className="flex items-center gap-2 mb-3">
                  <Icon size={14} className="text-[#666]" />
                  <p className={`${label} text-[#666]`}>{kpi.label}</p>
                </div>
                <p className="text-2xl font-bold">{kpi.value}</p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className={`p-6 ${card}`}>
            <p className={`${label} mb-6 text-[#666]`}>Monthly Revenue (₫)</p>
            <BarChart data={revenueData} formatValue={(v) => `₫${(v / 1000000).toFixed(1)}M`} />
          </div>
          <div className={`p-6 ${card}`}>
            <p className={`${label} mb-6 text-[#666]`}>Monthly Orders</p>
            <LineChart data={ordersData} />
          </div>
        </div>

        <div className={`${card} overflow-hidden`}>
          <div className="px-6 py-4 border-b-[3px] border-[#222]">
            <p className={`${label} text-[#666]`}>Recent Orders</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-[3px] border-[#222]">
                  {["Order ID", "Customer", "Journal", "Pages", "Amount", "Date", "Status"].map((h) => (
                    <th key={h} className={`text-left px-4 py-3 ${label} text-[#666] whitespace-nowrap`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {kanbanOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-[#e8e6e0] transition-colors border-b-[2px] border-[#222]/10">
                    <td className="px-4 py-3 font-mono text-[10px] font-bold text-[#666]">{o.id}</td>
                    <td className="px-4 py-3 text-sm font-bold">{o.customer}</td>
                    <td className="px-4 py-3 text-sm font-bold">{o.journal}</td>
                    <td className="px-4 py-3 font-mono text-[10px] font-bold text-[#666]">{o.pages}</td>
                    <td className="px-4 py-3 font-mono text-[10px] font-bold">{o.amount}</td>
                    <td className="px-4 py-3 font-mono text-[10px] font-bold text-[#999]">{o.date}</td>
                    <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
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
