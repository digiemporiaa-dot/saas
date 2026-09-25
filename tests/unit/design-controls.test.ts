import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { BLOCKS } from '@/lib/cms/blocks';
import { buildSectionStyles, parseSectionDesign } from '@/lib/cms/design';

/**
 * Every control on the design panel moves something.
 *
 * The panel writes a setting, the section turns it into CSS, and an element on
 * the page has to read that CSS. Most of the panel's controls used to stop at
 * the second step: the value saved, the variable was written, and nothing on
 * the page read it — because the heading beside it carried a Tailwind size of
 * its own, or the text kept its own measure, or the block had no grid for the
 * grid controls to act on. Nothing failed, so nothing said so. This does.
 */

const renderer = readFileSync('src/components/cms/section-renderer.tsx', 'utf8');
const BLOCK_DIR = 'src/components/cms/blocks';
const blockFiles = readdirSync(BLOCK_DIR)
  .filter((file) => file.endsWith('.tsx'))
  .map((file) => readFileSync(join(BLOCK_DIR, file), 'utf8'));

/** A function's own source, found by name and cut at its matching brace. */
function functionSource(source: string, name: string): string | null {
  const start = source.search(new RegExp(`function ${name}\\b`));
  if (start < 0) return null;

  // Past the parameter list — which has braces of its own in a destructure.
  let i = source.indexOf('(', start);
  for (let depth = 0; i < source.length; i += 1) {
    if (source[i] === '(') depth += 1;
    else if (source[i] === ')' && --depth === 0) break;
  }
  const open = source.indexOf('{', source.indexOf(')', i));
  let depth = 0;
  for (let j = open; j < source.length; j += 1) {
    if (source[j] === '{') depth += 1;
    else if (source[j] === '}' && --depth === 0) return source.slice(start, j + 1);
  }
  return null;
}

/** What a block's renderer draws: its own body, and the helpers beside it that it uses. */
function rendered(component: string): string {
  for (const file of blockFiles) {
    const own = functionSource(file, component);
    if (!own) continue;
    const helpers = [...own.matchAll(/<([A-Z][A-Za-z]+)/g)]
      .map((match) => match[1]!)
      .filter((tag) => tag !== component)
      .map((tag) => functionSource(file, tag) ?? '');
    return [own, ...helpers].join('\n');
  }
  return '';
}

const TYPES = [...renderer.matchAll(/case '([A-Za-z]+)':\s*return <([A-Za-z]+)/g)].map(
  (match) => ({ type: match[1]!, component: match[2]! }),
);

describe('the controls a block is offered', () => {
  it('finds the renderer for every block it checks', () => {
    expect(TYPES.length).toBeGreaterThan(40);
    for (const { type, component } of TYPES) {
      expect(rendered(component), `${type} → ${component}`).not.toBe('');
    }
  });

  /*
   * Both directions. A block that claims the grid controls without a grid
   * offers controls that do nothing; a block that renders a grid without
   * claiming them hides controls that would have worked.
   */
  it('offers grid columns and gaps exactly where there is a grid', () => {
    for (const { type, component } of TYPES) {
      const usesGrid = /cms-grid|columnVars|blockColumnVars/.test(rendered(component));
      const offers = (BLOCKS[type]?.design ?? []).includes('grid');
      expect(offers, `${type}: renders a grid ${usesGrid}, offers grid controls ${offers}`).toBe(
        usesGrid,
      );
    }
  });

  it('offers image sizes exactly where the image reads them', () => {
    for (const { type, component } of TYPES) {
      const usesMedia = /<CmsImage\b/.test(rendered(component));
      const offers = (BLOCKS[type]?.design ?? []).includes('image');
      expect(offers, `${type}: sized image ${usesMedia}, offers image sizes ${offers}`).toBe(
        usesMedia,
      );
    }
  });

  it('offers the button position exactly where there are buttons to place', () => {
    for (const { type, component } of TYPES) {
      const hasButtons = /cms-actions|<FormPanel\b/.test(rendered(component));
      const offers = (BLOCKS[type]?.design ?? []).includes('buttons');
      expect(offers, `${type}: button rows ${hasButtons}, offers button position ${offers}`).toBe(
        hasButtons,
      );
    }
  });

  it('does not let a claim hide from the check above', () => {
    const checked = new Set(TYPES.map(({ type }) => type));
    for (const [type, block] of Object.entries(BLOCKS)) {
      if ((block.design ?? []).length === 0) continue;
      expect(checked.has(type), `${type} declares controls but is not checked`).toBe(true);
    }
  });

  it('offers nothing that nothing reads', () => {
    const panel = readFileSync('src/components/cms/design-panel.tsx', 'utf8');
    // `.cms-stack` is on no block; `--sec-secondary` was read by no rule.
    expect(panel).not.toContain("'Content gap'");
    expect(panel).not.toContain('Secondary colour');
  });
});

