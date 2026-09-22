import { describe, it, expect } from 'vitest';
import {
  parseFooterContent,
  parseFooterDesign,
  footerVars,
  renderCopyright,
  DEFAULT_FOOTER_CONTENT,
  DEFAULT_FOOTER_DESIGN,
} from '@/lib/cms/footer';

/**
 * The footer, as one row of settings.
 *
 * Two rules hold it together: a site that has never opened the screen renders
 * the built-in footer, and a field left blank changes nothing about it.
 */

describe('what a footer says', () => {
  it('fills an empty row in with the built-in footer', () => {
    const content = parseFooterContent({});
    expect(content.enabled).toBe(true);
    expect(content.brand.show).toBe(true);
    expect(content.brand.logoMode).toBe('logoAndName');
    expect(content.brand.showSocials).toBe(true);
    expect(content.contact.heading).toBe('Get in touch');
    expect(content.bottom.text).toContain('{year}');
    // Nothing is invented: the link columns are the administrator's to add.
    expect(content.columns).toEqual([]);
  });

  it('keeps what was chosen and defaults only what is absent', () => {
    const content = parseFooterContent({
      brand: { showSocials: false },
      columns: [{ heading: 'Explore', links: [{ label: 'Packages', url: '/packages' }] }],
      contact: { showAddress: false },
    });

    expect(content.brand.showSocials).toBe(false);
    expect(content.brand.show).toBe(true);
    expect(content.columns[0]!.heading).toBe('Explore');
    expect(content.columns[0]!.links).toEqual([{ label: 'Packages', url: '/packages' }]);
    expect(content.contact.showAddress).toBe(false);
    expect(content.contact.showPhone).toBe(true);
  });

  it('falls back rather than throwing on a row it cannot read', () => {
    expect(parseFooterContent('nonsense')).toEqual(DEFAULT_FOOTER_CONTENT);
    expect(parseFooterContent(null)).toEqual(DEFAULT_FOOTER_CONTENT);
    expect(parseFooterDesign(42)).toEqual(DEFAULT_FOOTER_DESIGN);
  });

  it('caps the link columns, because the row only has so many', () => {
    const many = Array.from({ length: 9 }, (_, i) => ({ heading: `C${i}`, links: [] }));
    // Too many is not a partial list — it is a value the schema refuses, so
    // the stored row is used as it was rather than silently trimmed.
    expect(parseFooterContent({ columns: many }).columns).toEqual([]);
  });
});

describe('the copyright line', () => {
  it('fills in the year and the site name', () => {
    const year = String(new Date().getFullYear());
    expect(renderCopyright('© {year} {site}. All rights reserved.', 'Tickettofly')).toBe(
      `© ${year} Tickettofly. All rights reserved.`,
    );
  });

  it('leaves a line that names neither alone', () => {
    expect(renderCopyright('Made with care', 'Tickettofly')).toBe('Made with care');
  });
});

describe('what a footer looks like', () => {
  it('emits nothing for a colour or size nobody set', () => {
    const vars = footerVars(parseFooterDesign({}));
    for (const name of [
      '--footer-bg',
      '--footer-text',
      '--footer-heading',
      '--footer-link',
      '--footer-icon',
      '--footer-padding-y',
      '--footer-width',
    ]) {
      expect(vars[name], `${name} should be absent`).toBeUndefined();
    }
  });

  it('emits only what was set, validated', () => {
    const vars = footerVars(parseFooterDesign({ background: '#F8FAFC', paddingY: '4rem' }));
    expect(vars['--footer-bg']).toBe('#F8FAFC');
    expect(vars['--footer-padding-y']).toBe('4rem');
  });

  it('cannot be made to carry anything but a value it recognised', () => {
    const vars = footerVars(
      parseFooterDesign({
        background: '#fff;} body{display:none',
        paddingY: '4rem;position:fixed',
      }),
    );
    expect(vars['--footer-bg']).toBeUndefined();
    expect(vars['--footer-padding-y']).toBeUndefined();
  });

  it('gives the brand column a wider track and narrows the row on smaller screens', () => {
    const vars = footerVars(DEFAULT_FOOTER_DESIGN);
    expect(vars['--footer-cols']).toBe(
      'minmax(0, 1.4fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)',
    );
    expect(vars['--footer-cols-tablet']).toBe('repeat(2, minmax(0, 1fr))');
    expect(vars['--footer-cols-mobile']).toBe('repeat(1, minmax(0, 1fr))');
  });

  it('lets each breakpoint be set on its own', () => {
    const vars = footerVars(
      parseFooterDesign({ columns: 4, tabletColumns: 3, mobileColumns: 2, brandWidth: '' }),
    );
    expect(vars['--footer-cols']).toBe('repeat(4, minmax(0, 1fr))');
    expect(vars['--footer-cols-tablet']).toBe('repeat(3, minmax(0, 1fr))');
    expect(vars['--footer-cols-mobile']).toBe('repeat(2, minmax(0, 1fr))');
  });
});
