import { Redis } from "ioredis";
import { container } from "tsyringe";
import { OrderStatus } from "@echotrace/shared";
import { OrderRepository } from "../repositories/order.repository.js";
import type {IStockService} from "../../product/sample-books/stock.service.js";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const QUEUE_KEY = "echotrace:delayed_jobs";

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
  client().zadd(QUEUE_KEY, Date.now() + delayMs, member);
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
    } catch (e) {
      console.error("[delayed] job failed", member, e);
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

export function startDelayedWorker(): void {
  if (started) return;
  started = true;
  timer = setInterval(() => {
    processDue().catch((e) => console.error("[delayed] poll error", e));
  }, 5000);
}
