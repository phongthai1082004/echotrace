-- Hàng đợi delta autosave: mỗi lần save chỉ INSERT vài KB thay vì đọc/ghi cả cục
-- content hàng MB. Worker gộp (flush) khi idle 10 phút / save tay / order / đầy 50.
CREATE TABLE "BookPageDelta" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "bookId" INTEGER NOT NULL REFERENCES "Book"("id") ON DELETE CASCADE,
    "pageIndex" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "BookPageDelta_bookId_id_idx" ON "BookPageDelta"("bookId", "id");
