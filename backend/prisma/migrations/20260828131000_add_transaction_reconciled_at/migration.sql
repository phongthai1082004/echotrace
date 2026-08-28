-- Add reconciledAt to Transaction so refund reconciliation marks txns in one
-- updateMany instead of a per-txn rawPayload JSON merge loop (N9).
-- NOTE: the migrations history is already out of sync with schema.prisma
-- (Income/Cashflow drift); this migration is intentionally minimal and only
-- adds the one column this change needs.
ALTER TABLE "Transaction" ADD COLUMN "reconciledAt" TIMESTAMP(3);
