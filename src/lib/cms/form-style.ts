import { z } from 'zod';
import { normaliseColor } from './color';
import { normaliseLength } from './design';
import type { FieldDescriptor } from './fields';
import type { FormDesign } from '@/lib/forms/form-design';

/**
 * One placement's restyling of a form.
 *
 * A form has its own design, set once in Forms → Design and shared by every
 * page it appears on. A section that embeds the form can restyle it for that
 * one placement — the heading above it, the colours of its text, fields and
 * button, the button's alignment, the card it sits in — without touching the
 * form or any other page that uses it. That is the Form tab of the section
 * editor, and this is what it stores, under `content.formStyle`.
 *
 * Every value is blank by default, and blank means "whatever the form's own
 * design says". A section nobody restyled renders exactly as it always did.
 */

const colour = z
  .string()
  .trim()
  .transform((value) => normaliseColor(value))
  .catch('')
  .default('');

const length = z.preprocess(normaliseLength, z.string()).catch('').default('');

export const FORM_HEADING_ALIGNS = ['inherit', 'left', 'center', 'right'] as const;
export const FORM_BUTTON_ALIGNS = ['inherit', 'left', 'center', 'right', 'full'] as const;
export const FORM_CARD_SHADOWS = ['inherit', 'none', 'sm', 'md', 'lg'] as const;

export const formStyleSchema = z.object({
  // Heading — the text is used by blocks with no form heading of their own.
  heading: z.string().max(160).catch('').default(''),
  description: z.string().max(400).catch('').default(''),
  headingAlign: z.enum(FORM_HEADING_ALIGNS).catch('inherit').default('inherit'),
  headingColor: colour,
  headingSize: length,
  descriptionColor: colour,

  // Text and fields
  labelColor: colour,
  inputTextColor: colour,
  helpColor: colour,
  inputBackground: colour,
  inputBorderColor: colour,
  inputRadius: length,

  // Button
  buttonLabel: z.string().max(60).catch('').default(''),
  buttonAlign: z.enum(FORM_BUTTON_ALIGNS).catch('inherit').default('inherit'),
  buttonBackground: colour,
  buttonTextColor: colour,
  buttonHoverBackground: colour,
  buttonHoverTextColor: colour,
  buttonRadius: length,

  // The card the form sits in
  cardBackground: colour,
  cardBorderColor: colour,
  cardRadius: length,
  cardPadding: length,
  cardShadow: z.enum(FORM_CARD_SHADOWS).catch('inherit').default('inherit'),
});

export type FormStyle = z.infer<typeof formStyleSchema>;

export const DEFAULT_FORM_STYLE: FormStyle = formStyleSchema.parse({});

/**
 * The key a block schema stores it under. Anything that is not an object —
 * nothing at all, for every section saved before this existed — reads as the
 * blank style rather than failing the whole section.
 */
export const formStyleField = formStyleSchema.catch(() => DEFAULT_FORM_STYLE);

/**
 * The form's own design with this placement's choices laid over it.
 *
 * Only values somebody set replace anything, so the result differs from the
 * form's design in exactly the places the Form tab was used.
 */
export function applyFormStyle(design: FormDesign, style: FormStyle | null | undefined): FormDesign {
  if (!style) return design;
  const next: FormDesign = structuredClone(design);

  if (style.labelColor) next.typography.label.color = style.labelColor;
  if (style.inputTextColor) next.typography.input.color = style.inputTextColor;
  if (style.helpColor) next.typography.help.color = style.helpColor;
  if (style.inputBackground) next.input.background = style.inputBackground;
  if (style.inputBorderColor) {
    next.input.border.color = style.inputBorderColor;
    if (next.input.border.style === 'none') next.input.border.style = 'solid';
  }
  if (style.inputRadius) next.input.border.radius = style.inputRadius;

  if (style.buttonAlign === 'full') {
    next.button.width = 'full';
  } else if (style.buttonAlign !== 'inherit') {
    next.button.align = style.buttonAlign;
    // An alignment means nothing to a button that fills the row.
    if (next.button.width === 'full') next.button.width = 'auto';
  }
  if (style.buttonBackground) next.button.background = style.buttonBackground;
  if (style.buttonTextColor) next.button.textColor = style.buttonTextColor;
  if (style.buttonHoverBackground) next.button.hoverBackground = style.buttonHoverBackground;
  if (style.buttonHoverTextColor) next.button.hoverTextColor = style.buttonHoverTextColor;
  if (style.buttonRadius) next.button.border.radius = style.buttonRadius;

  return next;
}

const SHADOWS: Record<Exclude<FormStyle['cardShadow'], 'inherit'>, string> = {
  none: 'none',
  sm: '0 1px 2px rgb(0 0 0 / 0.05)',
  md: '0 4px 12px rgb(0 0 0 / 0.08)',
  lg: '0 10px 30px rgb(0 0 0 / 0.12)',
};

/**
 * The card's inline style. Inline, so each value wins over the classes that
 * give a block's card its usual look, and nothing else of that look changes.
 */
export function formCardStyle(style: FormStyle): Record<string, string> {
  const css: Record<string, string> = {};
  if (style.cardBackground) css.backgroundColor = style.cardBackground;
  if (style.cardBorderColor) css.borderColor = style.cardBorderColor;
  if (style.cardRadius) css.borderRadius = style.cardRadius;
  if (style.cardPadding) css.padding = style.cardPadding;
  if (style.cardShadow !== 'inherit') css.boxShadow = SHADOWS[style.cardShadow];
  return css;
}

