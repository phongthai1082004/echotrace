import { Redis } from "ioredis";
import { prisma } from "../../../lib/prisma.js";
import { OrderStatus } from "@echotrace/shared";

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

// ponytail: delayed job đơn giản trên Redis Sorted Set (score = run-at timestamp)
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
    if (!removed) continue; // ponytail: tránh xử lý 2 lần nếu có nhiều worker
    try {
      const job = JSON.parse(member) as { name: string; payload: { orderId: number } };
      if (job.name === "order_expiry") await handleOrderExpiry(job.payload.orderId);
    } catch (e) {
      console.error("[delayed] job failed", member, e);
    }
  }
}

export async function handleOrderExpiry(orderId: number): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true, expiredAt: true },
  });
  // ponytail: chỉ cancel nếu vẫn pending_payment VÀ đã qua expiredAt (link có thể được làm mới)
  if (!order || order.status !== OrderStatus.PENDING_PAYMENT) return;
  if (order.expiredAt && order.expiredAt.getTime() > Date.now()) return;
  await prisma.order.update({ where: { id: orderId }, data: { status: OrderStatus.CANCELLED } });
}

export function startDelayedWorker(): void {
  if (started) return;
  started = true;
  timer = setInterval(() => {
    processDue().catch((e) => console.error("[delayed] poll error", e));
  }, 5000);
}
