import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { BLOCKS } from '@/lib/cms/blocks';

/**
 * A two-column hero's split between its text and its form or image.
 *
 * Left at 50 / 50 the hero renders exactly as it always did; any other split
 * sets the desktop grid's two widths, in the order the columns appear.
 */

const hero = BLOCKS.hero!;
const source = readFileSync('src/components/cms/blocks/hero-block.tsx', 'utf8');

describe('the hero column split', () => {
  it('defaults to the equal split, and survives a bad value', () => {
    const content = hero.schema.parse({}) as Record<string, unknown>;
    expect(content.columnSplit).toBe('50');
    expect(content.columnSplitCustom).toBe(50);
    const bad = hero.schema.parse({ columnSplit: '99', columnSplitCustom: 5 }) as Record<
      string,
      unknown
    >;
    expect(bad.columnSplit).toBe('50');
    expect(bad.columnSplitCustom).toBe(50);
  });

  it('is offered on the Content tab, with a custom percentage behind "Custom"', () => {
    const split = hero.fields.find((field) => field.name === 'columnSplit');
    expect(split?.kind).toBe('select');
    const values =
      split && split.kind === 'select' ? split.options.map((option) => option.value) : [];
    expect(values).toEqual(['50', '55', '60', '65', '70', '45', '40', 'custom']);
    const custom = hero.fields.find((field) => field.name === 'columnSplitCustom');
    expect(custom?.showWhen).toEqual({ field: 'columnSplit', equals: ['custom'] });
  });

  it('keeps the equal split’s markup, and sets the tracks for any other', () => {
    expect(source).toContain("equalSplit ? 'lg:grid-cols-2' : 'lg:grid-cols-[var(--hero-cols)]'");
    expect(source).toContain("'--hero-cols': tracks");
    // The aside placed on the left takes the first track.
    expect(source).toContain(
      'const shares = asideFirst ? [100 - textShare, textShare] : [textShare, 100 - textShare];',
    );
  });

  it('lets the text use its whole column once a split is chosen', () => {
    expect(source).toContain("cn('cms-measure', equalSplit && 'max-w-xl')");
  });
});
