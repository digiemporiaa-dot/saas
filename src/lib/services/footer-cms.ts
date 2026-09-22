import 'server-only';
import { cache } from 'react';
import { prisma } from '@/lib/db/prisma';
import { synthesiseFooterSections, type FooterArrangement } from '@/lib/cms/footer-defaults';
import type { RenderableSection } from '@/components/cms/section-renderer';

/**
 * One market's footer, in order.
 *
 * A market with no rows falls back to the built-in arrangement rather than
 * rendering an empty footer — the same rule a product page follows, and the
 * reason the builder could be added without touching a live site.
 */
export const getFooterSections = cache(
  async (countryId: string): Promise<RenderableSection[]> => {
    const rows = await prisma.footerSection.findMany({
      where: { countryId },
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

    return rows.length > 0 ? rows : synthesiseFooterSections();
  },
);

/** Admin read: the raw rows, without the code-level fallback. */
export async function getFooterSectionRows(countryId: string) {
  return prisma.footerSection.findMany({
    where: { countryId },
    orderBy: { sortOrder: 'asc' },
  });
}

/**
 * Ensures a market's footer has real rows, copying the built-in arrangement on
 * first use.
 *
 * Called from the admin builder, never from a public page: the first time an
 * administrator opens the footer they get the footer they have been looking
 * at, as editable rows, rather than an empty screen.
 */
export async function materialiseFooter(
  countryId: string,
  arrangement: FooterArrangement = 'classic',
): Promise<void> {
  const existing = await prisma.footerSection.count({ where: { countryId } });
  if (existing > 0) return;

  await prisma.footerSection.createMany({
    data: synthesiseFooterSections(arrangement).map((seed) => ({
      countryId,
      blockType: seed.blockType,
      sortOrder: seed.sortOrder,
      isVisible: seed.isVisible,
      content: seed.content as object,
      settings: seed.settings as object,
    })),
  });
}

/** Whether this market has a footer of its own yet. */
export async function footerIsBuilt(countryId: string): Promise<boolean> {
  return (await prisma.footerSection.count({ where: { countryId } })) > 0;
}
