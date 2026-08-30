-- Add unique constraint on User.phone.
-- NULL values are excluded from uniqueness checks in PostgreSQL,
-- so multiple users without a phone (NULL) are still allowed.
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone") WHERE "phone" IS NOT NULL;
