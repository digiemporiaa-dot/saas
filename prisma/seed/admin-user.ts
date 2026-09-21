/**
 * Admin user
 *
 * The first super-admin account, from SEED_ADMIN_* in the environment.
 *
 * One runnable seed step. Run it on its own with
 * `npx tsx prisma/seed/admin-user.ts`, or tick it on the Seed files screen in the
 * admin. `prisma/seed.ts` runs it too, as part of the full seed, so the
 * behaviour is the same either way — the logic lives there and this file is
 * only its entry point.
 */
import { prisma, seedAdmin } from '../seed';
import { runSeedStep } from './_shared';

runSeedStep('admin-user', seedAdmin, prisma);
