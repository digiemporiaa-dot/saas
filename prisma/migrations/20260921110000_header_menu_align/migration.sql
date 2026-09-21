-- Where the header's main menu sits.
--
-- Defaults to "left", which is exactly where the menu has always been, so an
-- existing site is unchanged until an administrator picks something else.

ALTER TABLE "WebsiteSettings" ADD COLUMN "headerMenuAlign" TEXT NOT NULL DEFAULT 'left';
