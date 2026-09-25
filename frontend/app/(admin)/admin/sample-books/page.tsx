import { apiFetch } from "@/lib/api.fetch";
import { getPageContext } from "@/lib/page-context";
import type { SampleBookDTO } from "@echotrace/shared";
import { SampleBooksClient } from "./_components/sample-books-client";

// ponytail: page server — rows đầu render sẵn, khỏi fetch sau session ở client.
export default async function AdminSampleBooksPage() {
  const { token } = await getPageContext();

  let initialItems: SampleBookDTO[] | undefined;
  let initialNextCursor: number | null | undefined;
  if (token) {
    try {
      const d = await apiFetch<{ items: SampleBookDTO[]; nextCursor: number | null }>(
        "/api/admin/sample-books",
        token,
      );
      initialItems = d?.items ?? [];
      initialNextCursor = d?.nextCursor ?? null;
    } catch {
      initialItems = [];
      initialNextCursor = null;
    }
  }

  return <SampleBooksClient initialItems={initialItems} initialNextCursor={initialNextCursor} />;
}
