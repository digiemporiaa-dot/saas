import 'server-only';
import { cache } from 'react';
import type { ProductSurface } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import {
  parseProductCard,
  parseProductImage,
  parseProductLayout,
  parseProductTypography,
  type ResolvedProductSettings,
  DEFAULT_PRODUCT_SETTINGS,
} from '@/lib/cms/product-settings';
import { synthesiseProductSections } from '@/lib/cms/product-defaults';

/**
 * Product CMS reads.
 *
 * A product's structure lives in `ProductSection` rows and the catalogue's
 * presentation in the `ProductSettings` singleton. Both have a code-level
 * fallback, so a site where nobody has opened the product builder still renders
 * complete product pages — and the first save is an ordinary edit rather than a
 * migration.
 */

export type RenderableSection = {
  id: string;
  blockType: string;
  content: unknown;
  settings: unknown;
  isVisible: boolean;
  sortOrder: number;
};

/**
 * The catalogue's design settings, already parsed.
 *
 * Reads never write: a missing singleton resolves to the defaults rather than
 * creating a row, so rendering a public page cannot touch the database beyond
 * the read it needs.
 */
export const getProductSettings = cache(async (): Promise<ResolvedProductSettings> => {
  const row = await prisma.productSettings.findUnique({ where: { id: 'singleton' } });
  if (!row) return DEFAULT_PRODUCT_SETTINGS;

  return {
    card: parseProductCard(row.cardSettings),
    image: parseProductImage(row.imageSettings),
    layout: parseProductLayout(row.layoutSettings),
    typography: parseProductTypography(row.typography),
  };
});

/**
 * One product surface's sections, in order.
 *
 * Sections always belong to a product — there is no global product layout — so
 * a product with none falls back to the built-in arrangement rather than
 * rendering a blank page.
 */
export const getProductSections = cache(
  async (productId: string, surface: ProductSurface): Promise<RenderableSection[]> => {
    const rows = await prisma.productSection.findMany({
      where: { productId, surface },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        blockType: true,
        content: true,
        settings: true,
        isVisible: true,
        sortOrder: true,
      },
    });

    return rows.length > 0 ? rows : synthesiseProductSections(surface);
  },
);

/** Admin read: the raw rows for one surface, without the code-level fallback. */
export async function getProductSectionRows(productId: string, surface: ProductSurface) {
  return prisma.productSection.findMany({
    where: { productId, surface },
    orderBy: { sortOrder: 'asc' },
  });
}

/**
 * Ensures a product's surface has real rows, copying the built-in arrangement
 * on first use.
 *
 * Called from the admin builder, never from a public page: the first time an
 * administrator opens a product's layout they get the arrangement they have
 * been looking at, as editable rows, rather than an empty screen.
 */
export async function materialiseProductSurface(
  productId: string,
  surface: ProductSurface,
): Promise<void> {
  const existing = await prisma.productSection.count({ where: { productId, surface } });
  if (existing > 0) return;

  const seeds = synthesiseProductSections(surface);
  await prisma.productSection.createMany({
    data: seeds.map((seed) => ({
      productId,
      surface,
      blockType: seed.blockType,
      sortOrder: seed.sortOrder,
      isVisible: seed.isVisible,
      content: seed.content as object,
      settings: seed.settings as object,
    })),
  });
}

/** Whether a product has been given a layout of its own, per surface. */
export async function productLayoutState(
  productId: string,
): Promise<{ detail: boolean; sidebar: boolean }> {
  const rows = await prisma.productSection.groupBy({
    by: ['surface'],
    where: { productId },
    _count: { _all: true },
  });
  const has = (surface: ProductSurface) =>
    rows.some((row) => row.surface === surface && row._count._all > 0);
  return { detail: has('DETAIL'), sidebar: has('SIDEBAR') };
}
