import 'server-only';
import { prisma } from '@/lib/db/prisma';
import { countryPath } from '@/lib/country/routing';
import { publishedPageWhere } from './pages';
import type { CountryContext } from '@/lib/country/types';
import { blockDefaults } from '@/lib/cms/blocks';
import {
  taxonomyPageSections,
  taxonomyPageSlug,
  taxonomyPageDescription,
  type TaxonomyKind,
  type TaxonomySeed,
} from '@/lib/cms/taxonomy-pages';

/**
 * Giving a category or a brand its page.
 *
 * Creating one is deliberately idempotent and never destructive: if a page
 * already sits at that URL in that market it is left exactly as it is, whoever
 * built it and whatever is on it now. Generating is a one-time head start, not
 * a template that reaches back in and overwrites somebody's work every time
 * the category is renamed.
 */

export type TaxonomyPageResult = {
  created: boolean;
  pageId: string;
  slug: string;
};

/**
 * The page for one category or brand in one market, created if it is missing.
 *
 * Published, because a category page with no products on it is a draft nobody
 * asked for and a category page with its products is the thing that was just
 * asked for. It is an ordinary page from that moment on — unpublish it, edit
 * it, delete it.
 */
export async function ensureTaxonomyPage(
  seed: TaxonomySeed,
  countryId: string,
  userId: string | null,
): Promise<TaxonomyPageResult> {
  const slug = taxonomyPageSlug(seed.kind, seed.slug);

  const existing = await prisma.page.findUnique({
    where: { countryId_slug: { countryId, slug } },
    select: { id: true, deletedAt: true },
  });
  if (existing) {
    return { created: false, pageId: existing.id, slug };
  }

  const page = await prisma.page.create({
    data: {
      countryId,
      title: seed.name,
      slug,
      status: 'PUBLISHED',
      publishedAt: new Date(),
      seoTitle: seed.name,
      seoDescription: taxonomyPageDescription(seed),
      createdById: userId,
      updatedById: userId,
      sections: {
        create: taxonomyPageSections(seed).map((section, index) => ({
          blockType: section.blockType,
          name: section.name ?? null,
          sortOrder: (index + 1) * 10,
          isVisible: section.isVisible ?? true,
          content: {
            ...(blockDefaults(section.blockType) as object),
            ...(section.content ?? {}),
          } as object,
          settings: (section.settings ?? {}) as object,
        })),
      },
    },
    select: { id: true },
  });

  return { created: true, pageId: page.id, slug };
}

/** Whether each of these taxonomy entries already has a page in this market. */
export async function taxonomyPageMap(
  kind: TaxonomyKind,
  slugs: string[],
  countryId: string,
): Promise<Map<string, string>> {
  if (slugs.length === 0) return new Map();

  const pages = await prisma.page.findMany({
    where: {
      countryId,
      deletedAt: null,
      slug: { in: slugs.map((slug) => taxonomyPageSlug(kind, slug)) },
    },
    select: { id: true, slug: true },
  });

  return new Map(pages.map((page) => [page.slug, page.id]));
}

/**
 * Where a product's category and brand actually link to, in this market.
 *
 * Only a page that is published here produces a link. A category whose page
 * was never generated, or was unpublished or deleted, renders as plain text
 * rather than as a link to a 404 — the name is still worth showing, the dead
 * link is not.
 */
export async function taxonomyHrefs(
  country: Pick<CountryContext, 'id' | 'slug'>,
  taxonomy: { categorySlug?: string | null; brandSlug?: string | null },
): Promise<{ categoryHref: string | null; brandHref: string | null }> {
  const wanted = new Map<string, 'category' | 'brand'>();
  if (taxonomy.categorySlug) {
    wanted.set(taxonomyPageSlug('category', taxonomy.categorySlug), 'category');
  }
  if (taxonomy.brandSlug) {
    wanted.set(taxonomyPageSlug('brand', taxonomy.brandSlug), 'brand');
  }
  if (wanted.size === 0) return { categoryHref: null, brandHref: null };

  const live = await prisma.page.findMany({
    where: { ...publishedPageWhere(), countryId: country.id, slug: { in: [...wanted.keys()] } },
    select: { slug: true },
  });

  const href = (kind: 'category' | 'brand') => {
    const match = live.find((page) => wanted.get(page.slug) === kind);
    return match ? countryPath(country, match.slug) : null;
  };

  return { categoryHref: href('category'), brandHref: href('brand') };
}
