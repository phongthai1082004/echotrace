"use client";

import { ShoppingBag, DollarSign, Tag, BookOpen } from "lucide-react";
import { useTranslation } from "react-i18next";
import { label, card } from "@/lib/styles";
import { FunnelChart } from "@/components/charts";
import { AdminHeader } from "@/components/admin-header";
import { useMarketingSummary } from "./_hooks/use-marketing-summary";

// ponytail: funnel 5 nấc — 3 nấc đầu từ GA Data API, 2 nấc cuối từ DB.
// Chưa cấu hình GA (gaConfigured=false) thì đầu phễu hiện 0 + dòng chú thích.
const CHANNEL_LABELS: Record<string, string> = {
  facebook: "channelFacebookAds",
  tiktok: "channelTikTokBio",
  google: "channelGoogleOrganic",
  instagram: "channelInstagramReels",
  email: "channelEmailCampaign",
};

export default function MarketingPage() {
  const { t } = useTranslation();
  const summary = useMarketingSummary(30);
  const totals = summary?.totals;
  const rows = summary?.bySource ?? [];

  const kpis = [
    { key: "paidOrders", value: totals ? String(totals.orders) : "…", icon: ShoppingBag },
    {
      key: "totalRevenueMarketing",
      value: totals ? `$${totals.revenue.toLocaleString()}` : "…",
      icon: DollarSign,
    },
    {
      key: "avgOrderValue",
      value: totals ? `$${totals.avgOrderValue.toLocaleString()}` : "…",
      icon: Tag,
    },
    { key: "booksCreated", value: totals ? String(totals.books) : "…", icon: BookOpen },
  ];

  const v = totals?.visitors ?? 0;
  const pct = (n: number) => (v ? Math.round((n / v) * 1000) / 10 : 0);
  const funnel = [
    { step: t("admin.marketing.funnelVisitedSite"), count: v, pct: 100 },
    { step: t("admin.marketing.funnelOpenedDesigner"), count: totals?.opened ?? 0, pct: pct(totals?.opened ?? 0) },
    { step: t("admin.marketing.funnelViewedPreview"), count: totals?.preview ?? 0, pct: pct(totals?.preview ?? 0) },
    { step: t("admin.marketing.funnelClickedCheckout"), count: totals?.checkout ?? 0, pct: pct(totals?.checkout ?? 0) },
    { step: t("admin.marketing.funnelSuccessfulPayment"), count: totals?.orders ?? 0, pct: pct(totals?.orders ?? 0) },
  ];

  return (
    <div>
      <AdminHeader label={t("admin.marketing.label")} title={t("admin.marketing.title")} />
      <div className="px-8 max-[1600px]:px-6 max-[1440px]:px-5 max-[1280px]:px-4 py-8 max-[1600px]:py-6 max-[1440px]:py-5 max-[1280px]:py-4 space-y-8">
        <div className="grid grid-cols-4 gap-5">
          {kpis.map((k) => {
            const Icon = k.icon;
            return (
              <div key={k.key} className={`p-6 ${card}`}>
                <div className="flex items-center gap-2 mb-3">
                  <Icon size={14} className="text-[#666]" />
                  <p className={`${label} text-[#666]`}>{t(`admin.marketing.${k.key}`)}</p>
                </div>
                <p className="text-2xl font-bold">{k.value}</p>
              </div>
            );
          })}
        </div>

        <div className={`p-6 ${card}`}>
          <p className={`${label} mb-6 text-[#666]`}>{t("admin.marketing.conversionFunnel")}</p>
          <FunnelChart data={funnel} />
          <div className="mt-6 pt-4 border-t-[2px] border-[#222]/10 flex items-center gap-6">
            <div>
              <p className="font-mono text-[8px] font-bold tracking-widest uppercase text-[#999]">
                {t("admin.marketing.overallCr")}
              </p>
              <p className="text-lg font-bold mt-0.5">{pct(totals?.orders ?? 0)}%</p>
            </div>
            {summary && !summary.gaConfigured && (
              <p className="font-mono text-[8px] font-bold tracking-widest uppercase text-[#B54843]">
                {t("admin.marketing.gaNotConnected")}
              </p>
            )}
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
                  {[
                    t("admin.marketing.channel"),
                    t("admin.marketing.visitors"),
                    t("admin.marketing.books"),
                    t("admin.marketing.orders"),
                    t("admin.marketing.convRate"),
                    t("admin.marketing.revenue"),
                  ].map((h) => (
                    <th
                      key={h}
                      className={`text-left px-4 max-[1600px]:px-3 max-[1280px]:px-2 py-3 max-[1600px]:py-2.5 ${label} text-[#666] whitespace-nowrap`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-sm font-bold text-[#999]"
                    >
                      …
                    </td>
                  </tr>
                )}
                {rows.map((r) => {
                  const conv = r.visitors ? Math.round((r.orders / r.visitors) * 10000) / 100 : 0;
                  return (
                    <tr key={r.source} className="hover:bg-[#e8e6e0] transition-colors border-b-[2px] border-[#222]/10">
                      <td className="px-4 max-[1600px]:px-3 max-[1280px]:px-2 py-3 max-[1600px]:py-2.5 text-sm font-bold">
                        {CHANNEL_LABELS[r.source] ? t(`admin.marketing.${CHANNEL_LABELS[r.source]}`) : r.source === "unknown" ? t("admin.marketing.unknown") : r.source}
                      </td>
                      <td className="px-4 max-[1600px]:px-3 max-[1280px]:px-2 py-3 max-[1600px]:py-2.5 font-mono text-[10px] font-bold">
                        {r.visitors.toLocaleString()}
                      </td>
                      <td className="px-4 max-[1600px]:px-3 max-[1280px]:px-2 py-3 max-[1600px]:py-2.5 font-mono text-[10px] font-bold">
                        {r.books}
                      </td>
                      <td className="px-4 max-[1600px]:px-3 max-[1280px]:px-2 py-3 max-[1600px]:py-2.5 font-mono text-[10px] font-bold">
                        {r.orders}
                      </td>
                      <td className="px-4 max-[1600px]:px-3 max-[1280px]:px-2 py-3 max-[1600px]:py-2.5">
                        <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#E6F4E6] text-[#2D6A2D] border-2 border-[#2D6A2D]">
                          {conv}%
                        </span>
                      </td>
                      <td className="px-4 max-[1600px]:px-3 max-[1280px]:px-2 py-3 max-[1600px]:py-2.5 font-mono text-[10px] font-bold">
                        ${r.revenue.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
