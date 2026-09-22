import { countryPath } from '@/lib/country/routing';
import type { CountryContext } from '@/lib/country/types';

/**
 * Which addresses a redirect rule is matched against.
 *
 * Kept apart from the lookup itself so the matching can be read — and tested —
 * without a database. The two rules it encodes:
 *
 * - A rule written for `/old-plan` applies in every market, because the
 *   market-relative address is tried as well as the full one.
 * - A rule written for `/ae/old-plan` applies only there, because the UAE is
 *   the only market whose full address is that.
 *
 * Leading and trailing slashes are never the difference between a rule that
 * works and one that does not: every form of each address is tried, so
 * `old-plan` and `/old-plan` are the same rule.
 */

/** The full and market-relative addresses one request should be matched on. */
export function redirectLookupPaths(
  country: Pick<CountryContext, 'slug'>,
  path: string,
): { full: string; relative: string } {
  const relative = `/${path.replace(/^\/+/, '')}`;
  return { full: countryPath(country, relative), relative };
}

/** Every spelling of those addresses, deduplicated, as stored sources. */
export function redirectCandidates(path: string, fallbackPath?: string): string[] {
  const variants = (value: string) => [
    value,
    value.startsWith('/') ? value : `/${value}`,
    value.replace(/^\//, ''),
  ];

  return Array.from(
    new Set([...variants(path), ...(fallbackPath ? variants(fallbackPath) : [])]),
  );
}

/** A rule that points at its own source is ignored rather than looped on. */
export function isSelfRedirect(source: string, destination: string): boolean {
  const normalise = (value: string) => value.replace(/^\/+|\/+$/g, '');
  return normalise(source) === normalise(destination);
}
