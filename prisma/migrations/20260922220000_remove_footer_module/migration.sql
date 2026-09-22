-- The footer module, removed.
--
-- Everything the footer was is going: the table its rows lived in, the copy a
-- market wrote for it, and the thirteen values that styled it. Nothing else
-- reads any of them — the blocks, the renderer, the builder and the settings
-- tab all went with this migration.
--
-- It is not coming back in this shape. A new footer will be built from
-- scratch, and starting it on top of a half-remembered table is how the old
-- one ended up being managed from three screens at once.
--
-- Kept on purpose, because neither belongs to the footer: `Page.showFooter`,
-- which pairs with `showHeader` and is what a new footer will read, and the
-- FOOTER and FOOTER_SECONDARY navigation locations, which are the menus'.

DROP TABLE IF EXISTS "FooterSection";

ALTER TABLE "Country"
  DROP COLUMN IF EXISTS "footerDescription",
  DROP COLUMN IF EXISTS "copyrightText";

ALTER TABLE "WebsiteSettings"
  DROP COLUMN IF EXISTS "footerDescription",
  DROP COLUMN IF EXISTS "copyrightText",
  DROP COLUMN IF EXISTS "footerNewsletterEnabled",
  DROP COLUMN IF EXISTS "footerNewsletterFormId",
  DROP COLUMN IF EXISTS "footerBg",
  DROP COLUMN IF EXISTS "footerText",
  DROP COLUMN IF EXISTS "footerHeadingColor",
  DROP COLUMN IF EXISTS "footerLinkColor",
  DROP COLUMN IF EXISTS "footerLinkHover",
  DROP COLUMN IF EXISTS "footerBorderColor",
  DROP COLUMN IF EXISTS "footerPaddingY",
  DROP COLUMN IF EXISTS "footerWidth",
  DROP COLUMN IF EXISTS "footerColumnGap",
  DROP COLUMN IF EXISTS "footerRowGap",
  DROP COLUMN IF EXISTS "footerLogoHeight",
  DROP COLUMN IF EXISTS "footerSocialSize",
  DROP COLUMN IF EXISTS "footerContactColor";
