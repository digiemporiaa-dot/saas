import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { BLOCKS } from '@/lib/cms/blocks';
import { readFieldPath } from '@/lib/cms/fields';
import {
  DEFAULT_FORM_STYLE,
  applyFormStyle,
  formCardStyle,
  formStyleField,
  formStyleGroups,
  formStyleSchema,
  hasFormStyle,
  wantsFormCard,
} from '@/lib/cms/form-style';
import { DEFAULT_FORM_DESIGN } from '@/lib/forms/form-design';

/**
 * Restyling a form where a section places it.
 *
 * Three promises: a section nobody restyled draws its form exactly as the
 * form's own design says; every control on the Form tab changes something on
 * the page; and every block that embeds a form offers the tab.
 */

const style = (raw: Record<string, unknown>) => formStyleSchema.parse(raw);

describe('the stored style', () => {
  it('is blank by default, and blank changes nothing', () => {
    expect(formStyleField.parse(undefined)).toEqual(DEFAULT_FORM_STYLE);
    expect(formStyleField.parse('garbage')).toEqual(DEFAULT_FORM_STYLE);
    expect(hasFormStyle(DEFAULT_FORM_STYLE)).toBe(false);
    expect(applyFormStyle(DEFAULT_FORM_DESIGN, DEFAULT_FORM_STYLE)).toEqual(DEFAULT_FORM_DESIGN);
    expect(formCardStyle(DEFAULT_FORM_STYLE)).toEqual({});
  });

  it('keeps only real colours and lengths', () => {
    const parsed = style({
      labelColor: 'red;}body{display:none',
      buttonBackground: '#0061ff',
      headingSize: '28',
      buttonRadius: 'calc(100%)',
    });
    expect(parsed.labelColor).toBe('');
    expect(parsed.buttonBackground).toBe('#0061FF');
    expect(parsed.headingSize).toBe('28px');
    expect(parsed.buttonRadius).toBe('');
  });

  it('does not change the form it restyles', () => {
    const design = structuredClone(DEFAULT_FORM_DESIGN);
    applyFormStyle(design, style({ labelColor: '#111111', buttonAlign: 'center' }));
    expect(design).toEqual(DEFAULT_FORM_DESIGN);
  });
});

describe('what each control changes', () => {
  it('lays the colours over the form design', () => {
    const design = applyFormStyle(
      DEFAULT_FORM_DESIGN,
      style({
        labelColor: '#111111',
        inputTextColor: '#222222',
        helpColor: '#333333',
        inputBackground: '#444444',
        inputBorderColor: '#555555',
        inputRadius: '0px',
        buttonBackground: '#666666',
        buttonTextColor: '#777777',
        buttonHoverBackground: '#888888',
        buttonHoverTextColor: '#999999',
        buttonRadius: '999px',
      }),
    );
    expect(design.typography.label.color).toBe('#111111');
    expect(design.typography.input.color).toBe('#222222');
    expect(design.typography.help.color).toBe('#333333');
    expect(design.input.background).toBe('#444444');
    expect(design.input.border.color).toBe('#555555');
    expect(design.input.border.style).toBe('solid');
    expect(design.input.border.radius).toBe('0px');
    expect(design.button.background).toBe('#666666');
    expect(design.button.textColor).toBe('#777777');
    expect(design.button.hoverBackground).toBe('#888888');
    expect(design.button.hoverTextColor).toBe('#999999');
    expect(design.button.border.radius).toBe('999px');
  });

  it('aligns the button, or stretches it', () => {
    expect(applyFormStyle(DEFAULT_FORM_DESIGN, style({ buttonAlign: 'full' })).button.width).toBe(
      'full',
    );
    const own = structuredClone(DEFAULT_FORM_DESIGN);
    own.button.width = 'full';
    const centred = applyFormStyle(own, style({ buttonAlign: 'center' }));
    expect(centred.button.align).toBe('center');
    // A centred button cannot also fill the row.
    expect(centred.button.width).toBe('auto');
  });

  it('styles the card inline, and asks for one only when it has a look', () => {
    const card = style({
      cardBackground: '#FFFFFF',
      cardBorderColor: '#000000',
      cardRadius: '12px',
      cardPadding: '32px',
      cardShadow: 'lg',
    });
    expect(formCardStyle(card)).toEqual({
      backgroundColor: '#FFFFFF',
      borderColor: '#000000',
      borderRadius: '12px',
      padding: '32px',
      boxShadow: '0 10px 30px rgb(0 0 0 / 0.12)',
    });
    expect(wantsFormCard(card)).toBe(true);
    expect(wantsFormCard(style({ cardRadius: '12px' }))).toBe(false);
    expect(formCardStyle(style({ cardShadow: 'none' }))).toEqual({ boxShadow: 'none' });
  });

  it('narrows the card and keeps it to a side of its column', () => {
    expect(formCardStyle(style({ cardWidth: '380px', cardPosition: 'right' }))).toEqual({
      maxWidth: '380px',
      marginLeft: 'auto',
      marginRight: '0',
    });
    expect(formCardStyle(style({ cardWidth: '380px' }))).toMatchObject({
      marginLeft: 'auto',
      marginRight: 'auto',
    });
    expect(formCardStyle(style({ cardWidth: '380px', cardPosition: 'left' }))).toMatchObject({
      marginLeft: '0',
      marginRight: 'auto',
    });
    // A position alone moves nothing: the card still fills its column.
    expect(formCardStyle(style({ cardPosition: 'right' }))).toEqual({});
  });

  it('reads every value somewhere — no control on the tab is dead', () => {
    const lib = readFileSync('src/lib/cms/form-style.ts', 'utf8');
    const panel = readFileSync('src/components/cms/blocks/form-panel.tsx', 'utf8');
    const blocks = readdirSync('src/components/cms/blocks')
      .map((file) => readFileSync(join('src/components/cms/blocks', file), 'utf8'))
      .join('\n');
    for (const key of Object.keys(formStyleSchema.shape)) {
      const read =
        lib.includes(`style.${key}`) ||
        panel.includes(`style.${key}`) ||
        blocks.includes(`content.formStyle.${key}`);
      expect(read, key).toBe(true);
    }
  });
});

