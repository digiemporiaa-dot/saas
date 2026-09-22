import { describe, it, expect } from 'vitest';
import {
  BLOCKS,
  blocksForSurface,
  blockAllowedOnSurface,
  parseBlockContent,
} from '@/lib/cms/blocks';
import { PRODUCT_BLOCKS } from '@/lib/cms/product-blocks';
import { synthesiseProductSections } from '@/lib/cms/product-defaults';
import {
  DEFAULT_PRODUCT_SETTINGS,
  parseProductImage,
  parseProductCard,
  parseProductLayout,
  productStyleVars,
} from '@/lib/cms/product-settings';

/**
 * What a product page is allowed to be built from, and what it falls back to.
 *
 * These are the two rules the product builder rests on: a product page offers
 * every page section as well as its own, and a product nobody has arranged
 * still renders a complete page.
 */

describe('product surfaces', () => {
  it('offers every page block on a product page, as well as the product ones', () => {
    const pageBlocks = blocksForSurface('page').map((block) => block.type);
    const detailBlocks = blocksForSurface('productDetail').map((block) => block.type);

    for (const type of pageBlocks) {
      expect(detailBlocks, `product page should offer ${type}`).toContain(type);
    }
    // And the product's own anatomy, which pages do not get.
    expect(detailBlocks).toContain('productHeader');
    expect(detailBlocks).toContain('productMedia');
    expect(pageBlocks).not.toContain('productHeader');
  });

  it('keeps the sidebar to blocks written for it', () => {
    const sidebar = blocksForSurface('productSidebar').map((block) => block.type);
    expect(sidebar).toContain('productPriceBox');
    // A full-width hero in a narrow column is not a layout anyone wants.
    expect(sidebar).not.toContain('hero');
  });

  it('agrees with itself about what may be added where', () => {
    for (const surface of ['productDetail', 'productSidebar'] as const) {
      const offered = new Set(blocksForSurface(surface).map((block) => block.type));
      for (const type of Object.keys(BLOCKS)) {
        expect(blockAllowedOnSurface(type, surface), `${type} on ${surface}`).toBe(
          offered.has(type),
        );
      }
    }
    expect(blockAllowedOnSurface('nonsense', 'productDetail')).toBe(false);
  });

  it('makes every product block a singleton — one title, one price box', () => {
    for (const [type, block] of Object.entries(PRODUCT_BLOCKS)) {
      expect(block.singleton, `${type} should be a singleton`).toBe(true);
    }
  });

  it('parses each product block to usable defaults', () => {
    for (const type of Object.keys(PRODUCT_BLOCKS)) {
      const content = parseBlockContent(type, {}) as Record<string, unknown>;
      expect(content, type).toBeTypeOf('object');
    }
    // A corrupt payload still renders rather than throwing.
    const media = parseBlockContent('productMedia', {
      showMainImage: 'nonsense',
      galleryColumns: 99,
    }) as Record<string, unknown>;
    expect(typeof media.showMainImage).toBe('boolean');
    expect(media.galleryColumns).toBe(3);
  });
});

describe('the built-in arrangement', () => {
  it('renders a complete page for a product nobody has arranged', () => {
    const detail = synthesiseProductSections('DETAIL').map((section) => section.blockType);
    expect(detail).toEqual([
      'productHeader',
      'productMedia',
      'productDescription',
      'productFeatures',
      'productRelated',
    ]);

    const sidebar = synthesiseProductSections('SIDEBAR').map((section) => section.blockType);
    expect(sidebar).toEqual(['productPriceBox']);
  });

  it('opens with the product mark beside its name, at the size the design asks for', () => {
    const [header, media] = synthesiseProductSections('DETAIL');
    const headerContent = header.content as Record<string, unknown>;

    expect(headerContent.showImage).toBe(true);
    expect(headerContent.imagePosition).toBe('left');
    expect(headerContent.imageWidth).toBe('250px');
    expect(headerContent.imageRatio).toBe('1/1');
    // A logo cropped to fill a square is a damaged logo.
    expect(headerContent.imageFit).toBe('contain');

    // …and the images section below it does not repeat that same image.
    expect((media.content as Record<string, unknown>).showMainImage).toBe(false);
  });

  it('gives every fallback section a stable id, order and parsed content', () => {
    const sections = synthesiseProductSections('DETAIL');
    expect(new Set(sections.map((s) => s.id)).size).toBe(sections.length);
    expect(sections.map((s) => s.sortOrder)).toEqual([10, 20, 30, 40, 50]);
    for (const section of sections) {
      expect(section.isVisible).toBe(true);
      expect(section.content).toBeTypeOf('object');
    }
    // Synthesised twice, identical — nothing about it is time or random.
    expect(synthesiseProductSections('DETAIL')).toEqual(sections);
  });
});

describe('product design settings', () => {
  it('writes no colour or size variable until one is set', () => {
    const vars = productStyleVars(DEFAULT_PRODUCT_SETTINGS);
    // Only the values that always have a meaning are emitted; an untouched
    // site must not have its card repainted by a variable it never set.
    expect(vars['--product-card-bg']).toBeUndefined();
    expect(vars['--product-card-image-width']).toBeUndefined();
    expect(vars['--product-title-size']).toBeUndefined();
    expect(vars['--product-card-shadow']).toBe('0 1px 2px rgb(0 0 0 / 0.05)');
  });

  it('turns image sizes into variables the card and the page read', () => {
    const image = parseProductImage({
      cardWidth: '120px',
      cardRatio: '1/1',
      cardFit: 'contain',
      mainMaxWidth: '640px',
      galleryColumns: 4,
    });
    const vars = productStyleVars({ ...DEFAULT_PRODUCT_SETTINGS, image });

    expect(vars['--product-card-image-width']).toBe('120px');
    expect(vars['--product-card-image-ratio']).toBe('1 / 1');
    expect(vars['--product-card-image-fit']).toBe('contain');
    expect(vars['--product-main-image-width']).toBe('640px');
    expect(vars['--product-gallery-columns']).toBe('4');
  });

  it('falls back to the defaults rather than throwing on a corrupt record', () => {
    expect(parseProductCard('not an object')).toEqual(DEFAULT_PRODUCT_SETTINGS.card);
    expect(parseProductImage(null)).toEqual(DEFAULT_PRODUCT_SETTINGS.image);
    expect(parseProductLayout({ sidebarWidth: 42, mobileSidebar: 'sideways' })).toMatchObject({
      mobileSidebar: 'above',
    });
  });

  it('keeps a hex colour and drops anything that is not one', () => {
    expect(parseProductLayout({ priceColor: '#0061ff' }).priceColor).toBe('#0061FF');
    expect(parseProductLayout({ priceColor: 'red' }).priceColor).toBe('');
  });
});
