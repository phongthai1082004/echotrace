"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { AdminHeader } from "@/components/admin-header";
import { NeoSelect } from "@/components/neo-select";
import { card, label, input, neoBtnPrimary, typeBadge } from "@/lib/styles";
import { apiFetch } from "@/lib/api.fetch";
import { AdminList } from "@/components/admin-list";
import { AdminPagination } from "@/components/admin-pagination";
import { Modal } from "@/components/ui/modal";
import { useCursorList } from "./_hooks/use-cursor-list";

const COLS = [
	"totalOrders",
	"totalRevenue",
	"totalExpense",
	"totalSupplierExpense",
	"cashInflow",
	"cashOutflow",
	"totalProfit",
	"cashOnHand",
	"receivables",
	"payables",
] as const;

const EXPENSE_CATS = ["OPERATING", "PAYROLL", "MARKETING", "DEBT", "OTHER", "SUPPLIER", "DEFECTIVE"] as const;

// ponytail: dùng đúng theme — nút như "+ New Supplier", select/date như neo-input
const addBtnCls = `${neoBtnPrimary} flex items-center gap-1.5 font-mono text-[9px] font-bold tracking-widest uppercase px-4 py-2.5`;

function money(v?: number) {
	return `${(Number(v || 0) || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}₫`;
}
function day(d?: string) {
	return d ? new Date(d).toLocaleDateString() : "—";
}

function DateFilter({ from, to, setFrom, setTo }: {
	from: string; setFrom: (v: string) => void; to: string; setTo: (v: string) => void;
}) {
	const { t } = useTranslation();
	return (
		<div className="flex items-center gap-2">
			<span className={`${label} text-[#666]`}>{t("admin.finance.from")}</span>
			<input type="date" className={`${input} !w-auto`} value={from} onChange={(e) => setFrom(e.target.value)} />
			<span className={`${label} text-[#666]`}>{t("admin.finance.to")}</span>
			<input type="date" className={`${input} !w-auto`} value={to} onChange={(e) => setTo(e.target.value)} />
		</div>
	);
}

function SectionHeader({ title, children }: { title: string; children?: ReactNode }) {
	return (
		<div className="p-4 border-b-[3px] border-[#222] flex items-center justify-between gap-3 flex-wrap">
			<div className="flex items-center gap-2">
				<span className="w-3 h-3 bg-[#FFD93D] border-2 border-[#222] rounded-[3px]" />
				<p className={`${label} font-bold text-[15px]`}>{title}</p>
			</div>
			{children}
		</div>
	);
}

