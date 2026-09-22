/**
 * Colours, with an opacity.
 *
 * Every colour an administrator picks is stored as hex, and hex already has a
 * way to say "and this transparent": `#RRGGBBAA`. Using it means opacity costs
 * no second field anywhere — no column, no schema key, no extra form input to
 * keep in sync with the colour it belongs to — and what is stored is still a
 * single value that every browser understands wherever a colour is written.
 *
 * `#RRGGBB` and `#RRGGBBAA` are both accepted, and a fully opaque colour is
 * always written back as the six-digit form: `#0061FFFF` and `#0061FF` are the
 * same colour, and storing one spelling keeps a saved value comparable with
 * the default it might equal.
 */

/**
 * The canonical spelling, and what the schemas validate against: a hash, then
 * six digits or eight.
 */
export const HEX_COLOR = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

/**
 * What a person might reasonably type, which is more than that: the hash is
 * optional and `#FFF` is a colour. Reading is forgiving; what gets written
 * back is always canonical.
 */
const TYPED = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

export type ParsedColor = {
  /** The colour without its opacity, always `#RRGGBB` and uppercase. */
  hex: string;
  /** 0–100. A colour with no alpha is fully opaque. */
  alpha: number;
};

/** Splits a stored colour into the part a colour picker shows and its opacity. */
export function parseColor(value: string | null | undefined): ParsedColor | null {
  const match = TYPED.exec((value ?? '').trim());
  if (!match) return null;

  const digits = match[1].toUpperCase();
  // `#FFF` is `#FFFFFF`: expanded here so everything downstream sees one shape.
  const expanded =
    digits.length === 3
      ? digits
          .split('')
          .map((digit) => digit + digit)
          .join('')
      : digits;

  const hex = `#${expanded.slice(0, 6)}`;
  if (expanded.length === 6) return { hex, alpha: 100 };

  const alpha = parseInt(expanded.slice(6, 8), 16);
  // Rounded to whole percent, which is the only resolution the control offers
  // and enough for anything anybody is doing by eye.
  return { hex, alpha: Math.round((alpha / 255) * 100) };
}

/**
 * Puts the two back together.
 *
 * Fully opaque comes back as six digits, so a colour nobody made transparent
 * is stored exactly as it always was.
 */
export function composeColor(hex: string, alpha: number): string {
  const base = (hex ?? '').trim().toUpperCase();
  if (!/^#[0-9A-F]{6}$/.test(base)) return '';

  const clamped = Math.min(Math.max(Math.round(alpha), 0), 100);
  if (clamped >= 100) return base;

  const byte = Math.round((clamped / 100) * 255)
    .toString(16)
    .toUpperCase()
    .padStart(2, '0');
  return `${base}${byte}`;
}

/**
 * A stored colour in its canonical spelling, or `''` where it is not a colour.
 *
 * `''` means "inherit" everywhere this is used, which is why an unusable value
 * becomes one rather than becoming black.
 */
export function normaliseColor(value: string | null | undefined): string {
  const parsed = parseColor(value);
  return parsed ? composeColor(parsed.hex, parsed.alpha) : '';
}

/** True where a colour carries an opacity below full. */
export function hasOpacity(value: string | null | undefined): boolean {
  const parsed = parseColor(value);
  return parsed !== null && parsed.alpha < 100;
}
