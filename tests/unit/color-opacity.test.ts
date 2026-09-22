import { describe, it, expect } from 'vitest';
import { parseColor, composeColor, normaliseColor, hasOpacity, HEX_COLOR } from '@/lib/cms/color';
import { cssColor } from '@/lib/cms/chrome';
import { parseProductLayout } from '@/lib/cms/product-settings';
import { parseSectionDesign } from '@/lib/cms/design';

/**
 * Opacity, stored inside the colour.
 *
 * `#0061FF80` rather than a colour and a separate percentage, so nothing grows
 * a second field to keep in step with the first and what is stored stays one
 * value a browser understands wherever a colour is written.
 */

describe('reading a colour', () => {
  it('treats a plain colour as fully opaque', () => {
    expect(parseColor('#0061FF')).toEqual({ hex: '#0061FF', alpha: 100 });
    expect(parseColor('#0061ff')).toEqual({ hex: '#0061FF', alpha: 100 });
  });

  it('splits the opacity off an eight-digit one', () => {
    expect(parseColor('#0061FFFF')).toEqual({ hex: '#0061FF', alpha: 100 });
    expect(parseColor('#0061FF80')).toEqual({ hex: '#0061FF', alpha: 50 });
    expect(parseColor('#0061FF00')).toEqual({ hex: '#0061FF', alpha: 0 });
  });

  it('reads nothing out of something that is not a colour', () => {
    for (const value of ['', 'red', '#12345', '#0061FF8', 'rgb(0 0 0)', null, undefined]) {
      expect(parseColor(value), String(value)).toBeNull();
    }
  });
});

describe('writing one back', () => {
  it('keeps a fully opaque colour at six digits', () => {
    // So a colour nobody made transparent is stored exactly as it always was,
    // and still equals the default it might be.
    expect(composeColor('#0061FF', 100)).toBe('#0061FF');
    expect(normaliseColor('#0061FFFF')).toBe('#0061FF');
  });

  it('appends the alpha byte below full', () => {
    expect(composeColor('#0061FF', 50)).toBe('#0061FF80');
    expect(composeColor('#0061FF', 0)).toBe('#0061FF00');
  });

  it('survives a round trip at every percent', () => {
    for (let alpha = 0; alpha <= 100; alpha += 1) {
      const written = composeColor('#0061FF', alpha);
      expect(parseColor(written)?.alpha, `${alpha}%`).toBe(alpha);
    }
  });

  it('refuses to build a colour out of something that is not one', () => {
    expect(composeColor('nonsense', 50)).toBe('');
    expect(composeColor('', 50)).toBe('');
  });

  it('turns anything unusable into "inherit", never into black', () => {
    for (const value of ['', 'red', 'url(x)', '#0061FF; body{}']) {
      expect(normaliseColor(value), value).toBe('');
    }
  });

  it('knows when a colour is see-through', () => {
    expect(hasOpacity('#0061FF')).toBe(false);
    expect(hasOpacity('#0061FF80')).toBe(true);
    expect(hasOpacity('')).toBe(false);
  });
});

describe('every schema that stores a colour takes one with opacity', () => {
  it('accepts both spellings', () => {
    expect(HEX_COLOR.test('#0061FF')).toBe(true);
    expect(HEX_COLOR.test('#0061FF80')).toBe(true);
    expect(HEX_COLOR.test('#0061F')).toBe(false);
  });

  it('carries it through the header and footer', () => {
    expect(cssColor('#0B1B3480')).toBe('#0B1B3480');
    expect(cssColor('#0B1B34FF')).toBe('#0B1B34');
    expect(cssColor('rgba(0,0,0,0.5)')).toBeNull();
  });

  it('carries it through the product design settings', () => {
    expect(parseProductLayout({ priceColor: '#0061FF80' }).priceColor).toBe('#0061FF80');
    expect(parseProductLayout({ priceColor: 'red' }).priceColor).toBe('');
  });

  it('carries it through a section’s own design', () => {
    const design = parseSectionDesign({ background: { type: 'color', color: '#0061FF33' } });
    expect(design.background.color).toBe('#0061FF33');
  });
});
