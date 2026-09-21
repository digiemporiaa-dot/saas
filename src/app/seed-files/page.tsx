import type { Metadata } from 'next';
import Link from 'next/link';
import { requireSuperAdmin } from '@/lib/auth/guards';
import { listSeedFiles } from '@/lib/seed-files/seed-files.service';
import { SeedFilesManager } from '@/components/admin/seed-files/seed-files-manager';

export const metadata: Metadata = {
  title: 'Seed files',
  robots: { index: false, follow: false },
};

/** The directory is read per request: a file added a moment ago must show up. */
export const dynamic = 'force-dynamic';

/**
 * Seed files.
 *
 * The guard runs before the directory is read, not after — the listing itself
 * is information about the server and is not handed to anyone who may not run
 * it. `requireSuperAdmin` answers an anonymous request with the site's 404,
 * the way every admin route does, a half-authenticated one by sending it back
 * to its second factor, and a signed-in user who is not a super admin with a
 * real 403.
 *
 * This lives at `/seed-files` rather than under `/admin` because that is the
 * address it was asked to live at. The address is not what protects it: the
 * guard here protects the page and `apiAuthorizeSuperAdmin` protects the
 * endpoint that does the work, so finding the URL gains nothing.
 */
export default async function SeedFilesPage() {
  const user = await requireSuperAdmin();
  const files = await listSeedFiles();

  return (
    <div className="min-h-screen bg-muted/[0.04] px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <header>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Super admin · signed in as {user.email}
          </p>
          <h1 className="mt-2 font-heading text-2xl font-bold text-content">Seed files</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Every runnable seed in <code className="rounded bg-muted/10 px-1 py-0.5">prisma/seed/</code>.
            Tick the ones you want and run them — each executes on the server, against the database
            this site is connected to, and its output is shown below the file.
          </p>
        </header>

        <SeedFilesManager files={files} />

        <p className="text-xs text-muted">
          Seeds run one at a time, in the order listed, and the run stops at the first failure.
          Every run is recorded in the{' '}
          <Link href="/admin/audit" className="underline underline-offset-4 hover:text-brand">
            audit log
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
