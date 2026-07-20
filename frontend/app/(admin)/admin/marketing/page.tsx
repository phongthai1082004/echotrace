"use client";

import { Users, Percent } from "lucide-react";
import { useTranslation } from "react-i18next";
import { label, card } from "@/lib/styles";
import { FunnelChart } from "@/components/charts";
import { AdminHeader } from "@/components/admin-header";

export default function MarketingPage() {
  const { t } = useTranslation();

  const kpis = [
    { key: "totalVisitors", value: "12,840", change: "+5.2%", icon: Users },
    { key: "conversionRate", value: "3.42%", change: "+0.31pp", icon: Percent },
  ];

  const funnel = [
    { step: t("admin.marketing.funnelVisitedSite"), count: 12840, pct: 100 },
    { step: t("admin.marketing.funnelOpenedDesigner"), count: 6420, pct: 50 },
    { step: t("admin.marketing.funnelViewedPreview"), count: 3852, pct: 30 },
    { step: t("admin.marketing.funnelClickedCheckout"), count: 1798, pct: 14 },
    { step: t("admin.marketing.funnelSuccessfulPayment"), count: 439, pct: 3.42 },
  ];

  const trafficSources = [
    { channel: t("admin.marketing.channelFacebookAds"), visitors: 4120, orders: 158, conv: 3.83, spend: 1200, roas: 4.2 },
    { channel: t("admin.marketing.channelTikTokBio"), visitors: 2840, orders: 92, conv: 3.24, spend: 800, roas: 3.8 },
    { channel: t("admin.marketing.channelGoogleOrganic"), visitors: 3210, orders: 126, conv: 3.93, spend: 0, roas: null },
    { channel: t("admin.marketing.channelInstagramReels"), visitors: 1890, orders: 43, conv: 2.28, spend: 600, roas: 2.5 },
    { channel: t("admin.marketing.channelEmailCampaign"), visitors: 780, orders: 20, conv: 2.56, spend: 200, roas: 3.1 },
  ];

  return (
    <div>
      <AdminHeader label={t("admin.marketing.label")} title={t("admin.marketing.title")} />
      <div className="px-8 max-[1600px]:px-6 max-[1440px]:px-5 max-[1280px]:px-4 py-8 max-[1600px]:py-6 max-[1440px]:py-5 max-[1280px]:py-4 space-y-8">
        <div className="grid grid-cols-4 gap-5">
          {kpis.map(k => {
            const Icon = k.icon;
            return (
              <div key={k.key} className={`p-6 ${card}`}>
                <div className="flex items-center gap-2 mb-3"><Icon size={14} className="text-[#666]" /><p className={`${label} text-[#666]`}>{t(`admin.marketing.${k.key}`)}</p></div>
                <p className="text-2xl font-bold">{k.value}</p>
                <p className="font-mono text-[9px] font-bold mt-1 text-[#2D6A2D]">{k.change}</p>
              </div>
            );
          })}
          <div className={`p-6 ${card} flex flex-col justify-center`}>
            <p className={`${label} mb-2 text-[#666]`}>{t("admin.marketing.avgOrderValue")}</p>
            <p className="text-2xl font-bold">$97.20</p>
            <p className="font-mono text-[9px] font-bold mt-1 text-[#999]">{t("admin.marketing.acrossAllChannels")}</p>
          </div>
          <div className={`p-6 ${card} flex flex-col justify-center`}>
            <p className={`${label} mb-2 text-[#666]`}>{t("admin.marketing.totalRevenueMarketing")}</p>
            <p className="text-2xl font-bold">$42,680</p>
            <p className="font-mono text-[9px] font-bold mt-1 text-[#999]">{t("admin.marketing.attributedThisWeek")}</p>
          </div>
        </div>

        <div className={`p-6 ${card}`}>
          <p className={`${label} mb-6 text-[#666]`}>{t("admin.marketing.conversionFunnel")}</p>
          <FunnelChart data={funnel} />
          <div className="mt-6 pt-4 border-t-[2px] border-[#222]/10 flex items-center gap-6">
            {[
              { label: "dropoffSiteToDesigner", val: "50%" },
              { label: "dropoffPreviewToCheckout", val: "53.3%" },
              { label: "overallCr", val: "3.42%" },
            ].map(d => (
              <div key={d.label}><p className="font-mono text-[8px] font-bold tracking-widest uppercase text-[#999]">{t(`admin.marketing.${d.label}`)}</p><p className="text-lg font-bold mt-0.5">{d.val}</p></div>
            ))}
          </div>
        </div>

        <div className={`${card} overflow-hidden`}>
          <div className="px-6 py-4 border-b-[3px] border-[#222]">
            <p className={`${label} text-[#666]`}>{t("admin.marketing.trafficSources")}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-[3px] border-[#222]">
                  {[t("admin.marketing.channel"), t("admin.marketing.visitors"), t("admin.marketing.orders"), t("admin.marketing.convRate"), t("admin.marketing.adSpend"), t("admin.marketing.roas")].map((h) => (
                    <th key={h} className={`text-left px-4 max-[1600px]:px-3 max-[1280px]:px-2 py-3 max-[1600px]:py-2.5 ${label} text-[#666] whitespace-nowrap`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {trafficSources.map(s => (
                  <tr key={s.channel} className="hover:bg-[#e8e6e0] transition-colors border-b-[2px] border-[#222]/10">
                    <td className="px-4 max-[1600px]:px-3 max-[1280px]:px-2 py-3 max-[1600px]:py-2.5 text-sm font-bold">{s.channel}</td>
                    <td className="px-4 max-[1600px]:px-3 max-[1280px]:px-2 py-3 max-[1600px]:py-2.5 font-mono text-[10px] font-bold">{s.visitors.toLocaleString()}</td>
                    <td className="px-4 max-[1600px]:px-3 max-[1280px]:px-2 py-3 max-[1600px]:py-2.5 font-mono text-[10px] font-bold">{s.orders}</td>
                    <td className="px-4 max-[1600px]:px-3 max-[1280px]:px-2 py-3 max-[1600px]:py-2.5">
                      <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#E6F4E6] text-[#2D6A2D] border-2 border-[#2D6A2D]">{s.conv}%</span>
                    </td>
                    <td className="px-4 max-[1600px]:px-3 max-[1280px]:px-2 py-3 max-[1600px]:py-2.5 font-mono text-[10px] font-bold">{s.spend ? `$${s.spend}` : <span className="text-[#999]">{t("common.dash")}</span>}</td>
                    <td className="px-4 max-[1600px]:px-3 max-[1280px]:px-2 py-3 max-[1600px]:py-2.5 font-mono text-[10px] font-bold">{s.roas ? `${s.roas}x` : <span className="text-[#999]">{t("admin.marketing.organic")}</span>}</td>
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