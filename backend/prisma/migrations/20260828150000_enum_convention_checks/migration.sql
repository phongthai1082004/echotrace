-- 1.1 / 4.4: enforce a single string convention per enum-like column.
-- Prisma enums cannot represent hyphenated values (e.g. 'full-payment'), so we use
-- native PostgreSQL CHECK constraints + a one-time normalization of legacy rows.

-- Normalize legacy uppercase rows (from the old uppercase schema defaults) to the
-- canonical lowercase values the app uses. Only the two columns that ever had
-- uppercase defaults are touched; every other column is already lowercase.
UPDATE "Order" SET "status" = lower("status")
  WHERE "status" IN ('PENDING_PAYMENT','PAID','PARTIALLY_PAID','PROCESSING','SHIPPING','DELIVERED','CANCELLED','REFUNDING','REFUNDED');
UPDATE "Order" SET "paymentType" = lower("paymentType")
  WHERE "paymentType" IN ('FULL','HALF_PAYMENT');

-- Order
ALTER TABLE "Order" ADD CONSTRAINT "Order_status_check"
  CHECK ("status" IN ('pending_payment','paid','partially_paid','processing','shipping','delivered','cancelled','refunding','refunded'));
ALTER TABLE "Order" ADD CONSTRAINT "Order_paymentType_check"
  CHECK ("paymentType" IN ('full-payment','half-payment'));

-- Transaction
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_type_check"
  CHECK ("type" IN ('deposit','remaining_payment','full_payment'));
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_status_check"
  CHECK ("status" IN ('pending','success','failed','cancelled','expired','refunded'));
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_gateway_check"
  CHECK ("gateway" IN ('PAYOS','SEPAY'));

-- Cashflow (IN/OUT are intentionally uppercase)
ALTER TABLE "Cashflow" ADD CONSTRAINT "Cashflow_type_check"
  CHECK ("type" IN ('IN','OUT'));

-- User
ALTER TABLE "User" ADD CONSTRAINT "User_role_check"
  CHECK ("role" IN ('admin','user'));

-- Coupon
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_discountType_check"
  CHECK ("discountType" IN ('percentage','fixed'));
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_minOrderType_check"
  CHECK ("minOrderType" IN ('value','quantity'));
