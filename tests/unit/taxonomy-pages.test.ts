import { describe, it, expect } from 'vitest';
import { parseBlockContent, blockAllowedOnSurface } from '@/lib/cms/blocks';
import {
  taxonomyPageSlug,
  taxonomyPageTitle,
  taxonomyPageDescription,
  taxonomyPageSections,
  type TaxonomySeed,
} from '@/lib/cms/taxonomy-pages';

/**
 * The page a category or brand is given the moment it exists.
 *
 * Two things have to hold for it to be worth generating: it has to be a page
 * somebody would have built by hand, and its product list has to be a question
 * rather than an answer — so a product added to the category tomorrow appears
 * on it without anything being regenerated.
 */

const seed = (over: Partial<TaxonomySeed> = {}): TaxonomySeed => ({
  kind: 'category',
  id: 'cat_1',
  name: 'Business Plans',
  slug: 'business-plans',
  description: 'Everything a growing team needs, from storage to admin controls.',
  imageId: null,
  ...over,
});

describe('where the page lives', () => {
  it('puts each kind under its own prefix', () => {
    expect(taxonomyPageSlug('category', 'business-plans')).toBe('categories/business-plans');
    expect(taxonomyPageSlug('brand', 'dropbox')).toBe('brands/dropbox');
  });

  it('is titled after the thing itself', () => {
    expect(taxonomyPageTitle(seed())).toBe('Business Plans');
  });
});

describe('what search engines are told', () => {
  it('uses the description that was typed on the same form', () => {
    expect(taxonomyPageDescription(seed())).toBe(
      'Everything a growing team needs, from storage to admin controls.',
    );
  });

  it('collapses the whitespace a textarea leaves behind', () => {
    expect(taxonomyPageDescription(seed({ description: '  Storage\n\n  and sharing.  ' }))).toBe(
      'Storage and sharing.',
    );
  });

  it('trims to a length a search result will actually show', () => {
    const long = taxonomyPageDescription(seed({ description: 'word '.repeat(80) }));
    expect(long.length).toBeLessThanOrEqual(160);
    expect(long.endsWith('…')).toBe(true);
  });

  it('writes a sentence rather than nothing when no description was given', () => {
    // An empty meta description is worse than an ordinary one.
    expect(taxonomyPageDescription(seed({ description: null }))).toBe(
      'Browse everything in Business Plans, with features and pricing.',
    );
    expect(taxonomyPageDescription(seed({ kind: 'brand', name: 'Dropbox', description: '' }))).toBe(
      'Browse everything from Dropbox, with features and pricing.',
    );
  });
});

describe('what the page is made of', () => {
  it('opens with the name and description, then lists the products', () => {
    const sections = taxonomyPageSections(seed());
    expect(sections.map((section) => section.blockType)).toEqual(['hero', 'productGrid']);

    const hero = sections[0].content as Record<string, unknown>;
    expect(hero.heading).toBe('Business Plans');
    expect(hero.description).toBe(
      'Everything a growing team needs, from storage to admin controls.',
    );
  });

  it('asks for the products rather than listing them', () => {
    // This is the whole point: nothing is copied, so a product added to the
    // category tomorrow is on the page tomorrow.
    const grid = taxonomyPageSections(seed())[1].content as Record<string, unknown>;
    expect(grid.source).toBe('category');
    expect(grid.categoryId).toBe('cat_1');
    expect(grid.brandId).toBeNull();
    expect(grid.productIds).toBeUndefined();

    const brandGrid = taxonomyPageSections(
      seed({ kind: 'brand', id: 'brand_1', name: 'Dropbox', slug: 'dropbox' }),
    )[1].content as Record<string, unknown>;
    expect(brandGrid.source).toBe('brand');
    expect(brandGrid.brandId).toBe('brand_1');
    expect(brandGrid.categoryId).toBeNull();
  });

  it('shows the whole catalogue rather than quietly stopping at six', () => {
    const grid = taxonomyPageSections(seed())[1].content as Record<string, unknown>;
    expect(grid.limit).toBe(24);
  });

  it('shows the image beside the heading only when there is one', () => {
    expect((taxonomyPageSections(seed())[0].content as Record<string, unknown>).layout).toBe(
      'content',
    );
    const withImage = taxonomyPageSections(seed({ imageId: 'media_1' }))[0].content as Record<
      string,
      unknown
    >;
    expect(withImage.layout).toBe('contentImage');
    expect(withImage.imageId).toBe('media_1');
    expect(withImage.imageAlt).toBe('Business Plans');
  });

  it('is built from blocks a page can actually hold, and survives parsing', () => {
    for (const section of [
      ...taxonomyPageSections(seed()),
      ...taxonomyPageSections(seed({ kind: 'brand' })),
    ]) {
      expect(blockAllowedOnSurface(section.blockType, 'page'), section.blockType).toBe(true);

      // The generated content is what the renderer will parse, so it has to
      // survive the block's own schema without being corrected.
      const parsed = parseBlockContent(section.blockType, section.content) as Record<
        string,
        unknown
      >;
      for (const [key, value] of Object.entries(section.content ?? {})) {
        expect(parsed[key], `${section.blockType}.${key}`).toEqual(value);
      }
    }
  });
});
