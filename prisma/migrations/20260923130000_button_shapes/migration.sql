-- A corner shape per button. Blank follows the shared button radius.
ALTER TABLE "WebsiteSettings"
ADD COLUMN "buttonPrimaryRadius" TEXT NOT NULL DEFAULT '',
ADD COLUMN "buttonSecondaryRadius" TEXT NOT NULL DEFAULT '';