describe('the Form tab', () => {
  const names = (groups: ReturnType<typeof formStyleGroups>) =>
    groups.flatMap((group) => group.fields.map((field) => field.name));

  it('offers every stored value, and nothing that is not stored', () => {
    const offered = names(formStyleGroups());
    const stored = Object.keys(formStyleSchema.shape).map((key) => `formStyle.${key}`);
    expect([...offered].sort()).toEqual([...stored].sort());
  });

  it('points at a block’s own heading and button text where it already had them', () => {
    const hero = names(formStyleGroups({ heading: 'formHeading', description: 'formDescription' }));
    expect(hero).toContain('formHeading');
    expect(hero).toContain('formDescription');
    expect(hero).not.toContain('formStyle.heading');

    const magnet = names(formStyleGroups({ buttonLabel: 'ctaLabel' }));
    expect(magnet).toContain('ctaLabel');
    expect(magnet).not.toContain('formStyle.buttonLabel');
  });

  it('leaves out the card where the block is the card already', () => {
    const groups = formStyleGroups({ card: false });
    expect(groups.map((group) => group.title)).not.toContain('Card');
  });

  it('appears in the section editor for a block that declares it', () => {
    const editor = readFileSync('src/components/cms/section-editor-panel.tsx', 'utf8');
    expect(editor).toContain("{ id: 'form', label: 'Form' }");
    expect(editor).toContain('definition.formFields');
  });
});

describe('every block that embeds a form', () => {
  const formBlocks = Object.entries(BLOCKS).filter(([, block]) =>
    block.fields.some((field) => field.kind === 'form'),
  );

  it('finds them', () => {
    expect(formBlocks.map(([type]) => type).sort()).toEqual(
      [
        'blogNewsletter',
        'cta',
        'formBlock',
        'hero',
        'leadMagnet',
        'productPriceBox',
        'widgetForm',
        'widgetNewsletter',
      ].sort(),
    );
  });

  it('offers the Form tab, stores what it offers, and shows nothing twice', () => {
    for (const [type, block] of formBlocks) {
      expect(block.formFields?.length, type).toBeGreaterThan(0);
      const content = block.schema.parse({}) as Record<string, unknown>;
      expect(content.formStyle, type).toEqual(DEFAULT_FORM_STYLE);

      const tab = (block.formFields ?? []).flatMap((group) => group.fields.map((f) => f.name));
      for (const name of tab) {
        expect(readFieldPath(content, name), `${type}: ${name}`).not.toBeUndefined();
      }
      const contentTab = new Set(block.fields.map((field) => field.name));
      for (const name of tab) {
        expect(contentTab.has(name), `${type}: ${name} is on both tabs`).toBe(false);
      }
    }
  });

  it('draws its form through FormPanel, with its own style and placement', () => {
    const dir = 'src/components/cms/blocks';
    for (const file of readdirSync(dir)) {
      const source = readFileSync(join(dir, file), 'utf8');
      if (file !== 'form-panel.tsx') {
        expect(source, file).not.toContain('<PublicFormRenderer');
      }
      for (const usage of source.split('<FormPanel').slice(1)) {
        const props = usage.slice(0, usage.indexOf('/>'));
        expect(props, file).toContain('style={content.formStyle}');
        expect(props, file).toContain('instanceKey={');
      }
    }
  });

  it('keeps each placement’s rules and ids to itself', () => {
    const renderer = readFileSync('src/components/forms/public-form.tsx', 'utf8');
    expect(renderer).toContain('buildFormStyles(design, placementKey)');
    expect(renderer).toContain('idBase={placementKey}');
    expect(renderer).toContain('idPrefix={placementKey}');
  });
});
