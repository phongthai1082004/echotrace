import { apiFetch } from "@/lib/api.fetch";
import { getPageContext } from "@/lib/page-context";
import { StickersClient } from "./_components/stickers-client";
import type { Asset } from "./_hooks/use-stickers";

// ponytail: page server — grid stickers lần đầu render sẵn, khỏi fetch sau session ở client.
export default async function AdminAssetsPage() {
  const { token } = await getPageContext();

  let initialAssets: Asset[] | undefined;
  if (token) {
    try {
      initialAssets = (await apiFetch<Asset[]>("/api/admin/stickers", token)) ?? [];
    } catch {
      initialAssets = [];
    }
  }

  return <StickersClient initialAssets={initialAssets} />;
}
