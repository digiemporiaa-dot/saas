import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { buttonLook, buttonStylesheet, previewLook } from '@/lib/cms/buttons';

/**
 * The primary and secondary buttons in Website design.
 *
 * Two promises: a blank screen changes nothing on the website, and every
 * control on it reaches the buttons.
 */

const COLOUR_FIELDS = ['Bg', 'Text', 'Border', 'HoverBg', 'HoverText', 'HoverBorder'].flatMap(
  (suffix) => [`buttonPrimary${suffix}`, `buttonSecondary${suffix}`],
);

describe('button roles', () => {
  it('emits nothing for default styles and blank colours', () => {
    expect(
      buttonStylesheet({
        colorPrimary: '#0061FF',
        colorSecondary: '#0B1B34',
        buttonPrimaryStyle: 'solid',
        buttonSecondaryStyle: 'outline',
      }),
    ).toBe('');
  });

  it('paints each colour a person sets onto its own role', () => {
    for (const field of COLOUR_FIELDS) {
      const sheet = buttonStylesheet({ [field]: '#123456' });
      const role = field.startsWith('buttonPrimary') ? 'primary' : 'secondary';
      expect(sheet, field).toContain(`.btn-tokens.btn-role-${role}`);
      expect(sheet, field).toContain('#123456');
      const other = role === 'primary' ? 'secondary' : 'primary';
      expect(sheet, field).not.toContain(`btn-role-${other}`);
    }
  });

  it('puts hover colours only in the hover rule', () => {
    const sheet = buttonStylesheet({ buttonSecondaryHoverBg: '#ABCDEF' });
    expect(sheet).toBe(':root .btn-tokens.btn-role-secondary:hover{background-color:#ABCDEF;}');
  });

  it('turns a non-default style into a full look from the theme', () => {
    const look = buttonLook(
      { colorSecondary: '#0B1B34', buttonSecondaryStyle: 'solid' },
      'secondary',
    );
    expect(look.bg).toBe('#0B1B34');
    expect(look.text).toBe('#FFFFFF');
    expect(look.hoverBg).toContain('color-mix');

    const outline = buttonLook(
      { colorPrimary: '#FF0000', buttonPrimaryStyle: 'outline' },
      'primary',
    );
    expect(outline.bg).toBe('transparent');
    expect(outline.text).toBe('#FF0000');
    expect(outline.border).toBe('#FF0000');
  });

  it('lets a typed colour win over the style, and darkens it for hover', () => {
    const look = buttonLook({ buttonPrimaryStyle: 'soft', buttonPrimaryBg: '#00AA00' }, 'primary');
    expect(look.bg).toBe('#00AA00');
    expect(look.hoverBg).toBe('color-mix(in srgb, #00AA00 88%, #000)');
  });

  it("keeps a section's own button colour ahead of the global primary", () => {
    const sheet = buttonStylesheet({
      buttonPrimaryBg: '#00AA00',
      buttonPrimaryText: '#000000',
    });
    expect(sheet).toContain('var(--sec-button, #00AA00)');
    expect(sheet).toContain('var(--sec-button-text, #000000)');
  });

  it('applies the border width to both roles', () => {
    const sheet = buttonStylesheet({ buttonBorderWidth: '2px' });
    expect(sheet).toContain('.btn-role-primary.border{border-width:2px;}');
    expect(sheet).toContain('.btn-role-secondary.border{border-width:2px;}');
    // With a border colour of its own, the whole role takes the width.
    expect(buttonStylesheet({ buttonBorderWidth: '2px', buttonPrimaryBorder: '#000000' })).toContain(
      '.btn-role-primary{border-color:#000000;border-style:solid;border-width:2px;}',
    );
  });

  it('ignores values that are not colours', () => {
    expect(buttonStylesheet({ buttonPrimaryBg: 'red;}body{display:none' })).toBe('');
  });

  it('previews the real default look when nothing is set', () => {
    expect(previewLook({ colorPrimary: '#0061FF' }, 'primary').bg).toBe('#0061FF');
    expect(previewLook({ colorPrimary: '#0061FF' }, 'secondary').border).toBe('#0061FF');
  });
});

describe('which buttons carry which role', () => {
  // button.tsx is JSX, which this suite does not compile, so it is read as source.
  const button = readFileSync('src/components/ui/button.tsx', 'utf8');

  it('marks primary as primary, and secondary and outline as secondary', () => {
    const roles = /const ROLES[^=]*= \{([^}]*)\}/.exec(button)?.[1] ?? '';
    expect(roles).toContain('primary: BUTTON_ROLE_CLASS.primary');
    expect(roles).toContain('secondary: BUTTON_ROLE_CLASS.secondary');
    expect(roles).toContain('outline: BUTTON_ROLE_CLASS.secondary');
    for (const variant of ['ghost', 'subtle', 'danger', 'link']) {
      expect(roles).not.toContain(`${variant}:`);
    }
    expect(button).toContain('ROLES[variant],');
  });

  it('marks the size so the global padding and radius can outrank the size utilities', () => {
    expect(button).toContain("variant !== 'link' && `btn-${size}`");
    const css = readFileSync('src/app/globals.css', 'utf8');
    expect(css).toMatch(
      /\.btn-tokens:is\(\.btn-sm, \.btn-md, \.btn-lg\)\s*\{[^}]*border-radius: var\(--btn-radius\)/,
    );
    expect(css).toMatch(/\.btn-tokens:is\([^)]*\)\s*\{[^}]*padding-inline: var\(--btn-padding-x\)/);
  });

  it('gives the public call-to-action buttons the tokens', () => {
    for (const file of [
      'src/components/cms/blocks/shared.tsx',
      'src/components/public/site-header.tsx',
      'src/components/products/product-cta.tsx',
      'src/components/blog/blog-search.tsx',
    ]) {
      expect(readFileSync(file, 'utf8'), file).toContain('btn-tokens');
    }
  });

  it('injects the stylesheet into the public page', () => {
    expect(readFileSync('src/components/public/brand-style.tsx', 'utf8')).toContain(
      'buttonStylesheet(settings)',
    );
  });
});

describe('the admin screen', () => {
  const form = readFileSync('src/components/admin/settings/settings-form.tsx', 'utf8');

  it('offers every colour and style of both buttons', () => {
    expect(form).toContain("prefix: 'buttonPrimary'");
    expect(form).toContain("prefix: 'buttonSecondary'");
    for (const suffix of ['Bg', 'Text', 'Border', 'HoverBg', 'HoverText', 'HoverBorder']) {
      expect(form).toContain(`suffix: '${suffix}'`);
    }
    expect(form).toContain('`${role.prefix}Style`');
    expect(form).toContain("'buttonBorderWidth'");
  });

  it('saves every field, blank or not', () => {
    // The action is a 'use server' module, so its schema is read as source.
    const action = readFileSync('src/lib/actions/settings.ts', 'utf8');
    for (const field of [
      ...COLOUR_FIELDS,
      'buttonBorderWidth',
      'buttonPrimaryStyle',
      'buttonSecondaryStyle',
    ]) {
      expect(action, field).toMatch(new RegExp(`\\n  ${field}: `));
    }
    const schema = readFileSync('prisma/schema.prisma', 'utf8');
    for (const field of [...COLOUR_FIELDS, 'buttonBorderWidth']) {
      expect(schema, field).toMatch(new RegExp(`\\b${field}\\s+String @default\\(""\\)`));
    }
  });
});
