import { blockDefaults } from './blocks';
import type { SectionSeed } from './blog-defaults';
import type { RenderableSeed } from './product-defaults';

/**
 * The footer every market has before anyone has built one.
 *
 * This is the footer exactly as it was: the brand block with its contact
 * details, the newsletter, the menus as columns, and the bottom row. A market
 * with no rows renders precisely this, which is why adding the builder changed
 * nothing about any live footer.
 *
 * It is a starting point, not a hardcoded layout. The moment an administrator
 * opens the builder these become real rows belonging to that market, and
 * everything about them is editable from then on.
 */
export const DEFAULT_FOOTER_SECTIONS: SectionSeed[] = [
  { blockType: 'footerNewsletter' },
  { blockType: 'footerBrand' },
  { blockType: 'footerMenus' },
  { blockType: 'footerBottom' },
];

/**
 * The fallback arrangement as renderable sections.
 *
 * Ids are synthetic and stable — nothing persists them — so anchor resolution
 * and React keys behave exactly as they do for stored rows.
 */
export function synthesiseFooterSections(): RenderableSeed[] {
  return DEFAULT_FOOTER_SECTIONS.map((seed, index) => ({
    id: `default-footer-${seed.blockType}`,
    blockType: seed.blockType,
    content: { ...(blockDefaults(seed.blockType) as object), ...(seed.content ?? {}) },
    settings: seed.settings ?? {},
    isVisible: seed.isVisible ?? true,
    sortOrder: (index + 1) * 10,
  }));
}
