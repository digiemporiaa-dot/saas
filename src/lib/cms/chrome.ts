/**
 * The header and the footer, as design values.
 *
 * Everything here is pure: settings in, CSS custom properties out. That is
 * what lets the whole of the site's chrome be restyled from the admin without
 * a class name being built from data anywhere, and what lets the rules be read
 * and tested without a browser or a database.
 *
 * The one rule that matters: **a variable is emitted only for a value somebody
 * set.** Every component keeps its original appearance as the fallback inside
 * its own `var(--x, original)`, so a site that never opens the design screen
 * renders exactly the header and footer it rendered before this existed. An
 * empty or unusable value is not "transparent" or "0" — it is "leave it alone".
 */

import { normaliseColor } from './color';

/** A CSS length the admin may type. Anything else is ignored. */
const LENGTH = /^-?\d+(\.\d+)?(px|%|rem|em|vw|vh|ch)$/;

export function cssLength(value: string | null | undefined): string | null {
  const trimmed = (value ?? '').trim();
  return LENGTH.test(trimmed) ? trimmed : null;
}

/**
 * A colour, with its opacity inside it: `#RRGGBB` or `#RRGGBBAA`. Null for
 * anything else, which leaves whatever the component already looked like.
 */
export function cssColor(value: string | null | undefined): string | null {
  return normaliseColor(value) || null;
}

export function cssWeight(value: string | null | undefined): string | null {
  const parsed = Number.parseInt((value ?? '').trim(), 10);
  return Number.isFinite(parsed) && parsed >= 100 && parsed <= 900 ? String(parsed) : null;
}

const TRANSFORMS = new Set(['none', 'uppercase', 'lowercase', 'capitalize']);

export function cssTransform(value: string | null | undefined): string | null {
  const trimmed = (value ?? '').trim().toLowerCase();
  return TRANSFORMS.has(trimmed) && trimmed !== 'none' ? trimmed : null;
}

/**
 * How far the header blurs what scrolls under it.
 *
 * A length, and a small one — 40px of blur is the most anybody means by
 * "glass" and more than that is a smear. Capped rather than refused, because
 * somebody typing 200px wanted the strongest blur there is.
 */
export function cssBlur(value: string | null | undefined): string | null {
  const match = /^(\d+(?:\.\d+)?)(px|rem)?$/.exec((value ?? '').trim());
  if (!match) return null;

  // A bare number means pixels, and rem is converted rather than refused — the
  // one thing that must not happen is "1.5rem" becoming 1.5 pixels.
  const amount = Number.parseFloat(match[1]) * (match[2] === 'rem' ? 16 : 1);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return `${Math.min(amount, 40)}px`;
}

/**
 * How much it saturates what shows through, as a percentage.
 *
 * Saturating past 100% is what stops a blurred backdrop looking washed out,
 * and is most of the difference between glass and frosted plastic.
 */
export function cssSaturate(value: string | null | undefined): string | null {
  const raw = (value ?? '').trim().replace(/%$/, '');
  if (!raw) return null;

  const amount = Number.parseFloat(raw);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return `${Math.min(amount, 300)}%`;
}

/** Named shadows rather than free text: a box-shadow is not a value to trust. */
const SHADOWS: Record<string, string> = {
  none: 'none',
  sm: '0 1px 2px rgb(0 0 0 / 0.05)',
  md: '0 4px 12px rgb(0 0 0 / 0.08)',
  lg: '0 10px 30px rgb(0 0 0 / 0.12)',
};

export function cssShadow(value: string | null | undefined): string | null {
  const key = (value ?? '').trim().toLowerCase();
  return key && key !== 'none' && SHADOWS[key] ? SHADOWS[key] : null;
}

export const SHADOW_NAMES = Object.keys(SHADOWS);

/** What the two renderers need from the settings row, and nothing more. */
export type ChromeSettings = {
  headerHeight: string;
  headerHeightMobile: string;
  headerWidth: string;
  headerBg: string;
  headerText: string;
  headerLinkHover: string;
  headerLinkActive: string;
  headerBorderColor: string;
  headerShadow: string;
  headerBlur: string;
  headerSaturate: string;
  headerMenuGap: string;
  headerMenuSize: string;
  headerMenuWeight: string;
  headerMenuTransform: string;
  headerLogoHeight: string;
  headerLogoHeightMobile: string;
  headerLogoMaxWidth: string;
  announcementBgColor: string;
  announcementTextColor: string;
  footerBg: string;
  footerText: string;
  footerHeadingColor: string;
  footerLinkColor: string;
  footerLinkHover: string;
  footerBorderColor: string;
  footerPaddingY: string;
  footerWidth: string;
  footerColumnGap: string;
  footerLogoHeight: string;
  footerSocialSize: string;
  footerContactColor: string;
};

