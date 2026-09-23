-- Primary and secondary button design. Blank keeps the current look.
ALTER TABLE "WebsiteSettings"
ADD COLUMN "buttonBorderWidth" TEXT NOT NULL DEFAULT '',
ADD COLUMN "buttonPrimaryBg" TEXT NOT NULL DEFAULT '',
ADD COLUMN "buttonPrimaryText" TEXT NOT NULL DEFAULT '',
ADD COLUMN "buttonPrimaryBorder" TEXT NOT NULL DEFAULT '',
ADD COLUMN "buttonPrimaryHoverBg" TEXT NOT NULL DEFAULT '',
ADD COLUMN "buttonPrimaryHoverText" TEXT NOT NULL DEFAULT '',
ADD COLUMN "buttonPrimaryHoverBorder" TEXT NOT NULL DEFAULT '',
ADD COLUMN "buttonSecondaryBg" TEXT NOT NULL DEFAULT '',
ADD COLUMN "buttonSecondaryText" TEXT NOT NULL DEFAULT '',
ADD COLUMN "buttonSecondaryBorder" TEXT NOT NULL DEFAULT '',
ADD COLUMN "buttonSecondaryHoverBg" TEXT NOT NULL DEFAULT '',
ADD COLUMN "buttonSecondaryHoverText" TEXT NOT NULL DEFAULT '',
ADD COLUMN "buttonSecondaryHoverBorder" TEXT NOT NULL DEFAULT '';
