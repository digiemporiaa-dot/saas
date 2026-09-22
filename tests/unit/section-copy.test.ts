import { describe, it, expect } from 'vitest';
import { sectionCopy, sectionCopies, type CopyableSection } from '@/lib/cms/section-copy';

/**
 * What a duplicate takes with it.
 *
 * Duplicating a page, a product or an article is only worth doing if the copy
 * is the same page — the arrangement somebody built is the work. These are the
 * rules that carrying it across follows.
 */

const row = (over: Partial<CopyableSection> = {}): CopyableSection => ({
  blockType: 'hero',
  name: 'Opening',
  sortOrder: 10,
  isVisible: true,
  content: { heading: 'Dropbox Business' },
  settings: { background: 'muted', anchorId: 'top' },
  ...over,
});

describe('copying a built page onto a duplicate', () => {
  it('carries every section across, in order, exactly as it was', () => {
    const sections = [
      row({ blockType: 'hero', sortOrder: 10 }),
      row({ blockType: 'featureGrid', sortOrder: 20, isVisible: false, name: null }),
      row({ blockType: 'ctaBanner', sortOrder: 30 }),
    ];

    const copies = sectionCopies(sections);

    expect(copies.map((copy) => copy.blockType)).toEqual(['hero', 'featureGrid', 'ctaBanner']);
    expect(copies.map((copy) => copy.sortOrder)).toEqual([10, 20, 30]);
    // A section hidden on the original is hidden on the copy: duplicating is
    // not a way to publish something that was deliberately switched off.
    expect(copies[1].isVisible).toBe(false);
    expect(copies[1].name).toBeNull();
    expect(copies[0].content).toEqual({ heading: 'Dropbox Business' });
  });

  it('keeps the anchor, because the copy is its own document', () => {
    // Unlike duplicating a section inside one page, there is no clash here —
    // and clearing the anchor would break the copy's own #links instead.
    expect(sectionCopy(row()).settings).toEqual({ background: 'muted', anchorId: 'top' });
  });

  it('never carries an identity across', () => {
    const copy = sectionCopy(row()) as Record<string, unknown>;
    expect(copy).not.toHaveProperty('id');
    expect(copy).not.toHaveProperty('pageId');
    expect(copy).not.toHaveProperty('productId');
    expect(copy).not.toHaveProperty('createdAt');
  });

  it('survives a row whose payload is not an object', () => {
    // These columns cannot take null on the way in, so a single corrupt row
    // would otherwise fail the whole duplicate rather than lose one section's
    // settings. An empty payload renders as the block's own defaults.
    for (const bad of [null, undefined, 'nonsense', 7, ['a'], true]) {
      const copy = sectionCopy(row({ content: bad, settings: bad }));
      expect(copy.content, String(bad)).toEqual({});
      expect(copy.settings, String(bad)).toEqual({});
    }
  });

  it('copies nothing when there is nothing built', () => {
    expect(sectionCopies([])).toEqual([]);
  });
});

/**
 * Every duplicate action, not just the one that was reported.
 *
 * The bug this guards against was not a wrong mapping — it was a duplicate
 * action that never looked at the sections table at all, so the copy quietly
 * fell back to the built-in arrangement. That is invisible in a unit test of
 * the mapping, so the actions themselves are checked for using it.
 */
describe('the duplicate actions', () => {
  const sources: Array<[string, string[]]> = [
    ['src/lib/actions/pages.ts', ['duplicatePage', 'duplicatePageToCountry']],
    ['src/lib/actions/products.ts', ['duplicateProduct']],
    ['src/lib/actions/blog.ts', ['duplicateBlogPost', 'duplicateBlogPostToCountry']],
  ];

  it.each(sources)('copies sections in %s', async (file, actions) => {
    const { readFile } = await import('node:fs/promises');
    const source = await readFile(new URL(`../../${file}`, import.meta.url), 'utf8');

    for (const action of actions) {
      const start = source.indexOf(`export async function ${action}(`);
      expect(start, `${action} should exist`).toBeGreaterThan(-1);
      const next = source.indexOf('\nexport async function ', start + 1);
      const body = source.slice(start, next === -1 ? undefined : next);

      // It has to read the rows…
      expect(body, `${action} should read the source's sections`).toMatch(/sections:\s*{\s*orderBy/);
      // …and write them onto the copy.
      expect(body, `${action} should copy them onto the duplicate`).toMatch(/sectionCop(y|ies)/);
    }
  });
});