export default function FinancePage() {
	const { t } = useTranslation();
	const token = (useSession().data as { accessToken?: string } | undefined)?.accessToken;
	const [summary, setSummary] = useState<any>(null);

	const [incFrom, setIncFrom] = useState("");
	const [incTo, setIncTo] = useState("");
	const [expFrom, setExpFrom] = useState("");
	const [expTo, setExpTo] = useState("");
	const [expCat, setExpCat] = useState("");
	const [cfFrom, setCfFrom] = useState("");
	const [cfTo, setCfTo] = useState("");
	const [cfType, setCfType] = useState("");

	useEffect(() => {
		if (!token) return;
		apiFetch<any>("/api/admin/financial/summary", token).then(setSummary).catch(() => {});
	}, [token]);

	const incomeFilters = useMemo(() => ({ from: incFrom, to: incTo }), [incFrom, incTo]);
	const expenseFilters = useMemo(() => ({ from: expFrom, to: expTo, category: expCat }), [expFrom, expTo, expCat]);
	const cashflowFilters = useMemo(() => ({ from: cfFrom, to: cfTo, type: cfType }), [cfFrom, cfTo, cfType]);

	const income = useCursorList<any>("/api/admin/financial/income", incomeFilters);
	const expense = useCursorList<any>("/api/admin/financial/expense", expenseFilters);
	const cashflow = useCursorList<any>("/api/admin/financial/cashflow", cashflowFilters);

	const [expOpen, setExpOpen] = useState(false);
	const [amount, setAmount] = useState("");
	const [category, setCategory] = useState<string>("OPERATING");
	const [description, setDescription] = useState("");
	const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
	const [supplierName, setSupplierName] = useState("");
	const [msg, setMsg] = useState<string | null>(null);

	const submitExpense = async () => {
		setMsg(null);
		try {
			await apiFetch("/api/admin/financial/expenses", token, {
				method: "POST",
				body: JSON.stringify({
					amount: Number(amount),
					category,
					description: description || undefined,
					date,
					supplierName: supplierName || undefined,
				}),
			});
			setMsg("ok");
			setAmount("");
			setDescription("");
			setSupplierName("");
			setExpOpen(false);
			expense.reload();
		} catch (e: any) {
			setMsg(e?.message || "error");
		}
	};

	const latest = summary;

	return (
		<div>
			<AdminHeader label={t("admin.finance.label")} title={t("admin.finance.title")} />
			<div className="px-8 max-[1600px]:px-6 max-[1440px]:px-5 max-[1280px]:px-4 py-8 max-[1600px]:py-6 max-[1440px]:py-5 space-y-8">
				<section>
					<p className={`${label} text-[#666]`}>
						{t("admin.finance.overviewTitle")}
						{latest ? ` · ${t("admin.finance.allTime")}` : ""}
					</p>
					<div className="grid grid-cols-5 gap-4 mt-3">
						{COLS.map((c) => (
							<div key={c} className={`p-5 ${card}`}>
								<p className={`${label} text-[#666]`}>{t(`admin.finance.col.${c}`)}</p>
								<p className="text-xl font-bold mt-1">{money(latest?.[c])}</p>
							</div>
						))}
					</div>
				</section>

				{/* INCOME */}
				<section className={`flex flex-col ${card} overflow-hidden`}>
					<SectionHeader title={t("admin.finance.incomeTitle")}>
						<DateFilter from={incFrom} setFrom={setIncFrom} to={incTo} setTo={setIncTo} />
					</SectionHeader>
					<AdminList
						columns={[
							{ key: "date", label: t("admin.finance.date"), width: "1fr" },
							{ key: "amount", label: t("admin.finance.amount"), width: "1fr", align: "center" },
							{ key: "note", label: t("admin.finance.note"), width: "1.4fr" },
						]}
						data={income.items}
						loading={income.loading}
						rowKey={(r) => r.id}
						empty={<p className="py-10 text-center font-bold text-[#999]">{t("admin.finance.noData")}</p>}
						footer={<AdminPagination hasNext={income.nextCursor !== null} hasPrevious={income.hasPrevious} onNext={income.next} onPrevious={income.prev} />}
						renderRow={(r: any) => (
							<>
								<div className="px-2 font-mono text-[9px] font-bold text-[#666] whitespace-nowrap">{day(r.receivedAt)}</div>
								<div className="px-2 text-center font-mono text-sm font-bold">{money(r.amount)}</div>
								<div className="px-2 text-sm text-[#666] truncate">{r.note || r.orderId || "—"}</div>
							</>
						)}
					/>
				</section>

				{/* EXPENSE */}
				<section className={`flex flex-col ${card} overflow-hidden`}>
					<SectionHeader title={t("admin.finance.expenseTitle")}>
						<div className="flex items-center gap-2 flex-wrap">
							<DateFilter from={expFrom} setFrom={setExpFrom} to={expTo} setTo={setExpTo} />
							<NeoSelect
								value={expCat}
								onChange={setExpCat}
								placeholder={t("admin.expenses.category")}
								className="min-w-[160px]"
								options={[
									{ value: "", label: t("admin.expenses.category") },
									...EXPENSE_CATS.map((c) => ({ value: c, label: t(`admin.expenses.categories.${c}`) })),
								]}
							/>
							<button onClick={() => setExpOpen(true)} className={addBtnCls}>
								<Plus size={14} /> {t("admin.expenses.submit")}
							</button>
						</div>
					</SectionHeader>
					<AdminList
						columns={[
							{ key: "date", label: t("admin.finance.date"), width: "1fr" },
							{ key: "amount", label: t("admin.finance.amount"), width: "1fr", align: "center" },
							{ key: "category", label: t("admin.expenses.category"), width: "1fr", align: "center" },
							{ key: "supplier", label: t("admin.suppliers.name"), width: "1fr" },
						]}
						data={expense.items}
						loading={expense.loading}
						rowKey={(r) => r.id}
						empty={<p className="py-10 text-center font-bold text-[#999]">{t("admin.finance.noData")}</p>}
						footer={<AdminPagination hasNext={expense.nextCursor !== null} hasPrevious={expense.hasPrevious} onNext={expense.next} onPrevious={expense.prev} />}
						renderRow={(r: any) => (
							<>
								<div className="px-2 font-mono text-[9px] font-bold text-[#666] whitespace-nowrap">{day(r.date)}</div>
								<div className="px-2 text-center font-mono text-sm font-bold">{money(r.amount)}</div>
								<div className="px-2 flex justify-center">
									<span className={`${"font-mono text-[9px] font-bold tracking-widest uppercase px-2.5 py-1.5 rounded-[6px] border-2 border-[#222] shadow-[2px_2px_0_#222] inline-block whitespace-nowrap"} bg-[#FFF7D6] text-[#222]`}>
										{t(`admin.expenses.categories.${r.category}`)}
									</span>
								</div>
								<div className="px-2 text-sm text-[#666] truncate">{r.supplierName || "—"}</div>
							</>
						)}
					/>
				</section>

				{/* CASHFLOW */}
				<section className={`flex flex-col ${card} overflow-hidden`}>
					<SectionHeader title={t("admin.finance.cashflowTitle")}>
						<div className="flex items-center gap-2 flex-wrap">
							<DateFilter from={cfFrom} setFrom={setCfFrom} to={cfTo} setTo={setCfTo} />
							<NeoSelect
								value={cfType}
								onChange={setCfType}
								placeholder={t("admin.finance.type")}
								className="min-w-[160px]"
								options={[
									{ value: "", label: t("admin.finance.type") },
									{ value: "IN", label: t("admin.finance.in") },
									{ value: "OUT", label: t("admin.finance.out") },
								]}
							/>
						</div>
					</SectionHeader>
					<AdminList
						columns={[
							{ key: "date", label: t("admin.finance.date"), width: "1fr" },
							{ key: "amount", label: t("admin.finance.amount"), width: "1fr", align: "center" },
							{ key: "type", label: t("admin.finance.type"), width: "0.8fr", align: "center" },
							{ key: "note", label: t("admin.finance.note"), width: "1.6fr" },
						]}
						data={cashflow.items}
						loading={cashflow.loading}
						rowKey={(r) => r.id}
						empty={<p className="py-10 text-center font-bold text-[#999]">{t("admin.finance.noData")}</p>}
						footer={<AdminPagination hasNext={cashflow.nextCursor !== null} hasPrevious={cashflow.hasPrevious} onNext={cashflow.next} onPrevious={cashflow.prev} />}
						renderRow={(r: any) => (
							<>
								<div className="px-2 font-mono text-[9px] font-bold text-[#666] whitespace-nowrap">{day(r.date)}</div>
								<div className="px-2 text-center font-mono text-sm font-bold">{money(r.amount)}</div>
								<div className="px-2 flex justify-center">
									<span className={`${typeBadge} ${r.type === "IN" ? "bg-[#1565c0] text-white" : "bg-[#B54843] text-white"}`}>
										{r.type}
									</span>
								</div>
								<div className="px-2 text-sm text-[#666] truncate">{r.note || "—"}</div>
							</>
						)}
					/>
				</section>
			</div>

			<Modal
				open={expOpen}
				onClose={() => setExpOpen(false)}
				title={t("admin.expenses.title")}
				widthClass="w-[420px] max-w-[92vw]"
				cancelLabel={t("common.cancel")}
				actions={[{ label: t("admin.expenses.submit"), onClick: submitExpense, primary: true }]}
			>
				<div className="space-y-4">
					<div>
						<span className="font-mono text-[10px] font-semibold tracking-widest uppercase text-[#666] mb-2 block">{t("admin.expenses.amount")}</span>
						<input type="number" className={`${input} w-full`} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
					</div>
					<div>
						<span className="font-mono text-[10px] font-semibold tracking-widest uppercase text-[#666] mb-2 block">{t("admin.expenses.category")}</span>
						<NeoSelect
							value={category}
							onChange={setCategory}
							placeholder={t("admin.expenses.category")}
							options={EXPENSE_CATS.map((c) => ({ value: c, label: t(`admin.expenses.categories.${c}`) }))}
						/>
					</div>
					<div>
						<span className="font-mono text-[10px] font-semibold tracking-widest uppercase text-[#666] mb-2 block">{t("admin.expenses.description")}</span>
						<input className={`${input} w-full`} value={description} onChange={(e) => setDescription(e.target.value)} />
					</div>
					<div>
						<span className="font-mono text-[10px] font-semibold tracking-widest uppercase text-[#666] mb-2 block">{t("admin.expenses.date")}</span>
						<input type="date" className={`${input} w-full`} value={date} onChange={(e) => setDate(e.target.value)} />
					</div>
					<div>
						<span className="font-mono text-[10px] font-semibold tracking-widest uppercase text-[#666] mb-2 block">{t("admin.expenses.supplierName")}</span>
						<input className={`${input} w-full`} value={supplierName} onChange={(e) => setSupplierName(e.target.value)} />
					</div>
					{msg && (
						<p className={`font-mono text-[10px] font-bold ${msg === "ok" ? "text-[#2D6A2D]" : "text-[#B54843]"}`}>
							{msg === "ok" ? t("admin.expenses.saved") : msg}
						</p>
					)}
				</div>
			</Modal>
		</div>
	);
}
