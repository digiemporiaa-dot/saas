/**
 * What a product's page calls things.
 *
 * A product can give its storage and users rows headings of its own, and a
 * section heading can carry the product's name. Both are worked out here, so
 * every block that shows them names them the same way.
 */

/** The heading a product gives a row, or the built-in one when it gave none. */
export function rowLabel(own: string | null | undefined, fallback: string): string {
  return own?.trim() || fallback;
}

/**
 * The heading of a row several products share, like a comparison table's.
 *
 * It is the heading they all give the row, and the built-in one when they
 * differ: one row cannot carry two names.
 */
export function sharedRowLabel(own: Array<string | null | undefined>, fallback: string): string {
  const names = new Set(own.map((label) => rowLabel(label, fallback)));
  const [only] = names;
  return names.size === 1 && only ? only : fallback;
}

/** A heading in which `{product}` stands for the product's name. */
export function withProductName(text: string, name: string): string {
  return text.split('{product}').join(name);
}
