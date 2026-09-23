/**
 * The site's two buttons, as design values.
 *
 * Every public button carries one of two roles: **primary** (the solid, main
 * call to action) and **secondary** (the outline or second call to action next
 * to it). `buttonClasses` stamps the role on the element, and this file turns
 * the Website design settings for each role into the rules that paint it.
 *
 * Same rule as the header's design values: **only what somebody set is
 * emitted.** A style left at its default and colours left blank produce no
 * CSS at all, so every button keeps exactly the look it had before.
 */

import { cssColor, cssLength } from './chrome';

export type ButtonRole = 'primary' | 'secondary';

export const BUTTON_STYLES = ['solid', 'outline', 'soft'] as const;
export type ButtonStyle = (typeof BUTTON_STYLES)[number];

/** What each role looks like when nobody has chosen otherwise. */
export const DEFAULT_BUTTON_STYLE: Record<ButtonRole, ButtonStyle> = {
  primary: 'solid',
  secondary: 'outline',
};

/** The class `buttonClasses` puts on a button of each role. */
export const BUTTON_ROLE_CLASS: Record<ButtonRole, string> = {
  primary: 'btn-role-primary',
  secondary: 'btn-role-secondary',
};

export type ButtonSettings = {
  colorPrimary: string;
  colorSecondary: string;
  buttonBorderWidth: string;
  buttonPrimaryStyle: string;
  buttonPrimaryBg: string;
  buttonPrimaryText: string;
  buttonPrimaryBorder: string;
  buttonPrimaryHoverBg: string;
  buttonPrimaryHoverText: string;
  buttonPrimaryHoverBorder: string;
  buttonSecondaryStyle: string;
  buttonSecondaryBg: string;
  buttonSecondaryText: string;
  buttonSecondaryBorder: string;
  buttonSecondaryHoverBg: string;
  buttonSecondaryHoverText: string;
  buttonSecondaryHoverBorder: string;
};

/** One role's colours. Anything undefined is left to the button itself. */
export type ButtonLook = {
  bg?: string;
  text?: string;
  border?: string;
  hoverBg?: string;
  hoverText?: string;
  hoverBorder?: string;
};

const darker = (colour: string) => `color-mix(in srgb, ${colour} 88%, #000)`;
const tint = (colour: string, percent: number) =>
  `color-mix(in srgb, ${colour} ${percent}%, transparent)`;

function parseStyle(value: string | null | undefined, role: ButtonRole): ButtonStyle {
  return (BUTTON_STYLES as readonly string[]).includes(value ?? '')
    ? (value as ButtonStyle)
    : DEFAULT_BUTTON_STYLE[role];
}

/** The colours a style implies for a base colour. */
function styleLook(style: ButtonStyle, colour: string): ButtonLook {
  switch (style) {
    case 'solid':
      return {
        bg: colour,
        text: '#FFFFFF',
        border: colour,
        hoverBg: darker(colour),
        hoverText: '#FFFFFF',
        hoverBorder: darker(colour),
      };
    case 'outline':
      return {
        bg: 'transparent',
        text: colour,
        border: colour,
        hoverBg: tint(colour, 10),
        hoverText: colour,
        hoverBorder: colour,
      };
    case 'soft':
      return {
        bg: tint(colour, 14),
        text: colour,
        border: 'transparent',
        hoverBg: tint(colour, 24),
        hoverText: colour,
        hoverBorder: 'transparent',
      };
  }
}

/**
 * The theme colour a style is drawn in. A filled secondary button uses the
 * secondary colour; an outline or tinted one uses the primary colour, which
 * is what the site's outline buttons have always been drawn in.
 */
function brandColour(settings: Partial<ButtonSettings>, role: ButtonRole, style: ButtonStyle) {
  const useSecondary = role === 'secondary' && style === 'solid';
  return (
    cssColor(useSecondary ? settings.colorSecondary : settings.colorPrimary) ??
    (useSecondary ? '#0B1B34' : '#0061FF')
  );
}

function field(settings: Partial<ButtonSettings>, role: ButtonRole, name: string) {
  const key =
    `button${role === 'primary' ? 'Primary' : 'Secondary'}${name}` as keyof ButtonSettings;
  return cssColor(settings[key]) ?? undefined;
}

/**
 * The colours one role resolves to.
 *
 * A style other than the role's default fills in a full look from a theme
 * colour (see `brandColour`); each colour typed in replaces its part of that. A background
 * or text colour set without its hover twin carries into hover, darkened for
 * the background, so the button still reacts to the pointer.
 */
