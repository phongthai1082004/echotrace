"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Eye, Pencil, ChevronDown, X } from "lucide-react";
import { SampleBookDTO } from "@echotrace/shared";
import { label, card, neoBtn, neoBtnPrimary, input } from "@/lib/styles";
import { AdminHeader } from "@/components/admin-header";
import { AdminSearch } from "@/components/admin-search";
import { AdminPagination } from "@/components/admin-pagination";
import { ResponsiveTable } from "@/components/responsive-table";
import { TableSkeletonRow } from "@/components/ui/loading-skeleton";
import { EmptyStateMinimal } from "@/components/ui/empty-state";
import { useToast } from "@/components/toast";
import { apiFetch } from "@/lib/api.fetch";

const colWidths = ["2fr", "0.7fr", "0.9fr", "0.5fr", "0.5fr", "0.9fr", "104px"];
const gridCols = colWidths.join(" ");

const TYPE_OPTIONS = ["TEMPLATE", "ALBUM"];
const CATEGORY_OPTIONS = ["NATURE", "URBAN", "CLASSIC", "MINIMAL", "ADVENTURE", "CULTURAL", "CUSTOM"];
const STATUS_OPTIONS = ["draft", "published", "archive"];

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-[#e8e6e0] text-[#666]",
  published: "bg-[#1565c0] text-white",
  archive: "bg-[#FFD93D] text-[#222]",
};

type ListResponse = { items: SampleBookDTO[]; nextCursor: number | null };

