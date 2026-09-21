import 'server-only';
import { NextResponse } from 'next/server';
import { getCurrentUser, isSuperAdmin, userCan, type SessionUser } from '@/lib/auth/guards';
import type { PermissionKey } from '@/lib/auth/permissions';

/**
 * Route-handler equivalent of `authorize()`.
 *
 * Pages redirect and Server Actions throw; a JSON route has to answer with a
 * status code instead, and must distinguish "not signed in" (401) from "signed
 * in but not allowed" (403) so the admin UI can react to each correctly.
 */
export type GuardResult =
  | { ok: true; user: SessionUser }
  | { ok: false; response: NextResponse };

export async function apiAuthorize(permission: PermissionKey): Promise<GuardResult> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Not signed in.' }, { status: 401 }),
    };
  }

  if (!userCan(user, permission)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'You do not have permission to perform this action.' },
        { status: 403 },
      ),
    };
  }

  return { ok: true, user };
}

/**
 * Route-handler guard for the super-admin-only endpoints.
 *
 * Same two status codes and the same reasoning as `apiAuthorize`, but the test
 * is the role itself rather than a permission: a permission can be granted to
 * any role from the Staff screen, and what this protects — running seed files
 * against the live database — is not something an administrator should be able
 * to delegate by ticking a box.
 */
export async function apiAuthorizeSuperAdmin(): Promise<GuardResult> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Not signed in.' }, { status: 401 }),
    };
  }

  if (!isSuperAdmin(user)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Forbidden. This action is restricted to super admins.' },
        { status: 403 },
      ),
    };
  }

  return { ok: true, user };
}

/** JSON body with a uniform shape, never cached. */
export function json(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: { 'cache-control': 'no-store' } });
}
