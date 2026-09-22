import { describe, it, expect } from 'vitest';
import { BLOCKS, blocksForSurface, blockAllowedOnSurface, parseBlockContent } from '@/lib/cms/blocks';
import { FOOTER_BLOCKS } from '@/lib/cms/footer-blocks';
import { synthesiseFooterSections } from '@/lib/cms/footer-defaults';

/**
 * The footer, built the way a page is.
 *
 * Two rules hold it together: a footer offers every page section as well as
 * its own, and a market nobody has arranged still renders the footer it
 * already had.
 */

describe('the footer surface', () => {
  it('offers every page block as well as the footer ones', () => {
    const pageBlocks = blocksForSurface('page').map((block) => block.type);
    const footerBlocks = blocksForSurface('footer').map((block) => block.type);

    for (const type of pageBlocks) {
      expect(footerBlocks, `a footer should offer ${type}`).toContain(type);
    }
    // And its own anatomy, which pages do not get.
    expect(footerBlocks).toContain('footerBrand');
    expect(footerBlocks).toContain('footerColumns');
    expect(pageBlocks).not.toContain('footerBrand');
  });

  it('agrees with itself about what may be added there', () => {
    const offered = new Set(blocksForSurface('footer').map((block) => block.type));
    for (const type of Object.keys(BLOCKS)) {
      expect(blockAllowedOnSurface(type, 'footer'), `${type} in a footer`).toBe(offered.has(type));
    }
    expect(blockAllowedOnSurface('nonsense', 'footer')).toBe(false);
  });

  it('keeps the footer blocks out of a page', () => {
    for (const type of Object.keys(FOOTER_BLOCKS)) {
      expect(blockAllowedOnSurface(type, 'page'), type).toBe(false);
    }
  });

  it('allows only one bottom row', () => {
    // Two copyright lines is never an arrangement anybody wanted.
    expect(FOOTER_BLOCKS.footerBottom.singleton).toBe(true);
    // Everything else stacks: two column rows is an ordinary footer.
    expect(FOOTER_BLOCKS.footerColumns.singleton).toBeFalsy();
    expect(FOOTER_BLOCKS.footerMenus.singleton).toBeFalsy();
  });

  it('parses each footer block to usable defaults', () => {
    for (const type of Object.keys(FOOTER_BLOCKS)) {
      expect(parseBlockContent(type, {}), type).toBeTypeOf('object');
    }

    // A corrupt payload still renders rather than throwing.
    const columns = parseBlockContent('footerColumns', {
      columns: 99,
      items: 'nonsense',
    }) as Record<string, unknown>;
    expect(columns.columns).toBe(4);
    expect(columns.items).toEqual([]);
  });
});

describe('the built-in footer', () => {
  it('is the footer as it was, expressed as rows', () => {
    const rows = synthesiseFooterSections().map((row) => row.blockType);
    expect(rows).toEqual(['footerNewsletter', 'footerBrand', 'footerMenus', 'footerBottom']);
  });

  it('shows what the old footer showed, by default', () => {
    const brand = parseBlockContent('footerBrand', {}) as Record<string, unknown>;
    expect(brand.showLogo).toBe(true);
    expect(brand.showEmail).toBe(true);
    expect(brand.showPhone).toBe(true);
    expect(brand.showAddress).toBe(true);

    const bottom = parseBlockContent('footerBottom', {}) as Record<string, unknown>;
    expect(bottom.showDivider).toBe(true);
    expect(bottom.showCopyright).toBe(true);
    expect(bottom.showSocials).toBe(true);

    // One column per menu, which is what the footer did before it was a block.
    expect((parseBlockContent('footerMenus', {}) as Record<string, unknown>).columns).toBe(0);
  });

  it('gives every fallback row a stable id, order and parsed content', () => {
    const rows = synthesiseFooterSections();
    expect(new Set(rows.map((row) => row.id)).size).toBe(rows.length);
    expect(rows.map((row) => row.sortOrder)).toEqual([10, 20, 30, 40]);
    for (const row of rows) {
      expect(row.isVisible).toBe(true);
      expect(row.content).toBeTypeOf('object');
    }
    // Synthesised twice, identical — nothing about it is time or random.
    expect(synthesiseFooterSections()).toEqual(rows);
  });
});
