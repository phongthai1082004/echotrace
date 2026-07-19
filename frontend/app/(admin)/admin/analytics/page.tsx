"use client";

import { TrendingUp, Package, AlertTriangle, DollarSign, ShoppingCart } from "lucide-react";
import { useTranslation } from "react-i18next";
import { label, card } from "@/lib/styles";
import { BarChart, LineChart } from "@/components/charts";
import { AdminHeader } from "@/components/admin-header";

const months = ["Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"];
const yearlyRevenue = [28900000, 31200000, 27500000, 34800000, 41200000, 22100000, 19800000, 31200000, 28700000, 34500000, 41200000, 43800000];
const yearlyOrders = [11, 13, 10, 14, 17, 9, 8, 13, 12, 14, 17, 19];
const revenueData = months.map((label, i) => ({ label, value: yearlyRevenue[i] }));
const ordersData = months.map((label, i) => ({ label, value: yearlyOrders[i] }));

export default function AdminAnalyticsPage() {
  const { t } = useTranslation();
  const totalRevenue = yearlyRevenue.reduce((s, v) => s + v, 0);
  const totalOrders = yearlyOrders.reduce((s, v) => s + v, 0);
  const totalProfit = Math.round(totalRevenue * 0.35);
  const aov = Math.round(totalRevenue / totalOrders);

  const kpis = [
    { label: t("admin.analytics.totalRevenueYtd"), value: `₫${(totalRevenue / 1000000).toFixed(1)}M`, icon: TrendingUp },
    { label: t("admin.analytics.totalOrders"), value: String(totalOrders), icon: Package },
    { label: t("admin.analytics.avgOrderValue"), value: `₫${(aov / 1000).toFixed(0)}K`, icon: ShoppingCart },
    { label: t("admin.analytics.cancellationRate"), value: "3.2%", icon: AlertTriangle },
    { label: t("admin.analytics.totalProfit"), value: `₫${(totalProfit / 1000000).toFixed(1)}M`, icon: DollarSign },
  ];

  return (
    <div>
      <AdminHeader label={t("admin.analytics.label")} title={t("admin.analytics.revenueOverview")} />

      <div className="px-8 max-[1600px]:px-6 max-[1440px]:px-5 max-[1280px]:px-4 py-8 max-[1600px]:py-6 max-[1440px]:py-5 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
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
            <p className={`${label} mb-6 text-[#666]`}>{t("admin.analytics.monthlyRevenue")}</p>
            <BarChart data={revenueData} formatValue={(v) => `₫${(v / 1000000).toFixed(1)}M`} />
          </div>
          <div className={`p-6 ${card}`}>
            <p className={`${label} mb-6 text-[#666]`}>{t("admin.analytics.monthlyOrders")}</p>
            <LineChart data={ordersData} />
          </div>
        </div>
      </div>
    </div>
  );
}
