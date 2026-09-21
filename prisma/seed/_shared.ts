/* eslint-disable no-console */
/**
 * Shared plumbing for the individually runnable seed steps.
 *
 * Every other file in this directory is one seed an operator can run on its
 * own — from a terminal (`npx tsx prisma/seed/products.ts`) or from the Seed
 * files screen in the admin, which lists exactly what is in here. This module
 * is not one of them: the scanner behind that screen skips names beginning
 * with an underscore, which is what keeps helpers like this out of the list.
 *
 * It imports nothing from `../seed`, deliberately. The steps do, and the seed
 * imports this — a cycle between the two would leave one of them reading the
 * other's exports before they were initialised.
 */
import { basename } from 'node:path';

/** A file name without its directory or extension: `products.ts` → `products`. */
const stem = (value: string): string => basename(value).replace(/\.[^.]+$/, '');

/**
 * True when the file Node was asked to run is the one called `name`.
 *
 * Matched on the entry point's stem rather than its full path, because one
 * step is executed as TypeScript in development (`prisma/seed/products.ts`,
 * under tsx) and as a bundled `prisma/seed/products.mjs` in the production
 * image. Two paths, two extensions, one seed.
 *
 * `import.meta.url` would say the same thing more directly, but tsx compiles
 * these files to CommonJS — where it is empty — so the name is passed in
 * instead. Nothing runs when there is no entry point at all, which is what a
 * test importing one of these files sees.
 *
 * This is what lets `prisma/seed.ts` export its steps for reuse while still
 * running the whole seed when it is the entry point itself.
 */
export function isDirectRun(name: string): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return stem(entry) === name;
}

/** Just enough of PrismaClient to close the connection this step opened. */
type Disconnectable = { $disconnect: () => Promise<unknown> };

/**
 * Runs one step as a standalone script.
 *
 * Exit codes are the contract with whatever started the process — a terminal,
 * or the Seed files screen, which reports a non-zero exit as a failed seed. A
 * failure prints the message and not the stack: a seed failure is almost
 * always a configuration problem, and a stack tells an operator nothing useful
 * while risking echoing whatever was fed in.
 */
export function runSeedStep(
  name: string,
  step: () => Promise<void>,
  client: Disconnectable,
): void {
  if (!isDirectRun(name)) return;
  void execute(name, step, client);
}

async function execute(
  name: string,
  step: () => Promise<void>,
  client: Disconnectable,
): Promise<void> {
  const started = Date.now();
  console.log(`Seeding ${name}…`);
  try {
    await step();
    console.log(`${name} seeded in ${Date.now() - started}ms.`);
    await client.$disconnect();
  } catch (error) {
    console.error(`Seed failed: ${error instanceof Error ? error.message : String(error)}`);
    await client.$disconnect().catch(() => undefined);
    process.exit(1);
  }
}
