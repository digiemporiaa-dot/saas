-- Showing and hiding the individual parts of the header and the footer.
--
-- Every toggle defaults to true, which is exactly what each renders today, so
-- nothing changes until somebody switches a part off. The contact colour
-- defaults to "" — leave it as it is — like every other colour on that screen.

ALTER TABLE "WebsiteSettings"
  ADD COLUMN "headerShowLogo"        BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "headerShowSiteName"    BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "headerShowMenu"        BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "headerShowMarkets"     BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "footerContactColor"    TEXT    NOT NULL DEFAULT '',
  ADD COLUMN "footerShowLogo"        BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "footerShowSiteName"    BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "footerShowDescription" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "footerShowEmail"       BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "footerShowPhone"       BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "footerShowAddress"     BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "footerShowSocials"     BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "footerShowLegal"       BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "footerShowCopyright"   BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "footerShowDivider"     BOOLEAN NOT NULL DEFAULT true;