describe('the settings that used to lose to a utility class', () => {
  const styles = (raw: unknown) => buildSectionStyles(parseSectionDesign(raw), 'abc');

  it('writes no CSS at all for a section left at its defaults', () => {
    expect(styles({}).css).toBe('');
  });

  /*
   * `.sec-abc :is(h1,h2,h3)` is a class and an element: it outranks the single
   * class of `text-3xl` or `lg:text-5xl` wherever either sits in the sheet.
   * The variable it replaced was read at a class's specificity and lost.
   */
  it('sizes headings with a rule that outranks a heading’s own size', () => {
    const { css, style } = styles({ desktop: { headingSize: '40px' } });
    expect(css).toContain('.sec-abc :is(h1,h2,h3){font-size:40px}');
    expect(style['--sec-heading-size']).toBeUndefined();
  });

  it('sizes body text the same way', () => {
    expect(styles({ desktop: { bodySize: '18px' } }).css).toContain(
      '.sec-abc :is(p,li){font-size:18px}',
    );
  });

  it('aligns text even where a block centred it itself', () => {
    expect(styles({ desktop: { align: 'left' } }).css).toContain('{text-align:left}');
  });

  it('lets a chosen content width release the text’s own measure', () => {
    // The container widened already; the hero's words stayed in a max-w-3xl
    // column inside it, so "full width" changed nothing a visitor could see.
    expect(styles({ desktop: { contentWidth: '100%' } }).css).toContain(
      '.sec-abc .cms-measure{max-width:none}',
    );
  });

  it('lets a narrower screen override the desktop value, not the other way round', () => {
    const { css } = styles({
      desktop: { headingSize: '48px' },
      mobile: { headingSize: '28px' },
    });
    const desktop = css.indexOf('font-size:48px');
    const mobile = css.indexOf('font-size:28px');
    expect(desktop).toBeGreaterThanOrEqual(0);
    expect(mobile).toBeGreaterThan(desktop);
    expect(css.slice(0, mobile)).toContain('@media (max-width:767px)');
  });

  it('sets line height, letter spacing and word spacing on headings and body text', () => {
    const { css } = styles({
      desktop: {
        headingSize: '48px',
        headingLineHeight: '1.1',
        headingLetterSpacing: '-0.02em',
        headingWordSpacing: '2px',
        bodyLineHeight: '1.7',
        bodyLetterSpacing: '0.01em',
        bodyWordSpacing: '0.1em',
      },
    });
    expect(css).toContain(
      '.sec-abc :is(h1,h2,h3){font-size:48px;line-height:1.1;letter-spacing:-0.02em;word-spacing:2px}',
    );
    expect(css).toContain('.sec-abc :is(p,li){line-height:1.7;letter-spacing:0.01em;word-spacing:0.1em}');
  });

  it('lets a phone have its own text spacing', () => {
    const { css } = styles({
      desktop: { headingLineHeight: '1.2' },
      mobile: { headingLineHeight: '1.35', bodyLetterSpacing: '0.02em' },
    });
    const mobile = css.slice(css.indexOf('@media (max-width:767px)'));
    expect(mobile).toContain('.sec-abc :is(h1,h2,h3){line-height:1.35}');
    expect(mobile).toContain('.sec-abc :is(p,li){letter-spacing:0.02em}');
  });

  it('keeps line height a plain multiplier, and spacing a real length', () => {
    const parsed = (raw: Record<string, unknown>) => parseSectionDesign({ desktop: raw }).desktop;
    expect(parsed({ bodyLineHeight: '1.5' }).bodyLineHeight).toBe('1.5');
    expect(parsed({ bodyLineHeight: 2 }).bodyLineHeight).toBe('2');
    for (const bad of ['28px', '-1', '0', 'normal', '1.5;color:red', '99']) {
      expect(parsed({ bodyLineHeight: bad }).bodyLineHeight, bad).toBe('');
    }
    expect(parsed({ headingLetterSpacing: '-0.02em' }).headingLetterSpacing).toBe('-0.02em');
    // A bare number is what people type; it means pixels, as for every length.
    expect(parsed({ bodyWordSpacing: '3' }).bodyWordSpacing).toBe('3px');
    expect(parsed({ bodyWordSpacing: 'wide' }).bodyWordSpacing).toBe('');
  });

  it('offers the text spacing controls for both kinds of text, on every screen size', () => {
    const panel = readFileSync('src/components/cms/design-panel.tsx', 'utf8');
    for (const key of [
      'headingLineHeight',
      'headingLetterSpacing',
      'headingWordSpacing',
      'bodyLineHeight',
      'bodyLetterSpacing',
      'bodyWordSpacing',
    ]) {
      // In the rows the panel draws, and counted on the breakpoint's badge.
      expect(panel, key).toContain(`'${key}'`);
      expect(panel.split(`'${key}'`).length - 1, key).toBeGreaterThanOrEqual(2);
    }
    expect(panel).toContain('Line height');
    expect(panel).toContain('Letter spacing');
    expect(panel).toContain('Word spacing');
  });

  it('cannot be made to write a rule of its own', () => {
    // Every value is validated before it gets here; a length that is not one
    // is dropped rather than interpolated.
    expect(styles({ desktop: { headingSize: '1px}body{display:none' } }).css).toBe('');
  });
});

