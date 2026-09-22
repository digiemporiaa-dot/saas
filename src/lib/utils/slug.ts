import slugifyLib from 'slugify';

export function slugify(input: string): string {
  return slugifyLib(input, { lower: true, strict: true, trim: true });
}

/** Slug for CMS pages — allows nesting like "dropbox/business". Empty == homepage. */
export function pageSlug(input: string): string {
  const cleaned = input.trim().replace(/^\/+|\/+$/g, '');
  if (!cleaned) return '';
  return cleaned
    .split('/')
    .filter(Boolean)
    .map((segment) => slugify(segment))
    .filter(Boolean)
    .join('/');
}

/** Appends -2, -3, ... until `exists` reports the slug as free. */
export async function uniqueSlug(
  base: string,
  exists: (candidate: string) => Promise<boolean>,
): Promise<string> {
  const root = base || 'item';
  let candidate = root;
  let n = 1;
  while (await exists(candidate)) {
    n += 1;
    candidate = `${root}-${n}`;
  }
  return candidate;
}

/**
 * The slug something had before it was retired.
 *
 * Retiring a record renames its slug out of the way — `dropbox-standard`
 * becomes `dropbox-standard-deleted-1758...` — so the name is free for
 * whatever replaces it. Restoring reverses that: the URL a product is known
 * by, the one in every link and every search result, is part of it, and
 * bringing it back under a mangled name would be a different record wearing
 * its face.
 *
 * The suffix is generated, never typed, so stripping it cannot eat a slug an
 * administrator wrote: `-deleted-` followed by digits to the end of the string
 * is not a slug anyone chooses. A slug that is nothing else is left alone,
 * because an empty slug is not a URL.
 */
export function originalSlug(slug: string): string {
  const restored = slug.replace(/-deleted-\d+$/, '');
  return restored || slug;
}
