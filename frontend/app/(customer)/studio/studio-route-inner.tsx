"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { StudioPage } from "@/features/studio-canvas/components/StudioPage";
import { useStudioEditor } from "@/features/studio-canvas/hooks/useStudioEditor";
import { customerAPI } from "@/features/studio-canvas/api/customer-api";
import { apiFetch } from "@/lib/api.fetch";
import { SizeModal } from "../my-journals/_components/size-modal";
import { StudioSkeleton } from "@/components/skeleton";

export default function StudioRouteInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const accessToken = (session as any)?.accessToken;
  const bookId = searchParams.get("id");
  const sampleId = searchParams.get("sample");
  const format = searchParams.get("format");
  const w = Number(searchParams.get("w") || "0");
  const h = Number(searchParams.get("h") || "0");
  const initialSize = w > 0 && h > 0 ? { width: w, height: h } : null;

  const needsSize = !bookId && !sampleId && !format;
  const [showSize] = useState(needsSize);
  const [sizes, setSizes] = useState<any[]>([]);
  const [sizesLoading, setSizesLoading] = useState(false);

  useEffect(() => {
    if (!showSize || sizes.length || !accessToken) return;
    setSizesLoading(true);
    apiFetch<any>("/api/user/suppliers/options", accessToken)
      .then((d) => setSizes(d?.sizes ?? []))
      .catch(() => setSizes([]))
      .finally(() => setSizesLoading(false));
  }, [showSize, sizes.length, accessToken]);

  const loadSample = async (id: string) => {
    const res = await apiFetch<Response>(`/api/user/sample-books/${id}`, accessToken, { raw: true });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  };

  const { loaded, loadError } = useStudioEditor(
    bookId,
    status === "authenticated",
    sampleId ? loadSample : (id) => customerAPI.load(id),
    format,
    initialSize,
    sampleId,
  );

  if (needsSize) {
    return <SizeModal sizes={sizes} loading={sizesLoading} onClose={() => router.push("/my-journals")} />;
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <p className="text-sm font-bold text-[#B54843]">Failed to load book: {loadError}</p>
      </div>
    );
  }
  if (!loaded) {
    return <StudioSkeleton />;
  }
  return <StudioPage api={customerAPI} backHref={sampleId ? "/explore" : "/my-journals"} />;
}
