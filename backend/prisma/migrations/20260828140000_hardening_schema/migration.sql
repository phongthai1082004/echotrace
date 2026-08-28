-- Hardening: FK cascade on CartItem.bookId + unique constraints on Order.trackingCode and Supplier.email.

-- 1.5: deleting a Book now cascades to its cart lines (was RESTRICT, which blocked book deletion).
ALTER TABLE "CartItem" DROP CONSTRAINT IF EXISTS "CartItem_bookId_fkey";
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_bookId_fkey"
  FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 1.3: unique shipping tracking code (nullable -> multiple NULLs allowed by Postgres).
CREATE UNIQUE INDEX IF NOT EXISTS "Order_trackingCode_key" ON "Order"("trackingCode");

-- 1.3: unique supplier email.
-- ponytail: if existing duplicate supplier emails exist this will fail; dedupe those rows first.
CREATE UNIQUE INDEX IF NOT EXISTS "Supplier_email_key" ON "Supplier"("email");
