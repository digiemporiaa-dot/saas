# Seed files

`/seed-files` lists every runnable seed in `prisma/seed/` and runs the ones a
super admin ticks. It exists so a single part of the seed — the permission
catalogue after new permissions ship, one market's settings, the demo content
on a staging site — can be re-run without seeding everything or opening a shell
on the server.

## Who can reach it

Super admins only, and the check is made on the server before anything else
happens.

| Request | Answer |
| --- | --- |
| Not signed in | The site's own 404, the same as every other admin route (`requireUser`) |
| Signed in, second factor not cleared | Redirected to enrolment or verification |
| Signed in, not a super admin | **403 Forbidden** (`forbidden()` → `src/app/forbidden.tsx`) |
| Signed in as a super admin | The page |

The API behind it answers **401** when there is no session and **403** when the
session is not a super admin's (`apiAuthorizeSuperAdmin` in
`src/lib/api/guard.ts`).

Two deliberate choices sit behind that table:

- **The URL is not the protection.** `/seed-files` is guessable, so it is
  guarded twice — once in the page, before the directory is even read, and
  once in the route handler that runs the files. Finding the address gains
  nothing.
- **Role, never permission.** Any permission can be granted to any role from
  the Staff screen. Seeding writes to the live database, so it is gated on
  being a super admin, which nobody can hand out by ticking a box.

Middleware is not involved. It cannot read the database, and the questions that
matter here — is this session still valid, what role is this user, has the
second factor been cleared — are only answerable there. See the comment at the
top of `src/middleware.ts`.

Every run is written to the audit log as `seed.run`, with the files, their
outcome and who ran them.

## What is listed

Every `*.ts` file directly inside `prisma/seed/`, alphabetically. Adding a step
is dropping a file in; nothing registers it anywhere.

Skipped: names beginning with `_` (shared helpers, like `_shared.ts`),
dotfiles, `*.d.ts`, and the compiled `*.mjs` bundles — those are the same seed
a second time.

## Writing a step

Each file is an entry point; the logic lives in `prisma/seed.ts`, which exports
every step and is still what `npm run db:seed` runs end to end.

```ts
import { prisma, seedProducts } from '../seed';
import { runSeedStep } from './_shared';

runSeedStep('products', seedProducts, prisma);
```

`runSeedStep` only runs when that file is the process entry point, so
`prisma/seed.ts` can import the same step without triggering it. A non-zero
exit is what the screen reports as a failure.

Run one from a terminal with `npx tsx prisma/seed/products.ts`.

## How a run executes

Each file runs in its own child process — a seed is a script, expects to own
`process.exit`, and must not share the server's Prisma client.

- **In production** the compiled bundle is used: `node prisma/seed/x.mjs`. The
  image ships no dev dependencies, so `tsx` is not an option there. The bundles
  are produced by `npm run seed:build` during the Docker build, from the same
  step that already compiled `prisma/seed.mjs`.
- **In development** the TypeScript runs directly, through the local `tsx`.
- Selected files run **one at a time, in the order listed** — `roles` needs
  `permissions`, everything with content needs `countries` — and the run
  **stops at the first failure**.
- A seed is killed after five minutes (`SEED_FILE_TIMEOUT_MS`), and only one
  run happens at a time per server process.

Output (stdout and stderr) is shown per file, truncated at 64 KB.

## Environment

| Variable | Default | Meaning |
| --- | --- | --- |
| `SEED_FILE_TIMEOUT_MS` | `300000` | How long one seed may run before it is killed. Clamped to 10s–30m. |

The seeds themselves read the same variables they always have — `DATABASE_URL`,
`SEED_ADMIN_*`, `SEED_DEMO_CONTENT` — from the server's own environment.
