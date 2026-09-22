-- Header and footer appearance, and mega menus.
--
-- Every appearance column defaults to an empty string, which means "whatever
-- this already looked like": the renderer emits a CSS variable only for a
-- value somebody actually set, so a site that never opens the design screen is
-- untouched by this migration. The two booleans default to what the header
-- already does — bordered and sticky.
--
-- `megaMenu` is off by default, so every existing menu item keeps rendering
-- the dropdown it renders today.

ALTER TABLE "WebsiteSettings"
  ADD COLUMN "headerHeight"               TEXT NOT NULL DEFAULT '',
  ADD COLUMN "headerHeightMobile"         TEXT NOT NULL DEFAULT '',
  ADD COLUMN "headerWidth"                TEXT NOT NULL DEFAULT '',
  ADD COLUMN "headerBg"                   TEXT NOT NULL DEFAULT '',
  ADD COLUMN "headerText"                 TEXT NOT NULL DEFAULT '',
  ADD COLUMN "headerLinkHover"            TEXT NOT NULL DEFAULT '',
  ADD COLUMN "headerLinkActive"           TEXT NOT NULL DEFAULT '',
  ADD COLUMN "headerBorderColor"          TEXT NOT NULL DEFAULT '',
  ADD COLUMN "headerBorder"               BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "headerSticky"               BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "headerShadow"               TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN "headerMenuGap"              TEXT NOT NULL DEFAULT '',
  ADD COLUMN "headerMenuSize"             TEXT NOT NULL DEFAULT '',
  ADD COLUMN "headerMenuWeight"           TEXT NOT NULL DEFAULT '',
  ADD COLUMN "headerMenuTransform"        TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN "headerLogoHeight"           TEXT NOT NULL DEFAULT '',
  ADD COLUMN "headerLogoHeightMobile"     TEXT NOT NULL DEFAULT '',
  ADD COLUMN "headerLogoMaxWidth"         TEXT NOT NULL DEFAULT '',
  ADD COLUMN "announcementBgColor"        TEXT NOT NULL DEFAULT '',
  ADD COLUMN "announcementTextColor"      TEXT NOT NULL DEFAULT '',
  ADD COLUMN "headerCtaIcon"              TEXT NOT NULL DEFAULT '',
  ADD COLUMN "headerCtaIconSide"          TEXT NOT NULL DEFAULT 'left',
  ADD COLUMN "headerCtaVariant"           TEXT NOT NULL DEFAULT 'primary',
  ADD COLUMN "headerSecondaryCtaIcon"     TEXT NOT NULL DEFAULT '',
  ADD COLUMN "headerSecondaryCtaIconSide" TEXT NOT NULL DEFAULT 'left',
  ADD COLUMN "headerSecondaryCtaVariant"  TEXT NOT NULL DEFAULT 'ghost',
  ADD COLUMN "footerBg"                   TEXT NOT NULL DEFAULT '',
  ADD COLUMN "footerText"                 TEXT NOT NULL DEFAULT '',
  ADD COLUMN "footerHeadingColor"         TEXT NOT NULL DEFAULT '',
  ADD COLUMN "footerLinkColor"            TEXT NOT NULL DEFAULT '',
  ADD COLUMN "footerLinkHover"            TEXT NOT NULL DEFAULT '',
  ADD COLUMN "footerBorderColor"          TEXT NOT NULL DEFAULT '',
  ADD COLUMN "footerPaddingY"             TEXT NOT NULL DEFAULT '',
  ADD COLUMN "footerWidth"                TEXT NOT NULL DEFAULT '',
  ADD COLUMN "footerColumnGap"            TEXT NOT NULL DEFAULT '',
  ADD COLUMN "footerLogoHeight"           TEXT NOT NULL DEFAULT '',
  ADD COLUMN "footerSocialSize"           TEXT NOT NULL DEFAULT '';

ALTER TABLE "NavigationItem"
  ADD COLUMN "megaMenu"    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "megaColumns" INTEGER NOT NULL DEFAULT 3;
