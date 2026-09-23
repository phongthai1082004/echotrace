import { handleOrderExpiry } from "./redis-delayed-queue.js";
import { container } from "tsyringe";
import { OrderRepository } from "../repositories/order.repository.js";

// ponytail: không interval — Redis delayed job hẹn giờ hủy từng đơn (Redis-only, rẻ).
// Scan boot 1 lần để dọn đơn tồn khi Redis rớt/mất job. DB được ngủ khi rỗi.
const BATCH_SIZE = 200;

export function startOrderExpiryCron(): void {
  const orderRepo = container.resolve<OrderRepository>("OrderRepository");
  const scan = async () => {
    try {
      // ponytail: phân trang theo id tăng dần để không load 1 lần; lặp tới khi hết.
      let lastId = 0;
      let processed = 0;
      for (;;) {
        const due = await orderRepo.findExpiredForCancellation(lastId, BATCH_SIZE);
        if (due.length === 0) break;
        for (const o of due) {
          await handleOrderExpiry(o.id).catch((e) => console.error("[expiry-cron] skip", o.id, e));
        }
        processed += due.length;
        lastId = due[due.length - 1].id;
        if (due.length < BATCH_SIZE) break;
      }
      if (processed > 0) console.log(`[expiry-cron] processed ${processed} expired orders`);
    } catch (e) {
      console.error("[expiry-cron] scan error", e);
    }
  };

  // ponytail: 1 lần khi boot để dọn đơn tồn đọng — không lặp, khỏi giữ Neon thức.
  void scan();
}
