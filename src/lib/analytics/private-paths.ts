import { LOGIN_PATH_SEGMENT } from '@/lib/auth/routes';

/**
 * The parts of the URL space that are not the public website.
 *
 * No marketing tag may load or record anything here: the admin, the sign-in
 * screen, two-factor setup and verification, content previews and the API.
 * The sign-in screen's segment comes from `routes.ts`, so moving that screen
 * moves this list with it.
 */
const PRIVATE_PREFIXES = ['/admin', '/auth', `/${LOGIN_PATH_SEGMENT}`, '/preview', '/api'];

/**
 * Whether a pathname belongs to the private side of the site.
 *
 * Matches a prefix exactly or as a parent segment, so `/admin/leads` is
 * private and `/authors` is not.
 */
export function isPrivatePath(pathname: string): boolean {
  return PRIVATE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
