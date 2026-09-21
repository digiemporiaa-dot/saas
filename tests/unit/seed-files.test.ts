import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

/**
 * The seed-file screen's two rules, tested where they are enforced.
 *
 * Which files are offered, and which names may be run, decide what a request
 * can execute on the server — so they are tested against a real directory
 * rather than a mock. The service resolves its directory from `process.cwd()`
 * at import time, so the sandbox is created and cwd moved before it loads.
 */

let sandbox: string;
let originalCwd: string;
let service: typeof import('@/lib/seed-files/seed-files.service');

beforeAll(async () => {
  originalCwd = process.cwd();
  sandbox = await mkdtemp(path.join(tmpdir(), 'seed-files-'));
  await mkdir(path.join(sandbox, 'prisma', 'seed'), { recursive: true });

  const seedDir = path.join(sandbox, 'prisma', 'seed');
  await writeFile(path.join(seedDir, 'countries.ts'), '// a seed\n');
  await writeFile(path.join(seedDir, 'products.ts'), '// a seed\n');
  await writeFile(path.join(seedDir, 'admin-user.ts'), '// a seed\n');
  // Not seeds: a shared helper, a compiled bundle, a dotfile, a declaration.
  await writeFile(path.join(seedDir, '_shared.ts'), '// helper\n');
  await writeFile(path.join(seedDir, 'products.mjs'), '// compiled\n');
  await writeFile(path.join(seedDir, '.keep'), '');
  await writeFile(path.join(seedDir, 'types.d.ts'), 'export {};\n');

  process.chdir(sandbox);
  service = await import('@/lib/seed-files/seed-files.service');
});

afterAll(async () => {
  process.chdir(originalCwd);
  await rm(sandbox, { recursive: true, force: true });
});

describe('seed file listing', () => {
  it('offers the seeds and nothing else', async () => {
    const files = await service.listSeedFiles();
    expect(files.map((file) => file.name)).toEqual([
      'admin-user.ts',
      'countries.ts',
      'products.ts',
    ]);
  });

  it('reports which seeds have a compiled bundle beside them', async () => {
    const files = await service.listSeedFiles();
    const byName = new Map(files.map((file) => [file.name, file]));
    // The production image has no tsx, so this is what says "runnable there".
    expect(byName.get('products.ts')?.compiled).toBe(true);
    expect(byName.get('countries.ts')?.compiled).toBe(false);
  });

  it('labels each file by its stem', async () => {
    const files = await service.listSeedFiles();
    expect(files.map((file) => file.label)).toEqual(['admin-user', 'countries', 'products']);
  });
});

describe('seed name validation', () => {
  it('accepts the names this application writes', () => {
    for (const name of ['countries.ts', 'admin-user.ts', 'demo-data.ts', 'seed2.ts']) {
      expect(service.isValidSeedName(name), name).toBe(true);
    }
  });

  it('refuses anything that could leave the seed directory', () => {
    const attacks = [
      '../seed.ts',
      '../../package.json',
      '/etc/passwd',
      'sub/dir.ts',
      'sub\\dir.ts',
      'countries.ts\u0000.png',
      '.env.ts',
      '_shared.ts',
      'types.d.ts',
      'countries.js',
      'countries.mjs',
      '',
      `${'a'.repeat(200)}.ts`,
    ];
    for (const name of attacks) {
      expect(service.isValidSeedName(name), name).toBe(false);
    }
  });
});

describe('running seed files', () => {
  it('runs nothing when the selection is not in the directory', async () => {
    // The listing is the allowlist: an unknown name is dropped, and with
    // nothing left there is no run at all — no process, no output.
    const results = await service.runSeedFiles(['../../seed.ts', 'nope.ts']);
    expect(results).toEqual([]);
  });

  it('names the selections that are not seed files', async () => {
    const available = await service.listSeedFiles();
    expect(service.unknownNames(['countries.ts', 'nope.ts'], available)).toEqual(['nope.ts']);
    expect(service.unknownNames(['countries.ts'], available)).toEqual([]);
  });
});
