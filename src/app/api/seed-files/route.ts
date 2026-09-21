import { apiAuthorizeSuperAdmin, json } from '@/lib/api/guard';
import { recordAudit } from '@/lib/services/audit';
import {
  listSeedFiles,
  runSeedFiles,
  SeedRunBusyError,
  unknownNames,
} from '@/lib/seed-files/seed-files.service';

/**
 * The seed-file endpoints.
 *
 * Both are super-admin only, and the check happens here rather than in
 * middleware. Middleware in this app cannot read the database, which is where
 * the answers to "is this session still valid?", "what role is this user?" and
 * "has this session cleared two-factor authentication?" live — so it could
 * only ever guess. The URL is not the boundary either: `/seed-files` is
 * guessable by design, and guessing it gets an anonymous caller a 401 and a
 * signed-in non-super-admin a 403 from these two functions.
 */

export const dynamic = 'force-dynamic';
/** A seed writes a lot of rows; the default 30s is not enough for several. */
export const maxDuration = 300;

/** What is in `prisma/seed/` right now. */
export async function GET() {
  const guard = await apiAuthorizeSuperAdmin();
  if (!guard.ok) return guard.response;

  return json({ files: await listSeedFiles() });
}

/** Runs the selected seed files, in dependency order, one at a time. */
export async function POST(request: Request) {
  const guard = await apiAuthorizeSuperAdmin();
  if (!guard.ok) return guard.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Send a JSON body with a "files" array.' }, 400);
  }

  const requested = (body as { files?: unknown })?.files;
  if (!Array.isArray(requested) || requested.some((name) => typeof name !== 'string')) {
    return json({ error: 'Send a JSON body with a "files" array of file names.' }, 400);
  }
  if (requested.length === 0) {
    return json({ error: 'Select at least one seed file.' }, 400);
  }

  const names = requested as string[];
  const available = await listSeedFiles();

  /*
   * A name that is not in the directory listing is refused outright rather
   * than skipped. Silently running "the ones that matched" would let a typo —
   * or a crafted name — look like a successful run of something it was not.
   */
  const unknown = unknownNames(names, available);
  if (unknown.length > 0) {
    return json({ error: `Not a seed file: ${unknown.slice(0, 5).join(', ')}` }, 400);
  }

  try {
    const results = await runSeedFiles(names);

    /*
     * Recorded whatever the outcome. Seeding writes to the live database, so
     * who ran what, and whether it worked, belongs in the audit log next to
     * every other change an administrator can make.
     */
    await recordAudit({
      actor: guard.user,
      action: 'seed.run',
      entity: 'seed',
      summary: `Ran ${results.length} seed file(s): ${results
        .map((result) => `${result.name} ${result.ok ? 'ok' : 'failed'}`)
        .join(', ')}`,
      after: results.map(({ name, ok, exitCode, durationMs }) => ({
        name,
        ok,
        exitCode,
        durationMs,
      })),
    });

    return json({ results });
  } catch (error) {
    if (error instanceof SeedRunBusyError) return json({ error: error.message }, 409);
    console.error('[seed-files] run failed', error);
    return json({ error: 'The seed run could not be started.' }, 500);
  }
}
