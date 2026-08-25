CREATE TABLE "CartItem" (
    "id" SERIAL NOT NULL,
    "cartId" INTEGER NOT NULL,
    "bookId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "cover" TEXT,
    "paper" TEXT,
    "paperSize" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);

INSERT INTO "CartItem" ("cartId", "bookId", "quantity", "cover", "paper", "paperSize", "updatedAt")
SELECT DISTINCT ON (c."id", (item->>'bookId')::int)
    c."id",
    (item->>'bookId')::int,
    COALESCE(NULLIF(item->>'quantity', '')::int, 1),
    NULLIF(item->>'cover', ''),
    NULLIF(item->>'paper', ''),
    NULLIF(item->>'paperSize', ''),
    CURRENT_TIMESTAMP
FROM "Cart" c
CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(c."items") = 'array' THEN c."items" ELSE '[]'::jsonb END
) AS item
WHERE item->>'bookId' ~ '^\d+$'
  AND EXISTS (SELECT 1 FROM "Book" b WHERE b."id" = (item->>'bookId')::int)
ORDER BY c."id", (item->>'bookId')::int;

ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "CartItem_cartId_bookId_key" ON "CartItem"("cartId", "bookId");
CREATE INDEX "CartItem_bookId_idx" ON "CartItem"("bookId");

ALTER TABLE "Cart" DROP COLUMN "items";
