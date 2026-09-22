-- Precise mega menus: a width, an alignment, and an uploaded image per item.
--
-- The width and alignment default to "" and "center", which is exactly the
-- panel that renders today, so every existing mega menu is unchanged. The
-- image is optional and sits in place of the icon where one is set — a vendor
-- logo has no equivalent in the shipped icon set.

ALTER TABLE "NavigationItem"
  ADD COLUMN "megaWidth" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "megaAlign" TEXT NOT NULL DEFAULT 'center',
  ADD COLUMN "imageId"   TEXT,
  ADD COLUMN "imageSize" TEXT NOT NULL DEFAULT '';

CREATE INDEX "NavigationItem_imageId_idx" ON "NavigationItem"("imageId");

ALTER TABLE "NavigationItem"
  ADD CONSTRAINT "NavigationItem_imageId_fkey"
  FOREIGN KEY ("imageId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;
