import { z } from 'zod';
import { normaliseColor } from './color';

/**
 * The footer, as data.
 *
 * Two documents: `content` is what the footer says, `design` is what it looks
 * like. Both are parsed on the way out of the database, so a row written by an
 * older version of this file still renders — every field falls back to the
 * value the built-in footer uses, and a value nobody has set is `''`, which
 * means "whatever it already is" rather than blank.
 *
 * Deliberately not a block registry. The footer before this one was a list of
 * CMS sections with a builder, a design panel and a second set of switches on
 * the settings screen; three places to change one footer is three chances to
 * change the one that does nothing. This is a form.
 */

const text = (max: number, fallback = '') =>
  z.string().max(max).catch(fallback).default(fallback);
const bool = (fallback: boolean) => z.coerce.boolean().catch(fallback).default(fallback);
const colour = z
  .preprocess((v) => normaliseColor(typeof v === 'string' ? v : ''), z.string())
  .catch('')
  .default('');

/** A CSS length as typed, or blank for "leave it as it is". */
const LENGTH = /^-?\d+(\.\d+)?(px|%|rem|em|vw|vh|fr)$/;
const length = z
  .preprocess((raw) => {
    if (typeof raw === 'number' && Number.isFinite(raw)) return `${raw}px`;
    if (typeof raw !== 'string') return '';
    const value = raw.trim();
    if (!value) return '';
    if (LENGTH.test(value)) return value;
    if (/^-?\d+(\.\d+)?$/.test(value)) return `${value}px`;
    return '';
  }, z.string())
  .catch('')
  .default('');

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

export const LOGO_MODES = ['logoAndName', 'logo', 'name', 'none'] as const;
export type LogoMode = (typeof LOGO_MODES)[number];

const linkSchema = z.object({
  label: text(80),
  /** A path is resolved inside the market being browsed; a full URL is left alone. */
  url: text(400),
});

const columnSchema = z.object({
  heading: text(60),
  links: z.array(linkSchema).max(12).catch([]).default([]),
});

const brandSchema = z.object({
  show: bool(true),
  logoMode: z.enum(LOGO_MODES).catch('logoAndName').default('logoAndName'),
  /** Blank uses the site logo from Branding. */
  logoId: text(40),
  /** Blank uses the site name. */
  title: text(80),
  description: text(400),
  showSocials: bool(true),
});

const contactSchema = z.object({
  show: bool(true),
  heading: text(60, 'Get in touch'),
  showPhone: bool(true),
  showEmail: bool(true),
  showAddress: bool(true),
  /** Each blank uses the market's own, so one footer serves every market. */
  phone: text(40),
  email: text(160),
  address: text(200),
});

const bottomSchema = z.object({
  show: bool(true),
  showDivider: bool(true),
  /** `{year}` becomes this year and `{site}` the site name. */
  text: text(200, '© {year} {site}. All rights reserved.'),
  align: z.enum(['center', 'left', 'between']).catch('center').default('center'),
});

export const footerContentSchema = z.object({
  enabled: bool(true),
  brand: brandSchema.default(brandSchema.parse({})),
  columns: z.array(columnSchema).max(4).catch([]).default([]),
  contact: contactSchema.default(contactSchema.parse({})),
  bottom: bottomSchema.default(bottomSchema.parse({})),
});

export type FooterContent = z.infer<typeof footerContentSchema>;
export type FooterColumn = z.infer<typeof columnSchema>;

// ---------------------------------------------------------------------------
// Design
// ---------------------------------------------------------------------------

export const SOCIAL_STYLES = ['outline', 'filled', 'plain'] as const;
export type SocialStyle = (typeof SOCIAL_STYLES)[number];

const count = (fallback: number) =>
  z.coerce.number().int().min(0).max(6).catch(fallback).default(fallback);

