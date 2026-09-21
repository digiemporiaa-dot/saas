import Link from 'next/link';

/**
 * The body of every 403 in the app.
 *
 * Rendered when a Server Component calls `forbidden()` — today that is the
 * super-admin guard in src/lib/auth/guards.ts. It says what happened and no
 * more: the visitor is signed in, so the page's existence is not a secret, but
 * nothing about what is behind it is worth spelling out either.
 */
export default function Forbidden() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/[0.04] px-4 py-12">
      <div className="w-full max-w-md text-center">
        <p className="font-heading text-sm font-semibold uppercase tracking-wide text-muted">
          403
        </p>
        <h1 className="mt-2 font-heading text-2xl font-bold text-content">Forbidden</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          You are signed in, but your role does not allow this page. If you need it, ask a super
          admin.
        </p>
        <Link
          href="/admin"
          className="mt-8 inline-flex items-center justify-center rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          Back to the admin
        </Link>
      </div>
    </div>
  );
}