export function buttonLook(settings: Partial<ButtonSettings>, role: ButtonRole): ButtonLook {
  const style = parseStyle(
    role === 'primary' ? settings.buttonPrimaryStyle : settings.buttonSecondaryStyle,
    role,
  );
  const base =
    style === DEFAULT_BUTTON_STYLE[role]
      ? {}
      : styleLook(style, brandColour(settings, role, style));

  const bg = field(settings, role, 'Bg');
  const text = field(settings, role, 'Text');
  const border = field(settings, role, 'Border');

  const look: ButtonLook = {
    bg: bg ?? base.bg,
    text: text ?? base.text,
    border: border ?? base.border,
    hoverBg: field(settings, role, 'HoverBg') ?? (bg ? darker(bg) : base.hoverBg),
    hoverText: field(settings, role, 'HoverText') ?? text ?? base.hoverText,
    hoverBorder: field(settings, role, 'HoverBorder') ?? border ?? base.hoverBorder,
  };
  return Object.fromEntries(Object.entries(look).filter(([, v]) => v)) as ButtonLook;
}

function declarations(entries: Array<[string, string | undefined]>): string {
  return entries
    .filter((entry): entry is [string, string] => Boolean(entry[1]))
    .map(([name, value]) => `${name}:${value};`)
    .join('');
}

/**
 * Both roles as a stylesheet, empty when nothing was set.
 *
 * The selectors are deliberately three classes deep: they have to beat the
 * utility colours `buttonClasses` puts on every button (one class, two on
 * hover) and a section's own button rule (two), whatever order the sheets
 * load in. Only buttons marked `btn-tokens` — the public site's — are touched;
 * the admin's buttons are not the website's.
 *
 * The primary button still defers to a section that chose its own button
 * colour, through `--sec-button` / `--sec-button-text`, so a section's Design
 * panel keeps working on top of the global look.
 */
export function buttonStylesheet(settings: Partial<ButtonSettings>): string {
  const width = cssLength(settings.buttonBorderWidth);
  const rules: string[] = [];

  for (const role of ['primary', 'secondary'] as const) {
    const look = buttonLook(settings, role);
    const selector = `:root .btn-tokens.${BUTTON_ROLE_CLASS[role]}`;
    // Only a filled primary button takes a section's button colour; an outline
    // or tint would turn into a solid block of it.
    const inSection =
      role === 'primary' && parseStyle(settings.buttonPrimaryStyle, role) === 'solid';
    const sectionBg = look.bg && inSection ? `var(--sec-button, ${look.bg})` : look.bg;
    // A hover nobody typed follows the section's colour too, rather than
    // flashing back to the global one.
    const hoverBg =
      inSection && sectionBg && !field(settings, role, 'HoverBg')
        ? darker(sectionBg)
        : look.hoverBg;
    const hoverText =
      inSection && look.hoverText && !field(settings, role, 'HoverText')
        ? `var(--sec-button-text, ${look.hoverText})`
        : look.hoverText;

    const base = declarations([
      ['background-color', sectionBg],
      ['color', look.text && (inSection ? `var(--sec-button-text, ${look.text})` : look.text)],
      ['border-color', look.border],
      ['border-style', look.border ? 'solid' : undefined],
      ['border-width', look.border ? (width ?? '1px') : undefined],
    ]);
    const hover = declarations([
      ['background-color', hoverBg],
      ['color', hoverText],
      ['border-color', look.hoverBorder],
    ]);

    if (base) rules.push(`${selector}{${base}}`);
    // A width with no colour of this role's own thickens only the borders
    // buttons already draw (the outline variant's `border`); on a filled
    // button it would conjure a grey frame out of nothing.
    if (width && !look.border) rules.push(`${selector}.border{border-width:${width};}`);
    if (hover) rules.push(`${selector}:hover{${hover}}`);
  }

  return rules.join('');
}

/**
 * What the admin preview draws: the resolved look over the look each role has
 * with nothing set, so a blank form still previews the real buttons.
 */
export function previewLook(
  settings: Partial<ButtonSettings>,
  role: ButtonRole,
): Required<ButtonLook> {
  const fallback = styleLook(
    DEFAULT_BUTTON_STYLE[role],
    brandColour(settings, role, DEFAULT_BUTTON_STYLE[role]),
  );
  return { ...fallback, ...buttonLook(settings, role) } as Required<ButtonLook>;
}
