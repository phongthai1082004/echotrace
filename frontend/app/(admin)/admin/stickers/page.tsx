import { apiFetch } from "@/lib/api.fetch";
import { getPageContext } from "@/lib/page-context";
import { StickersClient } from "./_components/stickers-client";
import type { Asset } from "./_hooks/use-stickers";

export default async function AdminAssetsPage() {
  const { token } = await getPageContext();

  let initialAssets: Asset[] | undefined;
  if (token) {
    try {
      initialAssets = (await apiFetch<Asset[]>("/api/stickers", token)) ?? [];
    } catch {
    }
  }

  return <StickersClient initialAssets={initialAssets} />;
}
