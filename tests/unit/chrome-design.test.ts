import { describe, it, expect } from 'vitest';
import {
  cssLength,
  cssColor,
  cssWeight,
  cssTransform,
  cssShadow,
  headerVars,
  headerMobileVars,
  footerVars,
  chromeStylesheet,
} from '@/lib/cms/chrome';

/**
 * Restyling the header and the footer without restyling them by accident.
 *
 * The rule the whole screen rests on: a blank field means "leave it as it is",
 * not zero and not transparent. Nothing is emitted for a value nobody set, so
 * each component's own fallback stands and a site that never opens the screen
 * is untouched by it.
 */

describe('what counts as a value', () => {
  it('takes the lengths an administrator would type', () => {
    for (const value of ['4rem', '72px', '100%', '0.5rem', '80vw', '12ch']) {
      expect(cssLength(value), value).toBe(value);
    }
  });

  it('refuses anything that is not a length, including a bare number', () => {
    for (const value of ['', '  ', '72', 'calc(100% - 2rem)', 'var(--x)', 'tall', null, undefined]) {
      expect(cssLength(value), String(value)).toBeNull();
    }
  });

  it('takes a hex colour, with or without the hash, and normalises it', () => {
    expect(cssColor('#0061ff')).toBe('#0061FF');
    expect(cssColor('0061ff')).toBe('#0061FF');
    // `#FFF` is `#FFFFFF`: one canonical spelling reaches the stylesheet.
    expect(cssColor(' #FFF ')).toBe('#FFFFFF');
  });

  it('refuses a colour that is not hex', () => {
    // Named colours and functions are not accepted: what goes into the
    // stylesheet has to be something this code recognised, not passed through.
    for (const value of ['red', 'rgb(0 0 0)', '#12345', 'url(x)', '', null]) {
      expect(cssColor(value), String(value)).toBeNull();
    }
  });

  it('takes an opacity inside the colour', () => {
    expect(cssColor('#0061FF80')).toBe('#0061FF80');
    // Fully opaque is written back without the redundant FF.
    expect(cssColor('#0061FFFF')).toBe('#0061FF');
  });

  it('takes a weight in range and nothing else', () => {
    expect(cssWeight('600')).toBe('600');
    expect(cssWeight('100')).toBe('100');
    expect(cssWeight('900')).toBe('900');
    for (const value of ['0', '1000', 'bold', '', null]) {
      expect(cssWeight(value), String(value)).toBeNull();
    }
  });

  it('treats "none" as nothing to say', () => {
    // Emitting `text-transform:none` would override a value the component or
    // the typography screen had already set.
    expect(cssTransform('none')).toBeNull();
    expect(cssTransform('uppercase')).toBe('uppercase');
    expect(cssTransform('SCREAMING')).toBeNull();
    expect(cssShadow('none')).toBeNull();
    expect(cssShadow('md')).toContain('rgb(0 0 0');
  });

  it('only ever emits a shadow it defines itself', () => {
    expect(cssShadow('0 0 40px red')).toBeNull();
    expect(cssShadow('inset 0 0 0 99px black')).toBeNull();
  });
});

describe('glass', () => {
  it('takes a blur and caps it where it stops meaning anything', async () => {
    const { cssBlur } = await import('@/lib/cms/chrome');
    expect(cssBlur('16px')).toBe('16px');
    // A bare number means pixels…
    expect(cssBlur('16')).toBe('16px');
    // …and rem is converted, never read as that many pixels.
    expect(cssBlur('1.5rem')).toBe('24px');
    // 40px is the most anybody means by "glass"; past it is a smear.
    expect(cssBlur('200px')).toBe('40px');
  });

  it('is nothing at all for a blur of zero or of nonsense', async () => {
    const { cssBlur } = await import('@/lib/cms/chrome');
    for (const value of ['', '0px', '-4px', 'lots', '50%', null]) {
      expect(cssBlur(value), String(value)).toBeNull();
    }
  });

  it('takes a saturation with or without the sign', async () => {
    const { cssSaturate } = await import('@/lib/cms/chrome');
    expect(cssSaturate('140%')).toBe('140%');
    expect(cssSaturate('140')).toBe('140%');
    expect(cssSaturate('999')).toBe('300%');
    expect(cssSaturate('')).toBeNull();
    expect(cssSaturate('a lot')).toBeNull();
  });

  it('writes both filters as one backdrop, and none where neither was set', async () => {
    const { headerVars } = await import('@/lib/cms/chrome');
    expect(headerVars({ headerBlur: '20px', headerSaturate: '140%' })['--header-backdrop']).toBe(
      'blur(20px) saturate(140%)',
    );
    // One without the other still works — the fallback in the component is
    // what a site that set neither keeps.
    expect(headerVars({ headerBlur: '20px' })['--header-backdrop']).toBe('blur(20px)');
    expect(headerVars({ headerBlur: '', headerSaturate: '' })['--header-backdrop']).toBeUndefined();
  });
});

describe('the variables that reach the page', () => {
  it('emits nothing at all for settings nobody has filled in', () => {
    const blank = {
      headerHeight: '',
      headerBg: '',
      headerMenuTransform: 'none',
      headerShadow: 'none',
      footerBg: '',
      footerPaddingY: '',
    };
    expect(headerVars(blank)).toEqual({});
    expect(footerVars(blank)).toEqual({});
    expect(chromeStylesheet(blank)).toBe('');
  });

  it('emits only the ones that were set', () => {
    const vars = headerVars({ headerHeight: '5rem', headerBg: '#0B1B34', headerWidth: 'wrong' });
    expect(vars).toEqual({ '--header-height': '5rem', '--header-bg': '#0B1B34' });
    expect(vars['--header-width']).toBeUndefined();
  });

  it('keeps the phone overrides separate from the rest', () => {
    const settings = { headerHeight: '5rem', headerHeightMobile: '3.5rem' };
    expect(headerVars(settings)['--header-height']).toBe('5rem');
    expect(headerMobileVars(settings)['--header-height']).toBe('3.5rem');
  });

  it('writes the phone overrides into a media query, and only when there are any', () => {
    const sheet = chromeStylesheet({ headerHeight: '5rem', headerHeightMobile: '3.5rem' });
    expect(sheet).toContain(':root{--header-height:5rem;}');
    expect(sheet).toContain('@media (max-width:1023px){:root{--header-height:3.5rem;}}');

    expect(chromeStylesheet({ headerHeight: '5rem' })).not.toContain('@media');
  });

  it('puts the header and the footer in one block', () => {
    const sheet = chromeStylesheet({ headerBg: '#FFFFFF', footerBg: '#0B1B34' });
    expect(sheet.match(/:root\{/g)).toHaveLength(1);
    expect(sheet).toContain('--header-bg:#FFFFFF;');
    expect(sheet).toContain('--footer-bg:#0B1B34;');
  });

  it('cannot be made to carry anything but a value it recognised', () => {
    // Every field is run through its own validator, so a stored value cannot
    // close the declaration and add rules of its own.
    const sheet = chromeStylesheet({
      headerBg: '#fff;} body{display:none} .x{color:red',
      footerPaddingY: '1rem;position:fixed',
      headerShadow: 'none} * {display:none',
    });
    expect(sheet).toBe('');
  });
});
