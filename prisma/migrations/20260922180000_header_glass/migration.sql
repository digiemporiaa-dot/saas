-- Glass on the header.
--
-- All three default to off — "" and false — which is the header as it is
-- today: a fixed slight blur behind a translucent surface. Setting a blur
-- replaces that fixed value with the chosen one; setting nothing changes
-- nothing.

ALTER TABLE "WebsiteSettings"
  ADD COLUMN "headerBlur"      TEXT NOT NULL DEFAULT '',
  ADD COLUMN "headerSaturate"  TEXT NOT NULL DEFAULT '',
  ADD COLUMN "headerGlassEdge" BOOLEAN NOT NULL DEFAULT false;
