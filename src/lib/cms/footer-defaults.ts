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
 * The other arrangement a footer is usually in: one row across the top with
 * the brand, two menus and the sign-up form beside each other, then the legal
 * line under a rule.
 *
 * Every value here is an ordinary field of the blocks it seeds, so the first
 * edit changes it the same way any other footer is changed. The menu slugs are
 * the ones a footer menu is usually given; a slug that matches nothing renders
 * an empty column, which is the cue to point it at a real menu.
 */
export const COLUMN_FOOTER_SECTIONS: SectionSeed[] = [
  {
    blockType: 'footerColumns',
    name: 'Top row',
    content: {
      columns: 4,
      showHeadings: true,
      items: [
        { kind: 'brand', width: '1.4fr', showLogo: true, showDescription: true, showSocials: true },
        { kind: 'content', heading: 'Products', menuSlug: 'products' },
        { kind: 'content', heading: 'Support', menuSlug: 'support' },
        { kind: 'newsletter', heading: 'Stay updated', formPanel: false },
      ],
    },
  },
  {
    blockType: 'footerBottom',
    content: { showDivider: true, showCopyright: false, showSocials: false, align: 'left' },
  },
];

export const FOOTER_ARRANGEMENTS = {
  classic: {
    label: 'The footer you have now',
    description:
      'The brand, the menus and the sign-up form stacked down the footer, with the legal line at the bottom.',
    sections: DEFAULT_FOOTER_SECTIONS,
  },
  columns: {
    label: 'Brand, menus and sign-up in one row',
    description:
      'One row across the top — the brand beside two menu columns and the sign-up form — then the legal line under a rule.',
    sections: COLUMN_FOOTER_SECTIONS,
  },
} as const;

export type FooterArrangement = keyof typeof FOOTER_ARRANGEMENTS;

/**
 * The fallback arrangement as renderable sections.
 *
 * Ids are synthetic and stable — nothing persists them — so anchor resolution
 * and React keys behave exactly as they do for stored rows.
 */
export function synthesiseFooterSections(
  arrangement: FooterArrangement = 'classic',
): RenderableSeed[] {
  return FOOTER_ARRANGEMENTS[arrangement].sections.map((seed, index) => ({
    id: `default-footer-${seed.blockType}`,
    blockType: seed.blockType,
    content: { ...(blockDefaults(seed.blockType) as object), ...(seed.content ?? {}) },
    settings: seed.settings ?? {},
    isVisible: seed.isVisible ?? true,
    sortOrder: (index + 1) * 10,
  }));
}
