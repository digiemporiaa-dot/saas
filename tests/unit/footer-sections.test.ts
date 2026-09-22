import { describe, it, expect } from 'vitest';
import { BLOCKS, blocksForSurface, blockAllowedOnSurface, parseBlockContent } from '@/lib/cms/blocks';
import { FOOTER_BLOCKS } from '@/lib/cms/footer-blocks';
import { synthesiseFooterSections, FOOTER_ARRANGEMENTS } from '@/lib/cms/footer-defaults';
import { buildSectionStyles, parseSectionDesign, DEFAULT_SECTION_DESIGN } from '@/lib/cms/design';

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

/**
 * A footer paints its own surface, so a row that nobody has restyled has to
 * take it. Painting the page's background instead is what put a white band
 * over every row of a dark footer.
 */
describe('a footer row on the footer’s own surface', () => {
  it('sets no colour of its own while it is left at the default', () => {
    const styles = buildSectionStyles(DEFAULT_SECTION_DESIGN, 'row', null, {
      inheritSurface: true,
    });
    expect(styles.style['--sec-bg']).toBeUndefined();
    expect(styles.style['--sec-text']).toBeUndefined();
    expect(styles.style['--sec-heading-color']).toBeUndefined();
  });

  it('still paints once somebody chooses a preset or a colour', () => {
    const dark = buildSectionStyles(parseSectionDesign({ preset: 'dark' }), 'row', null, {
      inheritSurface: true,
    });
    expect(dark.style['--sec-bg']).toBe('rgb(var(--brand-secondary))');

    const chosen = buildSectionStyles(
      parseSectionDesign({ colors: { background: '#112233' } }),
      'row',
      null,
      { inheritSurface: true },
    );
    expect(chosen.style['--sec-bg']).toBe('#112233');
  });

  it('leaves a page section exactly as it was', () => {
    const page = buildSectionStyles(DEFAULT_SECTION_DESIGN, 'row');
    expect(page.style['--sec-bg']).toBe('rgb(var(--brand-background))');
    expect(page.style['--sec-text']).toBe('rgb(var(--brand-muted))');
  });
});

/**
 * A row whose columns are not all the same kind of thing.
 *
 * A footer whose brand sits beside its menus and its sign-up form is the
 * common arrangement, so those belong inside one row rather than as three
 * rows stacked down the page.
 */
describe('a footer row of mixed columns', () => {
  it('keeps each column’s kind and fills the rest in from the schema', () => {
    const parsed = parseBlockContent('footerColumns', {
      items: [{ kind: 'brand' }, { kind: 'newsletter' }, { kind: 'content' }],
    }) as { items: Array<Record<string, unknown>> };

    expect(parsed.items.map((item) => item.kind)).toEqual(['brand', 'newsletter', 'content']);
    // The brand column's switches default on, the form's panel too.
    expect(parsed.items[0]!.showLogo).toBe(true);
    expect(parsed.items[0]!.showSocials).toBe(true);
    expect(parsed.items[1]!.formPanel).toBe(true);
    // And a column that names no width takes an equal share.
    expect(parsed.items[0]!.width).toBe('');
  });

  it('falls back to an ordinary column when the kind means nothing', () => {
    const parsed = parseBlockContent('footerColumns', {
      items: [{ kind: 'nonsense' }],
    }) as { items: Array<Record<string, unknown>> };

    expect(parsed.items[0]!.kind).toBe('content');
  });
});

describe('the arrangements a footer can start from', () => {
  it('writes the stacked footer as the rows it has always rendered', () => {
    expect(synthesiseFooterSections().map((row) => row.blockType)).toEqual([
      'footerNewsletter',
      'footerBrand',
      'footerMenus',
      'footerBottom',
    ]);
    // The default argument and the named one are the same arrangement.
    expect(synthesiseFooterSections('classic')).toEqual(synthesiseFooterSections());
  });

  it('writes the one-row footer as a row of columns over the legal line', () => {
    const rows = synthesiseFooterSections('columns');
    expect(rows.map((row) => row.blockType)).toEqual(['footerColumns', 'footerBottom']);

    const top = rows[0]!.content as { columns: number; items: Array<{ kind: string }> };
    expect(top.columns).toBe(4);
    expect(top.items.map((item) => item.kind)).toEqual([
      'brand',
      'content',
      'content',
      'newsletter',
    ]);
  });

  it('seeds every arrangement from real blocks', () => {
    for (const [name, arrangement] of Object.entries(FOOTER_ARRANGEMENTS)) {
      for (const seed of arrangement.sections) {
        expect(BLOCKS[seed.blockType], `${name} seeds ${seed.blockType}`).toBeDefined();
        expect(blockAllowedOnSurface(seed.blockType, 'footer')).toBe(true);
      }
    }
  });
});
