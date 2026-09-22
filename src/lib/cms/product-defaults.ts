import type { ProductSurface } from '@prisma/client';
import { blockDefaults } from './blocks';
import type { SectionSeed } from './blog-defaults';

/**
 * The arrangement a product page falls back to before anyone has built one.
 *
 * This is the page every product has today, expressed as sections: header,
 * images, description, features, specifications and the rail of other plans,
 * with the price box in the sidebar. A product with no rows renders exactly
 * this, which is why adding the builder changed nothing about any live
 * product page.
 *
 * It is a starting point, not a hardcoded layout. The moment an administrator
 * opens the builder for a product, these become real rows belonging to that
 * product, and everything about them is editable from then on.
 */

export const DEFAULT_DETAIL_SECTIONS: SectionSeed[] = [
  /*
   * The opening pair: the product's mark on the left, its category, name and
   * summary beside it. A square 250px box, and `contain`, because the mark is
   * usually a logo and a cropped logo is a damaged one.
   */
  {
    blockType: 'productHeader',
    content: {
      showImage: true,
      imagePosition: 'left',
      imageWidth: '250px',
      imageRatio: '1/1',
      imageFit: 'contain',
      imageBorder: true,
    },
  },
  /*
   * The header now carries the main image, so this section is the gallery
   * alone — otherwise the same picture would appear twice, once under the
   * other.
   */
  { blockType: 'productMedia', content: { showMainImage: false } },
  { blockType: 'productDescription' },
  { blockType: 'productFeatures' },
  { blockType: 'productRelated' },
];

export const DEFAULT_SIDEBAR_SECTIONS: SectionSeed[] = [{ blockType: 'productPriceBox' }];

export function defaultSectionsFor(surface: ProductSurface): SectionSeed[] {
  return surface === 'SIDEBAR' ? DEFAULT_SIDEBAR_SECTIONS : DEFAULT_DETAIL_SECTIONS;
}

export type RenderableSeed = {
  id: string;
  blockType: string;
  content: unknown;
  settings: unknown;
  isVisible: boolean;
  sortOrder: number;
};

/**
 * The fallback arrangement as renderable sections.
 *
 * Ids are synthetic and stable per surface — nothing persists them — so anchor
 * resolution and React keys behave exactly as they do for stored rows.
 */
export function synthesiseProductSections(surface: ProductSurface): RenderableSeed[] {
  return defaultSectionsFor(surface).map((seed, index) => ({
    id: `default-${surface.toLowerCase()}-${seed.blockType}`,
    blockType: seed.blockType,
    content: { ...(blockDefaults(seed.blockType) as object), ...(seed.content ?? {}) },
    settings: seed.settings ?? {},
    isVisible: seed.isVisible ?? true,
    sortOrder: (index + 1) * 10,
  }));
}
