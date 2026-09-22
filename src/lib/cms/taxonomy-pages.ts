import type { SectionSeed } from './blog-defaults';

/**
 * The page a category or a brand gets the moment it exists.
 *
 * A new category used to be a filter with nowhere to send anyone. This turns
 * it into a real page — its name, the description that was typed on the very
 * same form, and the products that belong to it — at `/categories/<slug>` or
 * `/brands/<slug>`.
 *
 * The products are not written into the page. The grid asks for "this
 * category" and is answered when the page is rendered, so a product added to
 * the category tomorrow appears on it tomorrow, with nothing to regenerate and
 * nothing to keep in sync.
 *
 * What is generated is an ordinary page. It is listed, editable and deletable
 * like any other, it has the whole SEO tab, and sections can be added to it —
 * so this is a starting point somebody can build on, not a fixed template they
 * have to work around.
 */

export type TaxonomyKind = 'category' | 'brand';

export type TaxonomySeed = {
  kind: TaxonomyKind;
  id: string;
  name: string;
  slug: string;
  description: string | null;
  /** The category's image or the brand's logo, shown beside the heading. */
  imageId: string | null;
};

/** The URL prefix each kind lives under. */
export const TAXONOMY_PREFIX: Record<TaxonomyKind, string> = {
  category: 'categories',
  brand: 'brands',
};

export function taxonomyPageSlug(kind: TaxonomyKind, slug: string): string {
  return `${TAXONOMY_PREFIX[kind]}/${slug}`;
}

/** The page title, which is also what the SEO title falls back to. */
export function taxonomyPageTitle(seed: TaxonomySeed): string {
  return seed.name;
}

/**
 * The description used for search results.
 *
 * The typed description where there is one, trimmed to a length a search
 * engine will actually show, and a plain sentence where there is not — an
 * empty meta description is worse than an ordinary one.
 */
export function taxonomyPageDescription(seed: TaxonomySeed): string {
  const typed = (seed.description ?? '').trim().replace(/\s+/g, ' ');
  if (typed) return typed.length > 160 ? `${typed.slice(0, 157).trimEnd()}…` : typed;
  // Built from the name alone, so it reads correctly whatever the name is —
  // "our business plans plans" is the kind of thing a template produces once
  // and nobody notices until it is in a search result.
  return seed.kind === 'brand'
    ? `Browse everything from ${seed.name}, with features and pricing.`
    : `Browse everything in ${seed.name}, with features and pricing.`;
}

/**
 * The page as sections: the heading and description, then the products.
 *
 * Both are ordinary blocks with ordinary settings, so every control in the
 * builder works on them from the first minute.
 */
export function taxonomyPageSections(seed: TaxonomySeed): SectionSeed[] {
  const description = (seed.description ?? '').trim();

  return [
    {
      blockType: 'hero',
      name: seed.name,
      content: {
        layout: seed.imageId ? 'contentImage' : 'content',
        heading: seed.name,
        description,
        imageId: seed.imageId,
        imageAlt: seed.name,
      },
    },
    {
      blockType: 'productGrid',
      name: 'Products',
      content: {
        heading: seed.kind === 'brand' ? `${seed.name} plans` : seed.name,
        source: seed.kind,
        categoryId: seed.kind === 'category' ? seed.id : null,
        brandId: seed.kind === 'brand' ? seed.id : null,
        // The most the block allows. A grid that quietly stopped at six would
        // be the same "where are my products?" problem in a new place.
        limit: 24,
        columns: 3,
      },
    },
  ];
}
