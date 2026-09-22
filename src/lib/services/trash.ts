import 'server-only';
import { prisma } from '@/lib/db/prisma';
import { originalSlug } from '@/lib/utils/slug';
import type { CountryContext } from '@/lib/country/types';

/**
 * Everything that has been deleted and can still be got back.
 *
 * Deleting in this admin has never meant destroying: a page, an article, a
 * product, a category and a brand are all marked deleted and parked under a
 * freed slug. What was missing was somewhere to see them, so "deleted" felt
 * final even though nothing had gone. This is that place.
 *
 * The URL each one had is shown rather than the mangled one it is parked
 * under, because that is what somebody looking for it remembers.
 */

export type TrashKind = 'page' | 'post' | 'productCategory' | 'brand';

export type TrashedItem = {
  kind: TrashKind;
  id: string;
  title: string;
  /** The URL it was known by, with the retirement suffix stripped. */
  path: string | null;
  deletedAt: string | null;
  /** What restoring it brings back with it, or what deleting it costs. */
  note: string | null;
  /** False where something still points at it, so it cannot be destroyed. */
  canPurge: boolean;
};

const KIND_LABELS: Record<TrashKind, string> = {
  page: 'Page',
  post: 'Article',
  productCategory: 'Product category',
  brand: 'Brand',
};

export function trashKindLabel(kind: TrashKind): string {
  return KIND_LABELS[kind];
}

function iso(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function countNote(counts: Array<[number, string, string]>): string | null {
  const parts = counts
    .filter(([count]) => count > 0)
    .map(([count, one, many]) => `${count} ${count === 1 ? one : many}`);
  return parts.length > 0 ? parts.join(', ') : null;
}

/**
 * The bin for one market.
 *
 * Pages and articles belong to a market, so only that market's are listed —
 * the same rule their own screens follow. Categories and brands are shared by
 * every market and are listed wherever the bin is opened, because a retired
 * one belongs to nobody by definition.
 */
export async function listTrash(country: CountryContext): Promise<TrashedItem[]> {
  const [pages, posts, categories, brands] = await Promise.all([
    prisma.page.findMany({
      where: { deletedAt: { not: null }, countryId: country.id },
      orderBy: { deletedAt: 'desc' },
      take: 200,
      select: {
        id: true,
        title: true,
        slug: true,
        deletedAt: true,
        _count: { select: { sections: true, leads: true } },
      },
    }),
    prisma.blogPost.findMany({
      where: { deletedAt: { not: null }, countryId: country.id },
      orderBy: { deletedAt: 'desc' },
      take: 200,
      select: {
        id: true,
        title: true,
        slug: true,
        deletedAt: true,
        _count: { select: { sections: true, leads: true } },
      },
    }),
    prisma.productCategory.findMany({
      where: { deletedAt: { not: null } },
      orderBy: { deletedAt: 'desc' },
      take: 200,
      select: {
        id: true,
        name: true,
        slug: true,
        deletedAt: true,
        _count: { select: { products: true } },
      },
    }),
    prisma.brand.findMany({
      where: { deletedAt: { not: null } },
      orderBy: { deletedAt: 'desc' },
      take: 200,
      select: {
        id: true,
        name: true,
        slug: true,
        deletedAt: true,
        _count: { select: { products: true } },
      },
    }),
  ]);

  const items: TrashedItem[] = [
    ...pages.map((row) => ({
      kind: 'page' as const,
      id: row.id,
      title: row.title,
      path: `/${originalSlug(row.slug)}`,
      deletedAt: iso(row.deletedAt),
      note: countNote([
        [row._count.sections, 'section', 'sections'],
        [row._count.leads, 'lead', 'leads'],
      ]),
      // A page credited with a lead is what that lead's attribution points at.
      canPurge: row._count.leads === 0,
    })),
    ...posts.map((row) => ({
      kind: 'post' as const,
      id: row.id,
      title: row.title,
      path: `/blog/${originalSlug(row.slug)}`,
      deletedAt: iso(row.deletedAt),
      note: countNote([
        [row._count.sections, 'section', 'sections'],
        [row._count.leads, 'lead', 'leads'],
      ]),
      canPurge: row._count.leads === 0,
    })),
    ...categories.map((row) => ({
      kind: 'productCategory' as const,
      id: row.id,
      title: row.name,
      path: `/categories/${originalSlug(row.slug)}`,
      deletedAt: iso(row.deletedAt),
      note: countNote([[row._count.products, 'product', 'products']]),
      canPurge: true,
    })),
    ...brands.map((row) => ({
      kind: 'brand' as const,
      id: row.id,
      title: row.name,
      path: `/brands/${originalSlug(row.slug)}`,
      deletedAt: iso(row.deletedAt),
      note: countNote([[row._count.products, 'product', 'products']]),
      canPurge: true,
    })),
  ];

  // Most recently deleted first, whatever kind it is: somebody opening the bin
  // is almost always looking for what they just removed.
  return items.sort((a, b) => (b.deletedAt ?? '').localeCompare(a.deletedAt ?? ''));
}
