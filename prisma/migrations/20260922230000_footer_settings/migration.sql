-- The footer, as one row.
--
-- One table, one row, two JSON documents: what the footer says and what it
-- looks like. The footer this replaces was a table of CMS block rows plus
-- seventeen columns on WebsiteSettings plus a market's own copy, which is how
-- it ended up being edited from three screens that disagreed.
--
-- A site with no row renders the built-in footer, so this migration changes
-- nothing on its own.

CREATE TABLE "FooterSettings" (
  "id"        TEXT NOT NULL DEFAULT 'singleton',
  "content"   JSONB NOT NULL DEFAULT '{}',
  "design"    JSONB NOT NULL DEFAULT '{}',
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "FooterSettings_pkey" PRIMARY KEY ("id")
);
