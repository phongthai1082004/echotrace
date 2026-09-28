import { useCallback } from "react";
import { apiFetch } from "@/lib/api.fetch";

// Poll xác nhận thanh toán mỗi 12s, skip tab ẩn, tự dừng khi hết pending.
// Dùng chung cho trang orders (drawer chi tiết) và checkout (hiện QR).
export function useVerifyPoll(token?: string) {
  const pollVerify = useCallback(
    (id: number, status: string, onPaid: (status: string) => void) => {
      if (!token || !id || status !== "pending_payment") return;
      const interval = setInterval(async () => {
        if (document.hidden) return;
        try {
          const r = await apiFetch<{ status: string }>(`/api/orders/${id}/verify`, token, { method: "POST" });
          if (r?.status && r.status !== "pending_payment") {
            clearInterval(interval);
            onPaid(r.status);
          }
        } catch {}
      }, 12000);
      return () => clearInterval(interval);
    },
    [token],
  );
  return pollVerify;
}
