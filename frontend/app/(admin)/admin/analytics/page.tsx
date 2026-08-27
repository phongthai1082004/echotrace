"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { TrendingUp, Package, ShoppingCart, DollarSign, Wallet } from "lucide-react";
import { useTranslation } from "react-i18next";
import { label, card } from "@/lib/styles";
import { BarChart, LineChart } from "@/components/charts";
import { AdminHeader } from "@/components/admin-header";
import { apiFetch } from "@/lib/api.fetch";

function fmtMoney(v: number) {
	return `${Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}₫`;
}

export default function AdminAnalyticsPage() {
	const { t } = useTranslation();
	const token = (useSession().data as { accessToken?: string } | undefined)?.accessToken;
	const [data, setData] = useState<any>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (!token) return;
		apiFetch<any>("/api/admin/financial/summary", token)
			.then(setData)
			.catch(() => {})
			.finally(() => setLoading(false));
	}, [token]);

	const s = data?.summary ?? {};
	const monthly = data?.monthly ?? [];
	const totalRev = Number(s.totalRevenue) || 0;
	const totalOrders = Number(s.totalOrders) || 0;
	const totalProfit = Number(s.totalProfit) || 0;
	const aov = totalOrders ? Math.round(totalRev / totalOrders) : 0;

	const kpis = [
		{ key: "admin.analytics.totalRevenue", value: fmtMoney(totalRev), icon: TrendingUp },
		{ key: "admin.analytics.totalOrders", value: String(totalOrders), icon: Package },
		{ key: "admin.analytics.avgOrderValue", value: fmtMoney(aov), icon: ShoppingCart },
		{ key: "admin.analytics.totalProfit", value: fmtMoney(totalProfit), icon: DollarSign },
		{ key: "admin.finance.col.cashOnHand", value: fmtMoney(Number(s.cashOnHand) || 0), icon: Wallet },
	];

	const monthAbbr = (t('admin.analytics.months', { returnObjects: true }) as unknown as string[]) ?? [];
	const monthLabel = (period: string) => {
		const n = Number(period.split('-')[1]);
		return monthAbbr[n - 1] ?? String(n);
	};

	const revenueData = monthly.map((p: any) => ({ label: monthLabel(p.period), value: Number(p.revenue) || 0 }));
	const ordersData = monthly.map((p: any) => ({ label: monthLabel(p.period), value: Number(p.orders) || 0 }));

	return (
		<div>
			<AdminHeader label={t("admin.analytics.label")} title={t("admin.analytics.revenueOverview")} />

			<div className="px-8 max-[1600px]:px-6 max-[1440px]:px-5 max-[1280px]:px-4 py-8 max-[1600px]:py-6 max-[1440px]:py-5 space-y-8">
				<div className="grid grid-cols-1 md:grid-cols-5 gap-5">
					{kpis.map((kpi) => {
						const Icon = kpi.icon;
						return (
							<div key={kpi.key} className={`p-6 ${card}`}>
								<div className="flex items-center gap-2 mb-3">
									<Icon size={14} className="text-[#666]" />
									<p className={`${label} text-[#666]`} suppressHydrationWarning>
										{t(kpi.key)}
									</p>
								</div>
								<p className="text-2xl font-bold">{loading ? "…" : kpi.value}</p>
							</div>
						);
					})}
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
					<div className={`p-6 ${card}`}>
						<p className={`${label} mb-6 text-[#666]`} suppressHydrationWarning>
							{t("admin.analytics.monthlyRevenue")}
						</p>
						<BarChart data={revenueData} formatValue={(v) => fmtMoney(v)} />
					</div>
					<div className={`p-6 ${card}`}>
						<p className={`${label} mb-6 text-[#666]`} suppressHydrationWarning>
							{t("admin.analytics.monthlyOrders")}
						</p>
						<LineChart data={ordersData} />
					</div>
				</div>
			</div>
		</div>
	);
}
