-- What a product calls its storage and users rows. Blank keeps "Storage" and
-- "Users", so every product reads exactly as it did.
ALTER TABLE "Product"
ADD COLUMN "storageLabel" TEXT,
ADD COLUMN "usersLabel" TEXT;
