"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSession } from "next-auth/react";
import { SampleBookDTO, Category, SampleBookType, SampleBookStatus } from "@echotrace/shared";
import { card } from "@/lib/styles";
import { AdminHeader } from "@/components/admin-header";
import { AdminSearch } from "@/components/admin-search";
import { useToast } from "@/components/toast";
import { apiFetch } from "@/lib/api.fetch";
import { useSampleBooks } from "./_hooks/use-sample-books";
import { FilterGroup } from "./_components/filter-group";
import { BooksTable } from "./_components/books-table";
import { EditModal } from "./_components/edit-modal";

const CATEGORY_OPTIONS = Object.values(Category);
const STATUS_OPTIONS = Object.values(SampleBookStatus);

export default function AdminSampleBooksPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { data: session } = useSession();
  const accessToken = (session as any)?.accessToken;

  const {
    search,
    setSearch,
    type,
    setType,
    category,
    setCategory,
    status,
    setStatus,
    items,
    setItems,
    loading,
    fetchError,
    nextCursor,
    cursorStack,
    handleNext,
    handlePrevious,
  } = useSampleBooks();

  const [editing, setEditing] = useState<SampleBookDTO | null>(null);

  const handleSave = async (body: { type: "ALBUM" | "TEMPLATE"; quantity: number | null; status: string }) => {
    if (!editing) return;
    try {
      const updated = await apiFetch<SampleBookDTO>(`/api/admin/sample-books/${editing.id}`, accessToken, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      setItems(items.map((b) => (b.id === updated.id ? updated : b)));
      setEditing(null);
      showToast(t("admin.sampleBooks.updated"), "success");
    } catch {
      showToast(t("admin.sampleBooks.updateFailed"), "error");
    }
  };

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
                ...Object.values(SampleBookType).map((v) => ({
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
          <BooksTable
            items={items}
            loading={loading}
            fetchError={fetchError}
            hasNext={nextCursor !== null}
            hasPrevious={cursorStack.length > 0}
            onNext={handleNext}
            onPrevious={handlePrevious}
            onEdit={setEditing}
          />
        </div>
      </div>

      {editing && <EditModal book={editing} onSave={handleSave} onClose={() => setEditing(null)} />}
    </div>
  );
}
