import { apiFetch } from "@/lib/api.fetch";
import { getPageContext } from "@/lib/page-context";
import type { PrintOption } from "@/models/print-option/print-option";
import { PrintOptionsClient } from "./_components/print-options-client";

// ponytail: page server — rows đầu render sẵn, khỏi fetch sau session ở client.
export default async function AdminPrintOptionsPage() {
  const { token } = await getPageContext();

  let initialOptions: PrintOption[] | undefined;
  if (token) {
    try {
      const d = await apiFetch<{ items: PrintOption[] }>("/api/admin/print-options", token);
      initialOptions = d?.items ?? [];
    } catch {
      // ponytail: để undefined cho island fetch lại qua proxy, đừng gán [] (kẹt trống).
    }
  }

  return <PrintOptionsClient initialOptions={initialOptions} />;
}
