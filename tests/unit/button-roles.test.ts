import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { buildSectionStyles, parseSectionDesign } from '@/lib/cms/design';
import { describe, it, expect } from 'vitest';
import {
  BUTTON_SHAPES,
  buttonLook,
  buttonShapeOf,
  buttonStylesheet,
  previewLook,
} from '@/lib/cms/buttons';

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
    expect(sheet).toBe(
      ':root .btn-tokens.btn-role-secondary:hover{background-color:#ABCDEF;border-color:#ABCDEF;}',
    );
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

  it('paints plain values, so it reaches buttons inside sections too', () => {
    const sheet = buttonStylesheet({
      buttonPrimaryBg: '#00AA00',
      buttonPrimaryText: '#000000',
    });
    // Every section used to carry --sec-button, so chaining through it meant
    // the global colour never showed inside one.
    expect(sheet).not.toContain('--sec-button');
    expect(sheet).toContain(
      ':root .btn-tokens.btn-role-primary{background-color:#00AA00;color:#000000;border-color:#00AA00;}',
    );
  });

  it('applies the border width to both roles', () => {
    const sheet = buttonStylesheet({ buttonBorderWidth: '2px' });
    expect(sheet).toContain('.btn-role-primary.border{border-width:2px;}');
    expect(sheet).toContain('.btn-role-secondary.border{border-width:2px;}');
    // With a border colour of its own, the whole role takes the width.
    expect(
      buttonStylesheet({ buttonBorderWidth: '2px', buttonPrimaryBorder: '#000000' }),
    ).toContain('.btn-role-primary{border-color:#000000;border-style:solid;border-width:2px;}');
  });

  it('ignores values that are not colours', () => {
    expect(buttonStylesheet({ buttonPrimaryBg: 'red;}body{display:none' })).toBe('');
  });

  it('previews the real default look when nothing is set', () => {
    expect(previewLook({ colorPrimary: '#0061FF' }, 'primary').bg).toBe('#0061FF');
    expect(previewLook({ colorPrimary: '#0061FF' }, 'secondary').border).toBe('#0061FF');
  });
});

