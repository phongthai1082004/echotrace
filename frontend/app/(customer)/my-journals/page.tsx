import Link from "next/link";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";
import { apiFetch } from "@/lib/api.fetch";
import { getT } from "@/lib/i18n-server";
import { neoBtnPrimary } from "@/lib/styles";
import type { JournalBook } from "./_hooks/use-my-books";
import { MyJournalsClient } from "./_components/my-journals-client";

// ponytail: page server — header + data lần đầu render sẵn thành HTML,
// khỏi waterfall session → token → fetch ở client (mẫu explore/page.tsx).
export default async function MyJournalsPage() {
  const lng = (await cookies()).get("i18nextLng")?.value ?? "vi";
  const t = getT(lng);
  const session = await getServerSession(authOptions);
  const token = (session as any)?.accessToken as string | undefined;

  let initialJournals: JournalBook[] | undefined;
  let initialError: string | null = null;
  if (token) {
    try {
      initialJournals = (await apiFetch<JournalBook[]>("/api/user/my-books", token)) ?? [];
    } catch (err) {
      initialJournals = [];
      initialError = err instanceof Error ? err.message : String(err);
    }
  }

  return (
    <div className="min-h-screen pt-15">
      <div className="px-4 sm:px-8 max-[1600px]:px-6 max-[1440px]:px-5 max-[1280px]:px-4 py-6 sm:py-10 max-[1600px]:py-8 max-[1440px]:py-6 flex flex-col sm:flex-row sm:items-end gap-3 sm:justify-between border-b-[3px] border-[#222]">
        <div>
          <h1
            className="text-3xl max-[1600px]:text-2xl max-[1440px]:text-xl max-[1280px]:text-lg font-bold"
            suppressHydrationWarning
          >
            {t("customer.myJournals.title")}
          </h1>
          <p className="text-sm mt-1 text-[#666]" suppressHydrationWarning>
            {t("customer.myJournals.subtitle")}
          </p>
        </div>
        <Link
          href="/studio"
          suppressHydrationWarning
          className={`${neoBtnPrimary} font-mono text-[10px] font-bold tracking-widest uppercase px-5 py-3 shrink-0`}
        >
          {t("customer.myJournals.newJournal")}
        </Link>
      </div>

      <div className="px-4 sm:px-8 max-[1600px]:px-6 max-[1440px]:px-5 max-[1280px]:px-4 py-6 sm:py-10 max-[1600px]:py-8 max-[1440px]:py-6">
        <p
          suppressHydrationWarning
          className="font-mono text-[9px] font-bold tracking-widest uppercase mb-5 text-[#666]"
        >
          {t("customer.myJournals.history")}
        </p>
        {initialError && (
          <p suppressHydrationWarning className="text-[10px] text-red-500 mb-3">
            {t("customer.myJournals.error", { message: initialError })}
          </p>
        )}
        <MyJournalsClient initialJournals={initialJournals} initialError={initialError} />
      </div>
    </div>
  );
}