export default function AdminSampleBooksPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { data: session } = useSession();
  const accessToken = (session as any)?.accessToken;

  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [items, setItems] = useState<SampleBookDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<number | null>(null);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [cursorStack, setCursorStack] = useState<number[]>([]);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [statusBusyId, setStatusBusyId] = useState<number | null>(null);

  const queryUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (type) params.set("type", type);
    if (category) params.set("category", category);
    if (status) params.set("status", status);
    if (search) params.set("search", search);
    if (cursor) params.set("cursor", String(cursor));
    return `/api/admin/sample-books?${params.toString()}`;
  }, [type, category, status, search, cursor]);

  useEffect(() => {
    if (!accessToken) return;
    setLoading(true);
    setFetchError(null);
    apiFetch<ListResponse>(queryUrl, accessToken)
      .then((d) => {
        setItems(d?.items || []);
        setNextCursor(d?.nextCursor ?? null);
      })
      .catch((err) => {
        console.warn("[admin sample-books] fetch failed:", err);
        setFetchError(String(err));
      })
      .finally(() => setLoading(false));
  }, [accessToken, queryUrl]);

  // reset pagination whenever a filter/search changes
  useEffect(() => {
    setCursor(null);
    setCursorStack([]);
  }, [type, category, status, search]);

  const updateStatus = async (s: SampleBookDTO, next: string) => {
    if (!accessToken || next === s.status) return;
    setStatusBusyId(s.id);
    setOpenMenuId(null);
    try {
      await apiFetch(`/api/admin/sample-books/${s.id}/status`, accessToken, {
        method: "PATCH",
        body: JSON.stringify({ status: next }),
      });
      setItems((prev) => prev.map((b) => (b.id === s.id ? { ...b, status: next } : b)));
      showToast(t("admin.sampleBooks.statusUpdated"), "success");
    } catch {
      showToast(t("admin.sampleBooks.statusUpdateFailed"), "error");
    } finally {
      setStatusBusyId(null);
    }
  };

  const handleNext = () => {
    if (!nextCursor) return;
    setCursorStack((prev) => (cursor ? [...prev, cursor] : prev));
    setCursor(nextCursor);
  };

  const handlePrevious = () => {
    const stack = [...cursorStack];
    const prevCursor = stack.pop() ?? null;
    setCursor(prevCursor);
    setCursorStack(stack);
  };

  const studioHref = (s: SampleBookDTO) =>
    s.paperWidth && s.paperHeight
      ? `/admin/studio?id=${s.id}&w=${s.paperWidth * 4}&h=${s.paperHeight * 4}`
      : `/admin/studio?id=${s.id}`;

  return (
    <div className="h-screen flex flex-col">
      <AdminHeader label={t("admin.sampleBooks.label")} title={t("admin.sampleBooks.title")}>
        <AdminSearch value={search} onChange={setSearch} placeholder={t("admin.sampleBooks.searchPlaceholder")} />
      </AdminHeader>

      <div className="flex-1 flex flex-col px-8 max-[1600px]:px-6 max-[1440px]:px-5 max-[1280px]:px-4 py-6 max-[1600px]:py-5 max-[1440px]:py-4 max-[1280px]:py-3 gap-4 min-h-0 overflow-hidden">
        <div className={`${card} p-3 shrink-0 flex flex-wrap gap-2`}>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className={`${input} font-mono text-[9px] font-bold tracking-widest uppercase px-3 py-2 pr-8 cursor-pointer appearance-none`}
          >
            <option value="">{t("admin.sampleBooks.allTypes")}</option>
            {TYPE_OPTIONS.map((v) => (
              <option key={v} value={v}>
                {t(`admin.sampleBooks.${v === "ALBUM" ? "kindAlbum" : "kindTemplate"}`)}
              </option>
            ))}
          </select>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={`${input} font-mono text-[9px] font-bold tracking-widest uppercase px-3 py-2 pr-8 cursor-pointer appearance-none`}
          >
            <option value="">{t("admin.sampleBooks.allCategories")}</option>
            {CATEGORY_OPTIONS.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={`${input} font-mono text-[9px] font-bold tracking-widest uppercase px-3 py-2 pr-8 cursor-pointer appearance-none`}
          >
            <option value="">{t("admin.sampleBooks.allStatuses")}</option>
            {STATUS_OPTIONS.map((v) => (
              <option key={v} value={v}>
                {t(`admin.sampleBooks.${v}`)}
              </option>
            ))}
          </select>
          {(type || category || status || search) && (
            <button
              onClick={() => {
                setType("");
                setCategory("");
                setStatus("");
                setSearch("");
              }}
              className={`${neoBtn} flex items-center gap-1 font-mono text-[9px] font-bold tracking-widest uppercase px-3 py-1.5`}
            >
              <X size={11} /> {t("common.clear")}
            </button>
          )}
        </div>

        <div className={`${card} flex-1 flex flex-col min-h-0`}>
          {loading ? (
            <div className="shrink-0 border-b-[3px] border-[#222]">
              {Array.from({ length: 8 }).map((_, i) => (
                <TableSkeletonRow key={i} columns={colWidths.length} animated />
              ))}
            </div>
          ) : (
            <>
              <ResponsiveTable
                header={
                  <div className="grid shrink-0 border-b-[3px] border-[#222]" style={{ gridTemplateColumns: gridCols }}>
                    {[
                      t("admin.sampleBooks.name"),
                      t("admin.sampleBooks.type"),
                      t("admin.sampleBooks.category"),
                      t("admin.sampleBooks.quantity"),
                      t("admin.sampleBooks.pages"),
                      t("admin.sampleBooks.status"),
                      t("common.action"),
                    ].map((h) => (
                      <div key={h} className={`px-2 py-3 ${label} text-[#666] whitespace-nowrap`}>
                        {h}
                      </div>
                    ))}
                  </div>
                }
                gridCols={gridCols}
              >
                {fetchError ? (
                  <EmptyStateMinimal title={t("admin.sampleBooks.fetchFailed")} />
                ) : items.length === 0 ? (
                  <EmptyStateMinimal title={t("admin.sampleBooks.noItems")} />
                ) : (
                  items.map((s) => (
                    <div
                      key={s.id}
                      className="grid hover:bg-[#e8e6e0] transition-colors border-b-[2px] border-[#222]/10 items-center py-3"
                      style={{ gridTemplateColumns: gridCols }}
                    >
                      <div className="px-2 text-sm font-bold whitespace-nowrap min-w-0 truncate">
                        {s.name || "Untitled"}
                      </div>
                      <div className="px-2 font-mono text-[9px] font-bold tracking-widest uppercase text-[#666] whitespace-nowrap">
                        {t(`admin.sampleBooks.${s.type === "ALBUM" ? "kindAlbum" : "kindTemplate"}`)}
                      </div>
                      <div className="px-2 font-mono text-[9px] font-bold tracking-widest uppercase text-[#666] whitespace-nowrap">
                        {s.category ?? "—"}
                      </div>
                      <div className="px-2 font-mono text-[9px] font-bold text-[#666] whitespace-nowrap">
                        {s.quantity ?? "—"}
                      </div>
                      <div className="px-2 font-mono text-[9px] font-bold text-[#666] whitespace-nowrap">
                        {s.pageCount} {t("admin.sampleBooks.pg")}
                      </div>
                      <div className="px-2">
                        <div className="relative inline-block">
                          <button
                            onClick={() => setOpenMenuId(openMenuId === s.id ? null : s.id)}
                            disabled={statusBusyId === s.id}
                            className={`flex items-center gap-1 font-mono text-[9px] font-bold tracking-widest uppercase leading-none px-2.5 py-1.5 rounded-[6px] border-2 border-[#222] shadow-[2px_2px_0_#222] cursor-pointer disabled:opacity-40 ${STATUS_STYLE[s.status] ?? STATUS_STYLE.draft}`}
                          >
                            {t(`admin.sampleBooks.${s.status}`)}
                            <ChevronDown size={11} />
                          </button>
                          {openMenuId === s.id && (
                            <>
                              <div className="fixed inset-0 z-30" onClick={() => setOpenMenuId(null)} />
                              <div className="absolute top-full left-0 mt-1 z-40 bg-[#F8F2E5] rounded-lg border-2 border-[#222] shadow-[3px_3px_0_#222] overflow-hidden min-w-[120px]">
                                {STATUS_OPTIONS.map((st) => (
                                  <button
                                    key={st}
                                    onClick={() => updateStatus(s, st)}
                                    className={`w-full flex items-center gap-2 px-3 py-2 font-mono text-[9px] font-bold tracking-widest uppercase hover:bg-[#e8e6e0] transition-colors ${st === s.status ? "opacity-40" : ""}`}
                                  >
                                    <span
                                      className={`w-2.5 h-2.5 rounded-[3px] border border-[#222] ${STATUS_STYLE[st].split(" ")[0]}`}
                                    />
                                    {t(`admin.sampleBooks.${st}`)}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="px-2 flex items-center gap-1.5">
                        <button
                          disabled
                          title={t("admin.sampleBooks.preview")}
                          className="p-1.5 opacity-30 cursor-not-allowed"
                        >
                          <Eye size={14} />
                        </button>
                        <Link
                          href={studioHref(s)}
                          title={t("admin.sampleBooks.edit")}
                          className="p-1.5 hover:bg-[#FFF7D6] rounded-[6px] border-2 border-transparent hover:border-[#222] transition-all text-[#222]"
                        >
                          <Pencil size={14} />
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </ResponsiveTable>
              <AdminPagination
                hasNext={nextCursor !== null}
                hasPrevious={cursorStack.length > 0}
                onNext={handleNext}
                onPrevious={handlePrevious}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
