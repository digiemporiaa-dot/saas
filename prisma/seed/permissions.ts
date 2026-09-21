/**
 * Permissions
 *
 * The permission catalogue every role is built from.
 *
 * One runnable seed step. Run it on its own with
 * `npx tsx prisma/seed/permissions.ts`, or tick it on the Seed files screen in the
 * admin. `prisma/seed.ts` runs it too, as part of the full seed, so the
 * behaviour is the same either way — the logic lives there and this file is
 * only its entry point.
 */
import { prisma, seedPermissions } from '../seed';
import { runSeedStep } from './_shared';

runSeedStep('permissions', seedPermissions, prisma);