describe('the columns a section lives in', () => {
  it('gives every section a container for the panel to act on', () => {
    // A product page and an article render their sections without the page
    // container, and so had no element for content width, side padding, body
    // size or alignment to reach.
    expect(renderer).toContain("'cms-container cms-container--fill'");
    const css = readFileSync('src/app/globals.css', 'utf8');
    expect(css).toMatch(/\.cms-container\.cms-container--fill\s*\{[^}]*max-width:\s*var\(--sec-max-w,\s*none\)/);
  });

  it('marks the text measures a chosen width releases', () => {
    const marked = blockFiles.filter((file) => file.includes('cms-measure')).length;
    expect(marked).toBeGreaterThanOrEqual(5);
  });
});

describe('the button position', () => {
  const styles = (raw: unknown) => buildSectionStyles(parseSectionDesign(raw), 'abc');

  it('writes nothing until somebody chooses one', () => {
    expect(styles({}).css).toBe('');
  });

  it('stretches the buttons, and a form that follows the section', () => {
    const css = styles({ desktop: { buttonPosition: 'full' } }).css;
    expect(css).toContain('.sec-abc .cms-actions>.btn-tokens{width:100%}');
    expect(css).toContain('.sec-abc .cms-form-follow .fd-submit{width:100%}');
  });

  it('justifies the row and undoes a larger screen’s stretch', () => {
    const css = styles({
      desktop: { buttonPosition: 'full' },
      mobile: { buttonPosition: 'center' },
    }).css;
    const mobile = css.slice(css.indexOf('@media (max-width:767px)'));
    expect(mobile).toContain(
      '.sec-abc .cms-actions,.sec-abc .cms-form-follow .fd-actions{justify-content:center}',
    );
    expect(mobile).toContain('.sec-abc .cms-actions>.btn-tokens{width:auto}');
    // The form goes back to its own width, not to a guess.
    expect(mobile).toContain('.sec-abc .cms-form-follow .fd-submit{width:var(--fd-btn-w,auto)}');
  });

  it('is offered on the Responsive tab, beside text alignment', () => {
    const panel = readFileSync('src/components/cms/design-panel.tsx', 'utf8');
    expect(panel).toContain("const offersButtons = !supports || supports.includes('buttons');");
    expect(panel).toContain('label="Button position"');
    expect(panel).toContain("if (bp.buttonPosition !== 'inherit') count += 1;");
  });

  it('moves a form’s button unless the form’s own tab placed it', () => {
    const formPanel = readFileSync('src/components/cms/blocks/form-panel.tsx', 'utf8');
    expect(formPanel).toContain("style.buttonAlign === 'inherit' && 'cms-form-follow'");
  });

  it('finds every call-to-action button in a row it can act on', () => {
    const dir = 'src/components/cms/blocks';
    for (const file of readdirSync(dir)) {
      if (file === 'shared.tsx') continue;
      const source = readFileSync(join(dir, file), 'utf8');
      // Every CtaLink and ProductCta sits directly inside a .cms-actions row —
      // except the product grid's list rows, whose button shares its line with
      // the details link and is placed by that row's own layout.
      const lines = source.split('\n');
      lines.forEach((line, index) => {
        if (!/<(CtaLink|ProductCta)\b/.test(line)) return;
        if (lines.slice(index, index + 8).join('\n').includes('ctaLocation="product-grid"')) return;
        // The nearest element opened above it is its row.
        let open = index - 1;
        while (open >= 0 && !/<(div|td)\b/.test(lines[open]!)) open -= 1;
        const row = lines.slice(Math.max(open, 0), index).join('\n');
        expect(row, `${file}:${index + 1}`).toContain('cms-actions');
      });
    }
  });
});
