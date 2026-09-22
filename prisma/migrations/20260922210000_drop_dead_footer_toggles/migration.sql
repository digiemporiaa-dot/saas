-- The ten "what the footer shows" switches, removed.
--
-- They were added when the footer was one component with a fixed arrangement
-- and a switch for each of its parts. The footer is a list of blocks now: the
-- brand block decides whether it shows a logo, its description and each
-- contact line, and the bottom row decides the divider, the copyright line,
-- the legal menu and the social icons. Nothing has read these columns since,
-- so an administrator could set one and watch nothing happen.
--
-- The header's four toggles stay — those are still what the header reads.

ALTER TABLE "WebsiteSettings"
  DROP COLUMN IF EXISTS "footerShowLogo",
  DROP COLUMN IF EXISTS "footerShowSiteName",
  DROP COLUMN IF EXISTS "footerShowDescription",
  DROP COLUMN IF EXISTS "footerShowEmail",
  DROP COLUMN IF EXISTS "footerShowPhone",
  DROP COLUMN IF EXISTS "footerShowAddress",
  DROP COLUMN IF EXISTS "footerShowSocials",
  DROP COLUMN IF EXISTS "footerShowLegal",
  DROP COLUMN IF EXISTS "footerShowCopyright",
  DROP COLUMN IF EXISTS "footerShowDivider";
