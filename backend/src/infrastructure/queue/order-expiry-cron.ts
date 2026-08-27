import { prisma } from "../../../lib/prisma.js";
import { OrderStatus } from "@echotrace/shared";
import { handleOrderExpiry } from "./redis-delayed-queue.js";

const TEN_MINUTES_MS = 10 * 60 * 1000;

// ponytail: cron an toàn chạy 10 phút/lần để bắt những đơn pending_payment hết hạn
// mà Redis delayed job lỡ không xử lý (mất kết nối/m timeout). Chỉ cancel đơn chưa thanh toán.
const BATCH_SIZE = 200;

export function startOrderExpiryCron(): void {
  const scan = async () => {
    try {
      // ponytail: phân trang theo id tăng dần để không load 1 lần; lặp tới khi hết.
      let lastId = 0;
      let processed = 0;
      for (;;) {
        const due = await prisma.order.findMany({
          where: { id: { gt: lastId }, status: OrderStatus.PENDING_PAYMENT, expiredAt: { lt: new Date() } },
          select: { id: true },
          orderBy: { id: "asc" },
          take: BATCH_SIZE,
        });
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

  // ponytail: chạy luôn 1 lần khi boot để dọn đơn tồn đọng
  void scan();
  setInterval(scan, TEN_MINUTES_MS);
}
