-- Fix Order/Transaction default values to match the app's enum casing (lowercase).
-- The app always writes lowercase status/paymentType/type, and the finance
-- triggers compare lowercase. UPPER_SNAKE defaults were a latent corruption
-- risk for any INSERT that omits the column. No row data is changed; only
-- the column defaults are adjusted.

ALTER TABLE "Order" ALTER COLUMN "status" SET DEFAULT 'pending_payment';
ALTER TABLE "Order" ALTER COLUMN "paymentType" SET DEFAULT 'full-payment';
ALTER TABLE "Transaction" ALTER COLUMN "type" SET DEFAULT 'full_payment';
