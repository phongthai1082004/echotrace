"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Eye, Pencil, PenTool, Save } from "lucide-react";
import { CloseButton } from "@/components/ui/close-button";
import { SampleBookDTO, Category, SampleBookType, SampleBookStatus } from "@echotrace/shared";
import { card, input, label, neoBtn, neoBtnPrimary, chip } from "@/lib/styles";
import { AdminHeader } from "@/components/admin-header";
import { AdminSearch } from "@/components/admin-search";
import { AdminPagination } from "@/components/admin-pagination";
import { AdminList } from "@/components/admin-list";
import { EmptyStateMinimal } from "@/components/ui/empty-state";
import { useToast } from "@/components/toast";
import { apiFetch } from "@/lib/api.fetch";
import { useDebounce } from "@hooks";

const TYPE_OPTIONS: SampleBookDTO["type"][] = Object.values(SampleBookType);
const CATEGORY_OPTIONS = Object.values(Category);
const STATUS_OPTIONS = Object.values(SampleBookStatus);

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-[#e8e6e0] text-[#666]",
  published: "bg-[#1565c0] text-white",
  archive: "bg-[#FFD93D] text-[#222]",
};

type ListResponse = { items: SampleBookDTO[]; nextCursor: number | null };

function FilterGroup({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={`px-2 py-1 rounded-md border-2 transition-colors ${
              active
                ? "bg-[#222] text-white border-[#222] shadow-[2px_2px_0_#222]"
                : "border-transparent text-[#666] hover:text-[#222] hover:bg-[#e8e6e0]"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export default function AdminSampleBooksPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { data: session } = useSession();
  const accessToken = (session as any)?.accessToken;

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 1000);
  const [type, setType] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [items, setItems] = useState<SampleBookDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<number | null>(null);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [cursorStack, setCursorStack] = useState<number[]>([]);
  const [editing, setEditing] = useState<SampleBookDTO | null>(null);
  const [editForm, setEditForm] = useState<{ type: "ALBUM" | "TEMPLATE"; quantity: number; status: string }>({
    type: "TEMPLATE",
    quantity: 0,
    status: "draft",
  });
  const [saving, setSaving] = useState(false);

  const queryUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (type) params.set("type", type);
    if (category) params.set("category", category);
    if (status) params.set("status", status);
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (cursor) params.set("cursor", String(cursor));
    return `/api/admin/sample-books?${params.toString()}`;
  }, [type, category, status, debouncedSearch, cursor]);

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
  }, [type, category, status, debouncedSearch]);

  const openEdit = (s: SampleBookDTO) => {
    setEditForm({ type: s.type, quantity: s.quantity ?? 0, status: s.status });
    setEditing(s);
  };

  const handleSave = async () => {
    if (!editing || saving) return;
    setSaving(true);
    try {
      const body: any = { type: editForm.type, status: editForm.status };
      // only albums carry a quantity; templates always reset it
      body.quantity = editForm.type === "ALBUM" ? editForm.quantity : null;
      const updated = await apiFetch<SampleBookDTO>(`/api/admin/sample-books/${editing.id}`, accessToken, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      setItems((prev) => prev.map((b) => (b.id === editing.id ? updated : b)));
      setEditing(null);
      showToast(t("admin.sampleBooks.updated"), "success");
    } catch {
      showToast(t("admin.sampleBooks.updateFailed"), "error");
    } finally {
      setSaving(false);
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
        <div className={`${card} p-3 shrink-0`}>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[9px] font-bold tracking-widest uppercase">
            <FilterGroup
              options={[
                { value: "", label: t("admin.sampleBooks.allTypes") },
                ...TYPE_OPTIONS.map((v) => ({
                  value: v,
                  label: t(`admin.sampleBooks.${v === "ALBUM" ? "kindAlbum" : "kindTemplate"}`),
                })),
              ]}
              value={type}
              onChange={setType}
            />
            <span className="text-[#999] select-none">|</span>
            <FilterGroup
              options={[
                { value: "", label: t("admin.sampleBooks.allCategories") },
                ...CATEGORY_OPTIONS.map((v) => ({ value: v, label: v })),
              ]}
              value={category}
              onChange={setCategory}
            />
            <span className="text-[#999] select-none">|</span>
            <FilterGroup
              options={[
                { value: "", label: t("admin.sampleBooks.allStatuses") },
                ...STATUS_OPTIONS.map((v) => ({ value: v, label: t(`admin.sampleBooks.${v}`) })),
              ]}
              value={status}
              onChange={setStatus}
            />
          </div>
        </div>

        <div className={`${card} flex-1 flex flex-col min-h-0`}>
          <AdminList
            columns={[
              { key: "name", label: t("admin.sampleBooks.name"), width: "2fr" },
              { key: "type", label: t("admin.sampleBooks.type"), width: "0.7fr", align: "center" },
              { key: "category", label: t("admin.sampleBooks.category"), width: "0.9fr", align: "center" },
              { key: "quantity", label: t("admin.sampleBooks.quantity"), width: "0.5fr" },
              { key: "pages", label: t("admin.sampleBooks.pages"), width: "0.5fr" },
              { key: "status", label: t("admin.sampleBooks.status"), width: "110px", align: "center" },
              { key: "action", label: t("common.action"), width: "140px", align: "center" },
            ]}
            data={items}
            loading={loading}
            rowKey={(s) => s.id}
            empty={
              fetchError ? (
                <EmptyStateMinimal title={t("admin.sampleBooks.fetchFailed")} />
              ) : (
                <EmptyStateMinimal title={t("admin.sampleBooks.noItems")} />
              )
            }
            footer={
              <AdminPagination
                hasNext={nextCursor !== null}
                hasPrevious={cursorStack.length > 0}
                onNext={handleNext}
                onPrevious={handlePrevious}
              />
            }
            renderRow={(s: SampleBookDTO) => (
              <>
                <div className="px-2 text-sm font-bold whitespace-nowrap min-w-0 truncate">
                  {s.name || "Untitled"}
                </div>
                <div className="px-2 flex justify-center">
                  <span className={`${chip} ${s.type === "ALBUM" ? "bg-[#FFD93D] text-[#222]" : "bg-[#e8e6e0] text-[#444]"}`}>
                    {t(`admin.sampleBooks.${s.type === "ALBUM" ? "kindAlbum" : "kindTemplate"}`)}
                  </span>
                </div>
                <div className="px-2 flex justify-center">
                  <span className={`${chip} bg-[#FFF7D6] text-[#222]`}>
                    {s.category ?? "—"}
                  </span>
                </div>
                <div className="px-2 font-mono text-[9px] font-bold text-[#666] whitespace-nowrap">
                  {s.quantity ?? "—"}
                </div>
                <div className="px-2 font-mono text-[9px] font-bold text-[#666] whitespace-nowrap">
                  {s.pageCount} {t("admin.sampleBooks.pg")}
                </div>
                <div className="px-2 flex justify-center">
                  <span className={`${chip} inline-flex items-center gap-1 ${STATUS_STYLE[s.status] ?? STATUS_STYLE.draft}`}>
                    {t(`admin.sampleBooks.${s.status}`)}
                  </span>
                </div>
                <div className="px-2 flex items-center justify-center gap-1.5">
                  <Link
                    href={studioHref(s)}
                    title={s.status === "published" ? t("admin.sampleBooks.publishedLocked") : t("admin.sampleBooks.edit")}
                    className={`${neoBtn} p-1.5 ${s.status === "published" ? "opacity-40 pointer-events-none" : ""}`}
                  >
                    <PenTool size={14} />
                  </Link>
                  {s.status === "published" ? (
                    <Link href={`/studio/preview?id=${s.id}`} title={t("admin.sampleBooks.preview")} className={`${neoBtn} p-1.5`}>
                      <Eye size={14} />
                    </Link>
                  ) : (
                    <button
                      disabled
                      title={t("admin.sampleBooks.preview")}
                      className={`${neoBtn} p-1.5 opacity-30 cursor-not-allowed`}
                    >
                      <Eye size={14} />
                    </button>
                  )}
                  <button
                    onClick={() => openEdit(s)}
                    title={t("admin.sampleBooks.editInfo")}
                    className={`${neoBtn} p-1.5`}
                  >
                    <Pencil size={14} />
                  </button>
                </div>
              </>
            )}
          />
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center">
          <div className={`${card} w-96 p-5`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <p className="font-bold text-sm truncate">{editing.name || "Untitled"}</p>
              <CloseButton onClick={() => setEditing(null)} size={14} />
            </div>

            <div className="space-y-4">
              <div>
                <p className={`${label} mb-1`}>{t("admin.sampleBooks.type")}</p>
                <div className="flex gap-2">
                  {TYPE_OPTIONS.map((v) => (
                    <button
                      key={v}
                      onClick={() => setEditForm((f) => ({ ...f, type: v as "ALBUM" | "TEMPLATE" }))}
                      className={`flex-1 font-mono text-[9px] font-bold tracking-widest uppercase px-3 py-2 ${
                        editForm.type === v ? neoBtnPrimary : neoBtn
                      }`}
                    >
                      {t(`admin.sampleBooks.${v === "ALBUM" ? "kindAlbum" : "kindTemplate"}`)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className={`${label} mb-1`}>{t("admin.sampleBooks.quantity")}</p>
                <input
                  type="number"
                  min={0}
                  value={editForm.quantity}
                  disabled={editForm.type !== "ALBUM"}
                  onChange={(e) => setEditForm((f) => ({ ...f, quantity: Number(e.target.value) }))}
                  className={`${input} disabled:opacity-40`}
                />
                {editForm.type !== "ALBUM" && (
                  <p className="text-[10px] text-[#999] mt-1">{t("admin.sampleBooks.quantityAlbumOnly")}</p>
                )}
              </div>

              <div>
                <p className={`${label} mb-1`}>{t("admin.sampleBooks.status")}</p>
                <div className="flex gap-2">
                  {STATUS_OPTIONS.map((st) => (
                    <button
                      key={st}
                      onClick={() => setEditForm((f) => ({ ...f, status: st }))}
                      className={`flex-1 font-mono text-[9px] font-bold tracking-widest uppercase px-3 py-2 ${
                        editForm.status === st ? neoBtnPrimary : neoBtn
                      }`}
                    >
                      {t(`admin.sampleBooks.${st}`)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setEditing(null)}
                  className={`${neoBtn} font-mono text-[9px] font-bold tracking-widest uppercase flex-1 py-3`}
                >
                  {t("common.cancel")}
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className={`${neoBtnPrimary} font-mono text-[9px] font-bold tracking-widest uppercase flex-1 py-3 flex items-center justify-center gap-2 disabled:opacity-40`}
                >
                  <Save size={16} /> {saving ? `${t("common.save")}…` : t("common.save")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
