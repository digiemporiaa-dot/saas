/**
 * Where the seed-file screen lives in the URL space.
 *
 * Its own module, importing nothing, so the page, the admin navigation and the
 * reserved-segment list in `src/lib/country/routing.ts` — which middleware and
 * the edge runtime reach — all read one definition. Moving the screen means
 * editing this file and renaming the matching directory under `src/app`.
 *
 * The path is not a secret and is not what protects the screen; see the guard
 * in `src/app/seed-files/page.tsx`. It is reserved so that no market prefix or
 * CMS page slug can ever shadow it.
 */
export const SEED_FILES_PATH = '/seed-files';

/** The first path segment `SEED_FILES_PATH` occupies. */
export const SEED_FILES_SEGMENT = 'seed-files';
