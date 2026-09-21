import 'server-only';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';

/**
 * The seed files an operator may run from the admin.
 *
 * Every runnable seed is one file in `prisma/seed/`. The directory is read at
 * request time rather than compiled into a list, so dropping a new step in
 * there is all it takes for the screen to offer it — which is the point of the
 * screen.
 *
 * Nothing here decides who may look. Authorisation happens in the page and in
 * the route handler that calls this, before either the listing or the run; a
 * module that reads a directory is the wrong place to make that decision and
 * the wrong place to be trusted with it.
 */

/** Where seeds live, absolute. `process.cwd()` is the app root in every target. */
export const SEED_DIR = path.join(process.cwd(), 'prisma', 'seed');

/**
 * How long one seed may run before it is killed.
 *
 * Demo content takes seconds; five minutes is the point at which a seed is
 * stuck rather than slow, and a stuck child process would otherwise hold a
 * request — and a database connection — open indefinitely.
 */
const TIMEOUT_MS = Math.min(
  Math.max(Number(process.env.SEED_FILE_TIMEOUT_MS) || 300_000, 10_000),
  1_800_000,
);

/** Output kept per file. A runaway loop must not be able to exhaust memory. */
const MAX_OUTPUT_BYTES = 64 * 1024;

export type SeedFile = {
  /** File name including the extension, e.g. `products.ts`. The id everywhere. */
  name: string;
  /** What the step is called in the UI: `admin-user.ts` → `admin-user`. */
  label: string;
  sizeBytes: number;
  modifiedAt: string;
  /**
   * True when a compiled `.mjs` sits beside the source. The production image
   * has no tsx, so a file without one cannot be run there.
   */
  compiled: boolean;
};

export type SeedRunResult = {
  name: string;
  ok: boolean;
  /** Null when the process was killed rather than exiting on its own. */
  exitCode: number | null;
  durationMs: number;
  /** stdout and stderr, interleaved as they arrived, truncated to a sane size. */
  output: string;
};

/**
 * A name that could only be a seed file in this one directory.
 *
 * The allowlist check in `runSeedFiles` is what actually decides what may run;
 * this refuses the obvious attacks — `..`, absolute paths, separators, NUL —
 * before a name is ever used to build a path, so a mistake in a future caller
 * cannot turn into a traversal.
 */
const NAME_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}\.ts$/i;

export function isValidSeedName(name: string): boolean {
  if (!NAME_PATTERN.test(name)) return false;
  if (name.includes('..') || name.startsWith('_') || name.endsWith('.d.ts')) return false;
  // Belt and braces: the name must survive normalisation unchanged.
  return path.basename(name) === name;
}

/**
 * Every runnable seed in `prisma/seed/`, alphabetically.
 *
 * Underscore-prefixed files are shared helpers rather than seeds, dotfiles and
 * type declarations are not seeds either, and compiled `.mjs` output is the
 * same seed a second time. All four are skipped, so the list is exactly what
 * an operator can meaningfully tick.
 */
export async function listSeedFiles(): Promise<SeedFile[]> {
  let entries: string[];
  try {
    entries = await readdir(SEED_DIR);
  } catch {
    // No seed directory is a legitimate state — an empty list, not an error.
    return [];
  }

  const files = await Promise.all(
    entries
      .filter((name) => name.endsWith('.ts') && isValidSeedName(name))
      .sort((a, b) => a.localeCompare(b))
      .map(async (name): Promise<SeedFile | null> => {
        const full = path.join(SEED_DIR, name);
        try {
          const info = await stat(full);
          if (!info.isFile()) return null;
          return {
            name,
            label: name.replace(/\.ts$/, ''),
            sizeBytes: info.size,
            modifiedAt: info.mtime.toISOString(),
            compiled: existsSync(full.replace(/\.ts$/, '.mjs')),
          };
        } catch {
          // Deleted between the readdir and the stat.
          return null;
        }
      }),
  );

  return files.filter((file): file is SeedFile => file !== null);
}

/**
 * How a given seed file would be executed here.
 *
 * Two environments, two answers. A production image carries the compiled
 * bundles `npm run seed:build` produced and no dev dependencies, so it runs
 * `node prisma/seed/x.mjs`. A developer's checkout has tsx and usually no
 * bundles, so it runs the TypeScript directly. The compiled bundle wins when
 * both exist: it is what the image would use, and a seed that only works under
 * tsx is a seed that does not work in production.
 */
