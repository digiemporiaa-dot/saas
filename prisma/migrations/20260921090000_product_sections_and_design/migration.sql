-- Product page sections and product-wide design settings.
--
-- Mirrors what the blog already has: reorderable sections built from the same
-- block registry, and a singleton row holding the presentation groups as
-- validated JSON. Sections always belong to a product — there is no global
-- product layout — and a product with no rows falls back to the arrangement in
-- code, so this migration changes nothing about how existing product pages
-- render.

-- CreateEnum
CREATE TYPE "ProductSurface" AS ENUM ('DETAIL', 'SIDEBAR');

-- CreateTable
CREATE TABLE "ProductSection" (
    "id" TEXT NOT NULL,
    "surface" "ProductSurface" NOT NULL,
    "productId" TEXT NOT NULL,
    "blockType" TEXT NOT NULL,
    "name" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "content" JSONB NOT NULL DEFAULT '{}',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductSection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductSection_productId_surface_sortOrder_idx" ON "ProductSection"("productId", "surface", "sortOrder");

-- AddForeignKey
ALTER TABLE "ProductSection" ADD CONSTRAINT "ProductSection_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "ProductSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "cardSettings" JSONB NOT NULL DEFAULT '{}',
    "imageSettings" JSONB NOT NULL DEFAULT '{}',
    "layoutSettings" JSONB NOT NULL DEFAULT '{}',
    "typography" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductSettings_pkey" PRIMARY KEY ("id")
);
