import { Redis } from "ioredis";
import { container } from "tsyringe";
import { OrderStatus } from "@echotrace/shared";
import { OrderRepository } from "../repositories/order.repository.js";
import type {IStockService} from "../../product/sample-books/stock.service.js";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const QUEUE_KEY = "echotrace:delayed_jobs";

// Chu kỳ gom delta autosave: quá từng này không có delta mới mới flush xuống DB.
export const FLUSH_IDLE_MS = 10 * 60 * 1000;
// Trần an toàn: quá từng này delta treo thì flush ngay trong request.
export const FLUSH_MAX_PENDING = 50;

let redis: Redis | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let started = false;

function client(): Redis {
  if (!redis) {
    redis = new Redis(REDIS_URL);
    redis.on("error", (e) => console.error("[delayed] redis error", e));
  }
  return redis;
}

export function scheduleDelayedJob(name: string, payload: unknown, delayMs: number): void {
  const member = JSON.stringify({ name, payload });
  client()
    .zadd(QUEUE_KEY, Date.now() + delayMs, member)
    .catch((e) => console.warn("[delayed] schedule failed (redis down?):", (e as Error)?.message || e));
  startDelayedWorker();
}

async function processDue(): Promise<void> {
  const now = Date.now();
  const due = await client().zrangebyscore(QUEUE_KEY, 0, now);
  for (const member of due) {
    const removed = await client().zrem(QUEUE_KEY, member);
    if (!removed) continue;
    try {
      const job = JSON.parse(member) as { name: string; payload: { orderId: number } };
      if (job.name === "order_expiry") await handleOrderExpiry(job.payload.orderId);
      else if (job.name === "book_flush") await handleBookFlush((job.payload as any).bookId);
    } catch (e) {
		console.error('[delayed] job failed', String(member).slice(0, 120), (e as Error)?.message || e);
    }
  }
}

export async function handleOrderExpiry(orderId: number): Promise<void> {
  const orderRepo = container.resolve<OrderRepository>("OrderRepository");
  const stockService = container.resolve<IStockService>("IStockService");
  const order = await orderRepo.findForExpiry(orderId);
  if (!order || order.status !== OrderStatus.PENDING_PAYMENT) return;
  if (order.expiredAt && order.expiredAt.getTime() > Date.now()) return;
  // another concurrent path already flipped the status; skip restock to prevent double-increment.
  await orderRepo.client.$transaction(async (tx) => {
    const { count } = await orderRepo.markCancelled(orderId, tx);
    if (count === 0) return; // already cancelled by another path — do not restock
    await stockService.restockOrderAlbums(order.orderItems, tx);
  });
}

export async function handleBookFlush(bookId: number): Promise<void> {
	if (!Number.isFinite(bookId)) return;
	const books = container.resolve<{ flushBookIfStale(id: number): Promise<unknown> }>('IBookService');
	await books.flushBookIfStale(bookId);
}

export function startDelayedWorker(): void {  if (started) return;
  started = true;
  timer = setInterval(() => {
    processDue().catch((e) => console.error("[delayed] poll error", e));
  }, 5000);
}
