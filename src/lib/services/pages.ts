import 'server-only';
import { cache } from 'react';
import { prisma } from '@/lib/db/prisma';
import type { Page, PageSection } from '@prisma/client';

export type PageWithSections = Page & { sections: PageSection[] };

/**
 * Only content that is genuinely live is ever returned to a public request.
 *
 * This must be a function: a module-level constant would freeze `new Date()` at
 * import time, so anything published after the server started would stay hidden
 * until the process restarted.
 */
export function publishedPageWhere() {
  return {
    deletedAt: null,
    status: 'PUBLISHED' as const,
    OR: [{ publishedAt: null }, { publishedAt: { lte: new Date() } }],
  };
}

/**
 * A published page in one market.
 *
 * The market is part of the lookup, never inferred: `/dropbox-business` and
 * `/ae/dropbox-business` are two independent pages that happen to share a slug,
 * and a missing UAE page must 404 rather than silently fall back to India's.
 */
export const getPublishedPage = cache(
  async (countryId: string, slug: string): Promise<PageWithSections | null> => {
    return prisma.page.findFirst({
      where: { ...publishedPageWhere(), countryId, slug },
      include: { sections: { orderBy: { sortOrder: 'asc' } } },
    });
  },
);

/** Preview bypasses the publish gate. Callers must check authorisation first. */
export const getPageForPreview = cache(async (id: string): Promise<PageWithSections | null> => {
  return prisma.page.findFirst({
    where: { id, deletedAt: null },
    include: { sections: { orderBy: { sortOrder: 'asc' } } },
  });
});

/**
 * Whether an equivalent page is live in another market.
 *
 * Used by the market switcher and by hreflang, both of which must only ever
 * point at content that actually exists and is published.
 */
export const findPublishedPageCountries = cache(
  async (slug: string): Promise<string[]> => {
    const rows = await prisma.page.findMany({
      where: { ...publishedPageWhere(), slug, noIndex: false },
      select: { countryId: true },
    });
    return rows.map((row) => row.countryId);
  },
);

/** Markets where this page exists and is published, ignoring robots directives. */
export const findLivePageCountries = cache(async (slug: string): Promise<string[]> => {
  const rows = await prisma.page.findMany({
    where: { ...publishedPageWhere(), slug },
    select: { countryId: true },
  });
  return rows.map((row) => row.countryId);
});