function resolveRunner(name: string): { command: string; args: string[] } | null {
  const source = path.join(SEED_DIR, name);
  const compiled = source.replace(/\.ts$/, '.mjs');

  if (existsSync(compiled)) return { command: process.execPath, args: [compiled] };

  const tsx = path.join(process.cwd(), 'node_modules', '.bin', 'tsx');
  if (existsSync(tsx)) return { command: tsx, args: [source] };

  return null;
}

/**
 * One seed, in its own process.
 *
 * A child process rather than an import, for three reasons that all matter
 * here: a seed is written as a script and expects to own `process.exit`; its
 * Prisma client must not outlive the run inside the server's; and a seed that
 * hangs or crashes has to be survivable, which a killed child is and a
 * poisoned module registry is not.
 */
async function runOne(name: string): Promise<SeedRunResult> {
  const started = Date.now();
  const runner = resolveRunner(name);

  if (!runner) {
    return {
      name,
      ok: false,
      exitCode: null,
      durationMs: 0,
      output:
        'No runner available for this file. Run `npm run seed:build` to compile the seed ' +
        'files, or install the development dependencies so tsx is present.',
    };
  }

  return new Promise<SeedRunResult>((resolve) => {
    const child = spawn(runner.command, runner.args, {
      cwd: process.cwd(),
      // The seed needs DATABASE_URL and the SEED_* variables from the running
      // process; nothing extra is added and no shell is involved, so a file
      // name can never be interpreted as anything but an argument.
      env: process.env,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const chunks: string[] = [];
    let bytes = 0;
    let truncated = false;

    const capture = (data: Buffer) => {
      if (truncated) return;
      const text = data.toString('utf8');
      if (bytes + text.length > MAX_OUTPUT_BYTES) {
        chunks.push(text.slice(0, MAX_OUTPUT_BYTES - bytes));
        chunks.push('\n… output truncated.');
        truncated = true;
        return;
      }
      bytes += text.length;
      chunks.push(text);
    };

    child.stdout.on('data', capture);
    child.stderr.on('data', capture);

    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, TIMEOUT_MS);

    const finish = (exitCode: number | null, extra?: string) => {
      clearTimeout(timer);
      if (extra) chunks.push(extra);
      resolve({
        name,
        ok: exitCode === 0 && !timedOut,
        exitCode,
        durationMs: Date.now() - started,
        output: chunks.join('').trim() || 'No output.',
      });
    };

    child.on('error', (error) => finish(null, `\nCould not start the seed: ${error.message}`));
    child.on('close', (code) =>
      finish(
        code,
        timedOut ? `\nTimed out after ${Math.round(TIMEOUT_MS / 1000)}s and was stopped.` : undefined,
      ),
    );
  });
}

/**
 * Only one seed run at a time, per server process.
 *
 * Seeds write the same tables and several depend on an earlier one having run,
 * so two overlapping runs are a corrupt database rather than a slow one. The
 * lock is in-process: it stops the accident that actually happens — one
 * operator double-clicking, or two tabs — and is honest about not being a
 * distributed lock.
 */
let running = false;

export class SeedRunBusyError extends Error {
  constructor() {
    super('A seed run is already in progress. Wait for it to finish and try again.');
    this.name = 'SeedRunBusyError';
  }
}

/**
 * Runs the selected seeds, in the order the directory lists them.
 *
 * Sequential, never parallel: `roles` needs `permissions`, and everything with
 * content needs `countries`. The caller's order is deliberately ignored so a
 * tick-box order cannot produce a different database from the same selection.
 *
 * A failing seed stops the run. The results returned cover what was attempted,
 * which is what the screen shows — continuing past a failure would pile
 * follow-on errors on top of the one that matters.
 */
export async function runSeedFiles(names: string[]): Promise<SeedRunResult[]> {
  const available = await listSeedFiles();
  const order = new Map(available.map((file, index) => [file.name, index]));

  // The listing is the allowlist. A name that is not in it never reaches a path.
  const selected = Array.from(new Set(names))
    .filter((name) => order.has(name))
    .sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));

  if (selected.length === 0) return [];
  if (running) throw new SeedRunBusyError();

  running = true;
  try {
    const results: SeedRunResult[] = [];
    for (const name of selected) {
      const result = await runOne(name);
      results.push(result);
      if (!result.ok) break;
    }
    return results;
  } finally {
    running = false;
  }
}

/** Names in `names` that are not seed files here — reported back as rejected. */
export function unknownNames(names: string[], available: SeedFile[]): string[] {
  const known = new Set(available.map((file) => file.name));
  return Array.from(new Set(names)).filter((name) => !known.has(name));
}