/** True where this placement asks for a card at all. */
export function wantsFormCard(style: FormStyle): boolean {
  return Boolean(
    style.cardBackground ||
      style.cardBorderColor ||
      (style.cardShadow !== 'inherit' && style.cardShadow !== 'none'),
  );
}

/** Whether a placement changed anything about how its form is drawn. */
export function hasFormStyle(style: FormStyle | null | undefined): boolean {
  if (!style) return false;
  return JSON.stringify(style) !== JSON.stringify(DEFAULT_FORM_STYLE);
}

// ---------------------------------------------------------------------------
// The Form tab
// ---------------------------------------------------------------------------

export type FormFieldGroup = { title: string; help?: string; fields: FieldDescriptor[] };

const alignOptions = (inheritLabel: string) => [
  { label: inheritLabel, value: 'inherit' },
  { label: 'Left', value: 'left' },
  { label: 'Centre', value: 'center' },
  { label: 'Right', value: 'right' },
];

/**
 * The Form tab's controls, in groups.
 *
 * `heading`, `description` and `buttonLabel` name where those texts are
 * stored. A block that already had one of its own (the hero's form heading,
 * the lead magnet's button label) points it at that field, so the control
 * moves to this tab without the value moving in the database;
 * `description: null` leaves a block without one.
 */
export function formStyleGroups(
  options: {
    heading?: string;
    description?: string | null;
    buttonLabel?: string;
    /** False where the block already is the form's card (a sidebar widget). */
    card?: boolean;
  } = {},
): FormFieldGroup[] {
  const heading = options.heading ?? 'formStyle.heading';
  const description =
    options.description === undefined ? 'formStyle.description' : options.description;
  const buttonLabel = options.buttonLabel ?? 'formStyle.buttonLabel';

  const groups: FormFieldGroup[] = [
    {
      title: 'Heading',
      help: 'Shown above the form. Leave the heading empty for none.',
      fields: [
        { kind: 'text', name: heading, label: 'Form heading' },
        ...(description
          ? ([
              { kind: 'textarea', name: description, label: 'Text under the heading', rows: 2 },
            ] as FieldDescriptor[])
          : []),
        {
          kind: 'select',
          name: 'formStyle.headingAlign',
          label: 'Alignment',
          width: 'half',
          options: alignOptions('Default'),
        },
        { kind: 'length', name: 'formStyle.headingSize', label: 'Heading size', width: 'half' },
        { kind: 'color', name: 'formStyle.headingColor', label: 'Heading colour', width: 'half' },
        ...(description
          ? ([
              {
                kind: 'color',
                name: 'formStyle.descriptionColor',
                label: 'Text colour',
                width: 'half',
              },
            ] as FieldDescriptor[])
          : []),
      ],
    },
    {
      title: 'Text and fields',
      fields: [
        { kind: 'color', name: 'formStyle.labelColor', label: 'Label colour', width: 'half' },
        {
          kind: 'color',
          name: 'formStyle.inputTextColor',
          label: 'Typed text colour',
          width: 'half',
        },
        {
          kind: 'color',
          name: 'formStyle.helpColor',
          label: 'Small print colour',
          width: 'half',
          help: 'Help text under fields and the consent line.',
        },
        {
          kind: 'color',
          name: 'formStyle.inputBackground',
          label: 'Field background',
          width: 'half',
        },
        {
          kind: 'color',
          name: 'formStyle.inputBorderColor',
          label: 'Field border',
          width: 'half',
        },
        { kind: 'length', name: 'formStyle.inputRadius', label: 'Field corners', width: 'half' },
      ],
    },
    {
      title: 'Button',
      fields: [
        {
          kind: 'text',
          name: buttonLabel,
          label: 'Button text',
          placeholder: 'The form’s own button text',
          width: 'half',
        },
        {
          kind: 'select',
          name: 'formStyle.buttonAlign',
          label: 'Alignment',
          width: 'half',
          options: [...alignOptions('Form default'), { label: 'Full width', value: 'full' }],
        },
        {
          kind: 'color',
          name: 'formStyle.buttonBackground',
          label: 'Button colour',
          width: 'half',
        },
        {
          kind: 'color',
          name: 'formStyle.buttonTextColor',
          label: 'Button text colour',
          width: 'half',
        },
        {
          kind: 'color',
          name: 'formStyle.buttonHoverBackground',
          label: 'Colour on hover',
          width: 'half',
        },
        {
          kind: 'color',
          name: 'formStyle.buttonHoverTextColor',
          label: 'Text colour on hover',
          width: 'half',
        },
        { kind: 'length', name: 'formStyle.buttonRadius', label: 'Button corners', width: 'half' },
      ],
    },
    {
      title: 'Card',
      help: 'The box the form sits in.',
      fields: [
        { kind: 'color', name: 'formStyle.cardBackground', label: 'Background', width: 'half' },
        { kind: 'color', name: 'formStyle.cardBorderColor', label: 'Border', width: 'half' },
        { kind: 'length', name: 'formStyle.cardRadius', label: 'Corners', width: 'half' },
        { kind: 'length', name: 'formStyle.cardPadding', label: 'Inner spacing', width: 'half' },
        {
          kind: 'select',
          name: 'formStyle.cardShadow',
          label: 'Shadow',
          width: 'half',
          options: [
            { label: 'Default', value: 'inherit' },
            { label: 'None', value: 'none' },
            { label: 'Soft', value: 'sm' },
            { label: 'Medium', value: 'md' },
            { label: 'Strong', value: 'lg' },
          ],
        },
      ],
    },
  ];
  return options.card === false ? groups.filter((group) => group.title !== 'Card') : groups;
}
