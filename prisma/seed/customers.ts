/**
 * Customers
 *
 * Demo customers.
 *
 * One runnable seed step. Run it on its own with
 * `npx tsx prisma/seed/customers.ts`, or tick it on the Seed files screen in the
 * admin. `prisma/seed.ts` runs it too, as part of the full seed, so the
 * behaviour is the same either way — the logic lives there and this file is
 * only its entry point.
 */
import { prisma, seedCustomers } from '../seed';
import { runSeedStep } from './_shared';

runSeedStep('customers', seedCustomers, prisma);