type Vars = Record<string, string>;

function put(vars: Vars, name: string, value: string | null) {
  if (value) vars[name] = value;
}

/**
 * The header's variables.
 *
 * `--header-height` is also what the mobile drawer measures itself from, so a
 * taller header does not leave the drawer overlapping it.
 */
export function headerVars(settings: Partial<ChromeSettings>): Vars {
  const vars: Vars = {};

  put(vars, '--header-height', cssLength(settings.headerHeight));
  put(vars, '--header-width', cssLength(settings.headerWidth));
  put(vars, '--header-bg', cssColor(settings.headerBg));
  put(vars, '--header-text', cssColor(settings.headerText));
  put(vars, '--header-link-hover', cssColor(settings.headerLinkHover));
  put(vars, '--header-link-active', cssColor(settings.headerLinkActive));
  put(vars, '--header-border-color', cssColor(settings.headerBorderColor));
  put(vars, '--header-shadow', cssShadow(settings.headerShadow));

  /*
   * Glass.
   *
   * The two filters are emitted as one `backdrop-filter` value, because a
   * blur without the saturation looks washed out and setting one without the
   * other is almost never what somebody means. Emitted only when at least one
   * was set: with neither, the header keeps the slight fixed blur it has
   * always had.
   */
  const blur = cssBlur(settings.headerBlur);
  const saturate = cssSaturate(settings.headerSaturate);
  if (blur || saturate) {
    put(vars, '--header-backdrop', [blur && `blur(${blur})`, saturate && `saturate(${saturate})`]
      .filter(Boolean)
      .join(' '));
  }
  put(vars, '--header-menu-gap', cssLength(settings.headerMenuGap));
  put(vars, '--header-menu-size', cssLength(settings.headerMenuSize));
  put(vars, '--header-menu-weight', cssWeight(settings.headerMenuWeight));
  put(vars, '--header-menu-transform', cssTransform(settings.headerMenuTransform));
  put(vars, '--header-logo-height', cssLength(settings.headerLogoHeight));
  put(vars, '--header-logo-max-width', cssLength(settings.headerLogoMaxWidth));
  put(vars, '--announcement-bg', cssColor(settings.announcementBgColor));
  put(vars, '--announcement-text', cssColor(settings.announcementTextColor));

  return vars;
}

/** The header's phone-sized overrides, which only exist where one was set. */
export function headerMobileVars(settings: Partial<ChromeSettings>): Vars {
  const vars: Vars = {};
  put(vars, '--header-height', cssLength(settings.headerHeightMobile));
  put(vars, '--header-logo-height', cssLength(settings.headerLogoHeightMobile));
  return vars;
}

export function footerVars(settings: Partial<ChromeSettings>): Vars {
  const vars: Vars = {};

  put(vars, '--footer-bg', cssColor(settings.footerBg));
  put(vars, '--footer-text', cssColor(settings.footerText));
  put(vars, '--footer-heading', cssColor(settings.footerHeadingColor));
  put(vars, '--footer-link', cssColor(settings.footerLinkColor));
  put(vars, '--footer-link-hover', cssColor(settings.footerLinkHover));
  put(vars, '--footer-border', cssColor(settings.footerBorderColor));
  put(vars, '--footer-padding-y', cssLength(settings.footerPaddingY));
  put(vars, '--footer-width', cssLength(settings.footerWidth));
  put(vars, '--footer-column-gap', cssLength(settings.footerColumnGap));
  put(vars, '--footer-logo-height', cssLength(settings.footerLogoHeight));
  put(vars, '--footer-social-size', cssLength(settings.footerSocialSize));
  put(vars, '--footer-contact', cssColor(settings.footerContactColor));

  return vars;
}

/**
 * Both sets as a stylesheet, with the phone overrides in their media query.
 *
 * Returned as text rather than as inline styles because the header is sticky
 * and the footer is a separate element: one `:root` block reaches both, and a
 * media query cannot be expressed as a style attribute at all.
 */
export function chromeStylesheet(settings: Partial<ChromeSettings>): string {
  const declare = (vars: Vars) =>
    Object.entries(vars)
      .map(([name, value]) => `${name}:${value};`)
      .join('');

  const base = { ...headerVars(settings), ...footerVars(settings) };
  const mobile = headerMobileVars(settings);

  const blocks: string[] = [];
  if (Object.keys(base).length > 0) blocks.push(`:root{${declare(base)}}`);
  if (Object.keys(mobile).length > 0) {
    blocks.push(`@media (max-width:1023px){:root{${declare(mobile)}}}`);
  }
  return blocks.join('');
}
