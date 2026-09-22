-- A recycle bin for brands and product categories.
--
-- Removing the last market's offer of a shared category or brand used to
-- destroy the row. It is now marked deleted instead, so it waits in the bin
-- like a page, an article or a product does, and the products pointing at it
-- keep pointing at it.
--
-- Nothing is backfilled: every existing row is live, which is what a NULL
-- deletedAt means.

ALTER TABLE "Brand" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "ProductCategory" ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE INDEX "Brand_deletedAt_idx" ON "Brand"("deletedAt");
CREATE INDEX "ProductCategory_deletedAt_idx" ON "ProductCategory"("deletedAt");
