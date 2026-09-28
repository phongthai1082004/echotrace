-- Album personalization creates one Book per (userId, sampleBookId); enforce it so
-- concurrent add-to-cart requests cannot insert duplicates. PostgreSQL treats
-- NULLs as distinct, so regular (non-album) books with sampleBookId NULL are unaffected.
-- NOTE: fails if duplicates already exist — find them first:
-- SELECT "userId", "sampleBookId", COUNT(*) FROM "Book"
-- WHERE "sampleBookId" IS NOT NULL GROUP BY 1, 2 HAVING COUNT(*) > 1;
CREATE UNIQUE INDEX "Book_userId_sampleBookId_key" ON "Book"("userId", "sampleBookId");