export const footerDesignSchema = z.object({
  background: colour,
  text: colour,
  heading: colour,
  link: colour,
  linkHover: colour,
  /** The contact icons and anything else that should carry the brand colour. */
  icon: colour,
  divider: colour,

  paddingY: length,
  width: length,
  columnGap: length,
  rowGap: length,
  logoHeight: length,
  socialSize: length,
  socialStyle: z.enum(SOCIAL_STYLES).catch('outline').default('outline'),

  /**
   * The brand column's track. The rest share what is left equally.
   *
   * Wider than them by default, because the brand column carries a mark, a
   * sentence and a row of icons while the others carry four short links.
   */
  brandWidth: length.default('1.4fr'),
  columns: count(4),
  tabletColumns: count(0),
  mobileColumns: count(0),

  /** The rule above the bottom bar, from one edge of the screen to the other. */
  fullWidthDivider: bool(true),
});

export type FooterDesign = z.infer<typeof footerDesignSchema>;

export const DEFAULT_FOOTER_CONTENT: FooterContent = footerContentSchema.parse({});
export const DEFAULT_FOOTER_DESIGN: FooterDesign = footerDesignSchema.parse({});

export function parseFooterContent(raw: unknown): FooterContent {
  const result = footerContentSchema.safeParse(raw ?? {});
  return result.success ? result.data : DEFAULT_FOOTER_CONTENT;
}

export function parseFooterDesign(raw: unknown): FooterDesign {
  const result = footerDesignSchema.safeParse(raw ?? {});
  return result.success ? result.data : DEFAULT_FOOTER_DESIGN;
}

// ---------------------------------------------------------------------------
// CSS
// ---------------------------------------------------------------------------

type Vars = Record<string, string>;

function put(vars: Vars, name: string, value: string) {
  if (value) vars[name] = value;
}

/**
 * The design as custom properties.
 *
 * Only what somebody set is emitted; everything else is absent, and the rules
 * in globals.css carry the built-in value as each property's fallback. That is
 * what makes "blank means leave it alone" true rather than a promise.
 */
export function footerVars(design: FooterDesign): Vars {
  const vars: Vars = {};

  put(vars, '--footer-bg', design.background);
  put(vars, '--footer-text', design.text);
  put(vars, '--footer-heading', design.heading);
  put(vars, '--footer-link', design.link);
  put(vars, '--footer-link-hover', design.linkHover);
  put(vars, '--footer-icon', design.icon);
  put(vars, '--footer-divider', design.divider);

  put(vars, '--footer-padding-y', design.paddingY);
  put(vars, '--footer-width', design.width);
  put(vars, '--footer-column-gap', design.columnGap);
  put(vars, '--footer-row-gap', design.rowGap);
  put(vars, '--footer-logo-height', design.logoHeight);
  put(vars, '--footer-social-size', design.socialSize);

  vars['--footer-cols'] = columnTracks(design);
  vars['--footer-cols-tablet'] = even(design.tabletColumns || Math.min(design.columns || 4, 2));
  vars['--footer-cols-mobile'] = even(design.mobileColumns || 1);

  return vars;
}

function even(n: number): string {
  const clamped = Math.min(Math.max(Math.round(n) || 1, 1), 6);
  return `repeat(${clamped}, minmax(0, 1fr))`;
}

/**
 * The desktop tracks.
 *
 * The brand column is usually wider than the link columns beside it, so it may
 * name its own track; without one every column shares the row equally.
 */
function columnTracks(design: FooterDesign): string {
  const total = Math.min(Math.max(design.columns || 4, 1), 6);
  if (!design.brandWidth) return even(total);
  return [`minmax(0, ${design.brandWidth})`, ...Array(Math.max(total - 1, 0)).fill('minmax(0, 1fr)')].join(' ');
}

/** `{year}` and `{site}` filled in, which is what a copyright line is. */
export function renderCopyright(template: string, siteName: string): string {
  return template.replaceAll('{year}', String(new Date().getFullYear())).replaceAll('{site}', siteName);
}
