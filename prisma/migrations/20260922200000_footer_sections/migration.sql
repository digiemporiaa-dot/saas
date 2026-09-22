-- The footer, as sections.
--
-- Same shape as PageSection, BlogSection and ProductSection, so the footer
-- reuses the page builder's registry, design panel and renderer rather than
-- growing a fourth one. Per market, because a footer already differs by
-- market: the contact details, the menus and the copyright line are each a
-- market's own.
--
-- Nothing is backfilled. A market with no rows renders the built-in
-- arrangement — the footer exactly as it was — so this migration changes no
-- live footer.

CREATE TABLE "FooterSection" (
  "id"        TEXT NOT NULL,
  "countryId" TEXT NOT NULL,
  "blockType" TEXT NOT NULL,
  "name"      TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isVisible" BOOLEAN NOT NULL DEFAULT true,
  "content"   JSONB NOT NULL DEFAULT '{}',
  "settings"  JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "FooterSection_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FooterSection_countryId_sortOrder_idx" ON "FooterSection"("countryId", "sortOrder");

ALTER TABLE "FooterSection"
  ADD CONSTRAINT "FooterSection_countryId_fkey"
  FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- The gap between footer rows, which are sections now.
ALTER TABLE "WebsiteSettings" ADD COLUMN "footerRowGap" TEXT NOT NULL DEFAULT '';