describe('button shapes', () => {
  it('offers square, slightly rounded, rounded and pill as radii', () => {
    expect(BUTTON_SHAPES.map((shape) => shape.radius)).toEqual([
      '0px',
      '0.25rem',
      '0.5rem',
      '999px',
    ]);
  });

  it('recognises a stored radius as its preset, and anything else as custom', () => {
    expect(buttonShapeOf('999px')?.id).toBe('pill');
    expect(buttonShapeOf(' 0px ')?.id).toBe('square');
    // The shared default is the "Rounded" preset, so a fresh site shows it picked.
    expect(buttonShapeOf('0.5rem')?.id).toBe('rounded');
    expect(buttonShapeOf('0.75rem')).toBeNull();
    expect(buttonShapeOf('')).toBeNull();
  });

  it('gives each button its own shape only when one was chosen', () => {
    expect(buttonStylesheet({ buttonPrimaryRadius: '', buttonSecondaryRadius: '' })).toBe('');
    expect(buttonStylesheet({ buttonPrimaryRadius: '999px' })).toBe(
      ':root .btn-tokens.btn-role-primary{border-radius:999px;}',
    );
    expect(buttonStylesheet({ buttonSecondaryRadius: '0px' })).toBe(
      ':root .btn-tokens.btn-role-secondary{border-radius:0px;}',
    );
  });

  it('ignores a shape that is not a length', () => {
    expect(buttonStylesheet({ buttonPrimaryRadius: '50%;color:red' })).toBe('');
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
    expect(button).toContain('role ? BUTTON_ROLE_CLASS[role] : ROLES[variant],');
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

  it('picks shapes by sight: shared, and per button with "same as all"', () => {
    expect(form).toMatch(/<ButtonShapePicker\s+id="buttonRadius"/);
    expect(form).toContain('const radiusKey = `${role.prefix}Radius`;');
    expect(form).toMatch(
      /<ButtonShapePicker\s+id=\{radiusKey\}[^>]*inheritLabel="Same as all buttons"/,
    );
    // The previews draw the shape the site will use.
    expect(form).toContain("str(radiusKey) || str('buttonRadius')");
  });

  it('saves every field, blank or not', () => {
    // The action is a 'use server' module, so its schema is read as source.
    const action = readFileSync('src/lib/actions/settings.ts', 'utf8');
    for (const field of [
      ...COLOUR_FIELDS,
      'buttonBorderWidth',
      'buttonPrimaryRadius',
      'buttonSecondaryRadius',
      'buttonPrimaryStyle',
      'buttonSecondaryStyle',
    ]) {
      expect(action, field).toMatch(new RegExp(`\\n  ${field}: `));
    }
    const schema = readFileSync('prisma/schema.prisma', 'utf8');
    for (const field of [
      ...COLOUR_FIELDS,
      'buttonBorderWidth',
      'buttonPrimaryRadius',
      'buttonSecondaryRadius',
    ]) {
      expect(schema, field).toMatch(new RegExp(`\\b${field}\\s+String @default\\(""\\)`));
    }
  });
});

describe("a section's own button colours", () => {
  const css = readFileSync('src/app/globals.css', 'utf8');
  const ruleFor = (selector: string) => {
    const at = css.indexOf(`${selector} {`);
    return at < 0 ? '' : css.slice(at, css.indexOf('}', at));
  };

  it('are set only where the section chose them', () => {
    const plain = buildSectionStyles(parseSectionDesign({}), 'abc');
    expect(plain.style['--sec-button']).toBeUndefined();
    expect(plain.style['--sec-button-text']).toBeUndefined();
    expect(plain.modifiers).toBe('');

    const chosen = buildSectionStyles(
      parseSectionDesign({ colors: { button: '#FFFFFF', buttonText: '#000000' } }),
      'abc',
    );
    expect(chosen.style['--sec-button']).toBe('#FFFFFF');
    expect(chosen.style['--sec-button-text']).toBe('#000000');
    expect(chosen.modifiers).toBe('cms-section--button cms-section--button-text');
  });

  it('reach the section element', () => {
    const renderer = readFileSync('src/components/cms/section-renderer.tsx', 'utf8');
    expect(renderer).toContain('styles.modifiers');
  });

  it('outrank the global button design, and only where chosen', () => {
    // Five classes deep against the global rules' three (four on hover).
    const fill = ruleFor(':root .cms-section.cms-section--button .btn-tokens.cms-btn-primary');
    expect(fill).toContain('background-color: var(--sec-button)');
    const text = ruleFor(
      ':root .cms-section.cms-section--button-text .btn-tokens.cms-btn-primary,\n  :root .cms-section.cms-section--button-text .btn-tokens.cms-btn-primary:hover',
    );
    expect(text).toContain('color: var(--sec-button-text)');
    expect(ruleFor(':root .cms-section.cms-section--button .btn-tokens.cms-btn-primary:hover')).toContain(
      'color-mix(in srgb, var(--sec-button) 88%, #000)',
    );
    expect(ruleFor(':root .cms-section.cms-section--button .btn-tokens.cms-btn-outline')).toContain(
      'border-color: var(--sec-button)',
    );
  });

  it('give every block\'s main button the primary role, however it is drawn', () => {
    const shared = readFileSync('src/components/cms/blocks/shared.tsx', 'utf8');
    expect(shared).toContain('buttonClasses(variant, size, cn(tone, className), role)');
    for (const file of readdirSync('src/components/cms/blocks')) {
      const source = readFileSync(join('src/components/cms/blocks', file), 'utf8');
      const mains = source.split(/variant=\{(?:mainCtaVariant\(|variantFor\.primary\})/).length - 1;
      const roles = (source.match(/role="primary"\s*\n\s*variant=\{(?:mainCtaVariant\(|variantFor\.primary\})/g) ?? [])
        .length;
      expect(roles, file).toBe(mains);
    }
  });

  it('keep the main button filled on a dark section that chose a button colour', () => {
    const shared = readFileSync('src/components/cms/blocks/shared.tsx', 'utf8');
    expect(shared).toContain("return dark && !ctx.design.colors.button ? 'outline' : 'primary';");
    // No block decides it for itself any more.
    for (const file of readdirSync('src/components/cms/blocks')) {
      const source = readFileSync(join('src/components/cms/blocks', file), 'utf8');
      expect(source, file).not.toMatch(/inverted[^?\n]*\? 'outline' : 'primary'/);
    }
  });
});
