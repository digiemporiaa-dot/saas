'use server';

import { revalidatePath } from 'next/cache';
import type { City } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { authorize, type SessionUser } from '@/lib/auth/guards';
import { recordAudit } from '@/lib/services/audit';
import { assertCountryAccess } from '@/lib/country/access';
import { resolveActionCountry } from '@/lib/country/admin';
import { getCountryById, getDefaultCountry } from '@/lib/country/registry';
import type { CountryContext } from '@/lib/country/types';
import { keywordsFromForm } from '@/lib/seo/keywords';
import { refreshSeoScores } from '@/lib/seo/intelligence/refresh';
import { success, failure, toActionError, type ActionResult } from '@/lib/utils/result';
import { citySpaceProblems, describeCitySpaceProblems, type CitySpaceProblem } from '@/lib/urls/cities';
import type { SyncOutcome } from '@/lib/urls/content-sync';
import { UrlRegistryError } from '@/lib/urls/errors';
import { joinMarket } from '@/lib/urls/path';
import { lockRegistry, withRegistry } from '@/lib/urls/registry';
import { revalidateAddresses } from '@/lib/urls/revalidate';
import {
  cityIdSchema,
  cityInputSchema,
  cityLandingSchema,
  citySlugCheckSchema,
  cityStatusSchema,
  citySlugSchema,
  createLandingSchema,
  generatorPreviewSchema,
  generatorRunSchema,
  generatorSourceSearchSchema,
  suggestCitySlug,
} from '@/lib/validation/city';
import { createLandingPage, moveCityPages } from '@/lib/cities/manage';
import {
  planGeneration,
  runGeneration,
  sourcePlaceholders,
  type PlanRow,
  type RunRow,
} from '@/lib/cities/generator';
import type { CityPlaceholder } from '@/lib/cities/template';

/**
 * Cities.
 *
 * Permissions are the page permissions, because what a city changes is where
 * pages live and whether they are served: viewing needs `pages.view`, adding
 * a city or its pages `pages.create`, editing `pages.edit`, deleting
 * `pages.delete`, and anything that puts pages in front of visitors or search
 * engines — switching a city on, putting it back in the sitemap, generating
 * published pages — `pages.publish`. Market access applies on top, always to
 * the market of the record as loaded from the database: a city id in a form
 * can never reach a market the user cannot work in, and a city never moves
 * to another market.
 */

type Market = Pick<CountryContext, 'id' | 'name' | 'code' | 'slug'>;

const auditFields = (city: City) => ({
  name: city.name,
  slug: city.slug,
  region: city.region,
  isActive: city.isActive,
  isPublished: city.isPublished,
  noIndex: city.noIndex,
  excludeFromSitemap: city.excludeFromSitemap,
});

/** The city's pages, for refreshing their SEO scores after a change they inherit. */
async function cityPageRefs(cityId: string, countryId: string) {
  const pages = await prisma.page.findMany({
    where: { cityId, deletedAt: null },
    select: { id: true },
    take: 500,
  });
  return pages.map((page) => ({ type: 'PAGE' as const, id: page.id, countryId }));
}

async function marketOf(countryId: string): Promise<Market> {
  const market = await getCountryById(countryId);
  if (!market) throw new UrlRegistryError('That market no longer exists.', 'invalid', '_form');
  return market;
}

function revalidateCities(cityId?: string) {
  revalidatePath('/admin/cities');
  if (cityId) revalidatePath(`/admin/cities/${cityId}`);
  revalidatePath('/admin/pages');
}

// ---------------------------------------------------------------------------
// Create and edit
// ---------------------------------------------------------------------------

export async function saveCity(
  cityId: string | null,
  formData: FormData,
): Promise<ActionResult<{ id: string; landingPageId: string | null }>> {
  try {
    const user = await authorize(cityId ? 'pages.edit' : 'pages.create');

    const before = cityId ? await prisma.city.findUnique({ where: { id: cityId } }) : null;
    if (cityId && !before) return failure('That city no longer exists.');

    // An existing city's market is the one it has; a new city's comes from the
    // form and is checked against the markets this user may work in.
    let market: Market;
    if (before) {
      await assertCountryAccess(user, before.countryId);
      const requested = formData.get('countryId')?.toString();
      if (requested && requested !== before.countryId) {
        const message = 'A city stays in the market it was created in. Add a new city in the other market instead.';
        return failure(message, { countryId: [message] });
      }
      market = await marketOf(before.countryId);
    } else {
      market = await resolveActionCountry(user, formData.get('countryId')?.toString() || null);
    }

    const name = String(formData.get('name') ?? '');
    const typedSlug = String(formData.get('slug') ?? '').trim();
    const input = cityInputSchema.parse({
      name,
      slug: typedSlug || suggestCitySlug(name),
      region: formData.get('region'),
      isActive: formData.get('isActive'),
      isPublished: formData.get('isPublished'),
      sortOrder: formData.get('sortOrder') || 0,
      salesPhone: formData.get('salesPhone'),
      whatsappNumber: formData.get('whatsappNumber'),
      salesEmail: formData.get('salesEmail'),
      address: formData.get('address'),
      postalCode: formData.get('postalCode'),
      latitude: formData.get('latitude'),
      longitude: formData.get('longitude'),
      seoTitle: formData.get('seoTitle'),
      seoDescription: formData.get('seoDescription'),
      ...keywordsFromForm(formData),
      noIndex: formData.get('noIndex'),
      excludeFromSitemap: formData.get('excludeFromSitemap'),
    });
    const landing = before
      ? { createLanding: false, landingTitle: null }
      : cityLandingSchema.parse({
          createLanding: formData.get('createLanding'),
          landingTitle: formData.get('landingTitle'),
        });

    // Switching a city back on, or back into the sitemaps, puts its pages in
    // front of visitors and search engines again: that is publishing.
    if (before && ((!before.isActive && input.isActive) || (!before.isPublished && input.isPublished))) {
      await authorize('pages.publish');
    }

    const slugChanged = !before || before.slug !== input.slug;

    const { city, moves, landingPage } = await withRegistry(
      async (tx) => {
        if (slugChanged) {
          const problems = await citySpaceProblems(tx, {
            countryId: market.id,
            marketSlug: market.slug,
            slug: input.slug,
            cityId: before?.id ?? null,
          });
          if (problems.length > 0) {
            throw new UrlRegistryError(describeCitySpaceProblems(input.slug, problems), 'conflict', 'slug');
          }
        }

        const saved = before
          ? await tx.city.update({ where: { id: before.id }, data: input })
          : await tx.city.create({ data: { ...input, countryId: market.id } });

        let moved: SyncOutcome[] = [];
        if (before && slugChanged) {
          moved = await moveCityPages(tx, {
            cityId: saved.id,
            countryId: saved.countryId,
            fromSlug: before.slug,
            toSlug: saved.slug,
            actor: user,
          });
        }

        const created =
          !before && landing.createLanding
            ? await createLandingPage(tx, {
                city: saved,
                country: market,
                title: landing.landingTitle,
                actor: user,
              })
            : null;

        return { city: saved, moves: moved, landingPage: created };
      },
      { timeoutMs: 120_000 },
    );

    await recordAudit({
      actor: user,
      action: before ? 'updated' : 'created',
      entity: 'City',
      entityId: city.id,
      summary: before
        ? `Updated city “${city.name}” (${market.code})${slugChanged ? `, moved from /${before.slug} to /${city.slug}` : ''}`
        : `Added city “${city.name}” (${market.code})`,
      before: before ? auditFields(before) : undefined,
      after: { ...auditFields(city), country: market.code },
    });
    if (landingPage) {
      await recordAudit({
        actor: user,
        action: 'created',
        entity: 'Page',
        entityId: landingPage.id,
        summary: `Created “${landingPage.title}”, the landing page of ${city.name}, as a draft`,
        after: { slug: landingPage.slug, status: 'DRAFT', country: market.code },
      });
    }

    revalidateCities(city.id);
    revalidateAddresses(moves.flatMap((move) => [move.oldPath, move.newPath]));
    if (before) refreshSeoScores(() => cityPageRefs(city.id, city.countryId));

    const movedCount = moves.filter((move) => move.status === 'moved' || move.status === 'placed').length;
    const message = !before
      ? landingPage
        ? `${city.name} added, with a draft landing page at ${joinMarket(market.slug, city.slug)}. Build it in the Page Builder and publish it when it is ready.`
        : `${city.name} added.`
      : movedCount > 0
        ? `${city.name} saved. ${movedCount} page${movedCount === 1 ? '' : 's'} moved to ${joinMarket(market.slug, city.slug)}; published ones redirect from their old addresses.`
        : `${city.name} saved.`;
    return success({ id: city.id, landingPageId: landingPage?.id ?? null }, message);
  } catch (error) {
    return toActionError(error);
  }
}

/**
 * Whether a slug is free for a city, for the form to say so as it is typed.
 * Read-only; saving checks again under the registry lock.
 */
export async function checkCitySlug(
  input: unknown,
): Promise<ActionResult<{ slug: string; path: string; problems: CitySpaceProblem[]; message: string | null }>> {
  try {
    const user = await authorize('pages.view');
    const parsed = citySlugCheckSchema.parse(input);
    let market: Market;
    if (parsed.cityId) {
      const city = await prisma.city.findUnique({ where: { id: parsed.cityId }, select: { countryId: true } });
      if (!city) return failure('That city no longer exists.');
      await assertCountryAccess(user, city.countryId);
      market = await marketOf(city.countryId);
    } else {
      market = await resolveActionCountry(user, parsed.countryId);
    }
    const slug = citySlugSchema.safeParse(parsed.slug);
    if (!slug.success) {
      const message = slug.error.issues[0]?.message ?? 'That slug is not valid.';
      return success({ slug: parsed.slug, path: '', problems: [], message });
    }
    const problems = await citySpaceProblems(prisma, {
      countryId: market.id,
      marketSlug: market.slug,
      slug: slug.data,
      cityId: parsed.cityId ?? null,
    });
    return success({
      slug: slug.data,
      path: joinMarket(market.slug, slug.data),
      problems,
      message: problems.length > 0 ? describeCitySpaceProblems(slug.data, problems) : null,
    });
  } catch (error) {
    return toActionError(error);
  }
}

// ---------------------------------------------------------------------------
// Status and deletion
// ---------------------------------------------------------------------------

export async function setCityStatus(input: unknown): Promise<ActionResult> {
  try {
    const user = await authorize('pages.edit');
    const parsed = cityStatusSchema.parse(input);
    const city = await prisma.city.findUnique({ where: { id: parsed.cityId } });
    if (!city) return failure('That city no longer exists.');
    await assertCountryAccess(user, city.countryId);

    const opening =
      (parsed.isActive === true && !city.isActive) || (parsed.isPublished === true && !city.isPublished);
    if (opening) await authorize('pages.publish');

    const data = {
      ...(parsed.isActive !== undefined ? { isActive: parsed.isActive } : {}),
      ...(parsed.isPublished !== undefined ? { isPublished: parsed.isPublished } : {}),
    };
    if (Object.keys(data).length === 0) return failure('Nothing to change.');
    const saved = await prisma.city.update({ where: { id: city.id }, data });

    await recordAudit({
      actor: user,
      action: parsed.isActive === false ? 'deactivated' : parsed.isActive === true ? 'activated' : 'updated',
      entity: 'City',
      entityId: city.id,
      summary: `${saved.name}: ${saved.isActive ? 'active' : 'inactive'}, ${saved.isPublished ? 'published' : 'unpublished'}`,
      before: auditFields(city),
      after: auditFields(saved),
    });

    const pages = await prisma.page.findMany({
      where: { cityId: city.id, deletedAt: null },
      select: { slug: true },
      take: 500,
    });
    const market = await marketOf(city.countryId);
    revalidateCities(city.id);
    revalidateAddresses(pages.map((page) => joinMarket(market.slug, page.slug)));
    refreshSeoScores(() => cityPageRefs(city.id, city.countryId));

    if (parsed.isActive === false && city.isActive) {
      return success(
        undefined,
        `${saved.name} is switched off: its ${pages.length} page${pages.length === 1 ? '' : 's'} answer 404 until it is switched back on. Nothing was deleted.`,
      );
    }
    if (parsed.isActive === true && !city.isActive) return success(undefined, `${saved.name} is live again.`);
    return success(
      undefined,
      saved.isPublished
        ? `${saved.name} is published: its indexable pages are in the sitemap.`
        : `${saved.name} is unpublished: its pages stay online and leave the sitemap.`,
    );
  } catch (error) {
    return toActionError(error);
  }
}

/**
 * Deletes a city — only one without pages.
 *
 * A city's pages are content somebody built, so deleting the city never takes
 * them with it, and never leaves them behind as orphans at addresses nobody
 * manages: while the city has pages, deletion is refused with the count, and
 * deactivating is offered instead. Pages in the recycle bin leave the city;
 * restoring one later brings it back as an ordinary page.
 */
export async function deleteCity(input: unknown): Promise<ActionResult> {
  try {
    const user = await authorize('pages.delete');
    const { cityId } = cityIdSchema.parse(input);
    const city = await prisma.city.findUnique({ where: { id: cityId } });
    if (!city) return failure('That city no longer exists.');
    await assertCountryAccess(user, city.countryId);

    const refuse = (count: number, landing: boolean) =>
      failure(
        `${city.name} still has ${count} page${count === 1 ? '' : 's'}${landing ? ', including its landing page' : ''}. Delete or move ${count === 1 ? 'it' : 'them'} first, or deactivate the city to take ${count === 1 ? 'it' : 'them'} offline without deleting anything.`,
        { _pages: [String(count)] },
      );

    const live = await prisma.page.findMany({
      where: { cityId: city.id, deletedAt: null },
      select: { isCityHomepage: true },
    });
    if (live.length > 0) return refuse(live.length, live.some((page) => page.isCityHomepage));

    const outcome = await prisma.$transaction(async (tx) => {
      // Under the registry lock nothing can be placed in the city meanwhile.
      await lockRegistry(tx);
      const again = await tx.page.count({ where: { cityId: city.id, deletedAt: null } });
      if (again > 0) return { refused: again };
      await tx.page.updateMany({ where: { cityId: city.id }, data: { cityId: null, isCityHomepage: false } });
      await tx.city.delete({ where: { id: city.id } });
      return { refused: 0 };
    });
    if (outcome.refused > 0) return refuse(outcome.refused, false);

    await recordAudit({
      actor: user,
      action: 'deleted',
      entity: 'City',
      entityId: city.id,
      summary: `Deleted city “${city.name}”`,
      before: auditFields(city),
    });
    revalidateCities();
    return success(undefined, `${city.name} was deleted.`);
  } catch (error) {
    return toActionError(error);
  }
}

// ---------------------------------------------------------------------------
// Landing page
// ---------------------------------------------------------------------------

export async function createCityLandingPage(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await authorize('pages.create');
    const parsed = createLandingSchema.parse(input);
    const city = await prisma.city.findUnique({ where: { id: parsed.cityId } });
    if (!city) return failure('That city no longer exists.');
    await assertCountryAccess(user, city.countryId);
    const market = await marketOf(city.countryId);

    const page = await withRegistry((tx) =>
      createLandingPage(tx, { city, country: market, title: parsed.title, actor: user }),
    );

    await recordAudit({
      actor: user,
      action: 'created',
      entity: 'Page',
      entityId: page.id,
      summary: `Created “${page.title}”, the landing page of ${city.name}, as a draft`,
      after: { slug: page.slug, status: 'DRAFT', country: market.code },
    });
    revalidateCities(city.id);
    return success({ id: page.id }, 'Landing page created as a draft. Build it in the Page Builder.');
  } catch (error) {
    return toActionError(error);
  }
}

// ---------------------------------------------------------------------------
// City Page Generator
// ---------------------------------------------------------------------------

export type GeneratorPreview = {
  source: { id: string; title: string; slug: string; sectionCount: number; placeholders: CityPlaceholder[] };
  country: Market;
  rows: PlanRow[];
  counts: Record<PlanRow['outcome'], number>;
};

export type GeneratorRun = {
  batchId: string;
  rows: RunRow[];
  counts: Record<RunRow['outcome'], number>;
};

/**
 * Loads what a generator request names, trusting none of it: the market must
 * be one the user may work in, the source page must be a live page of that
 * market outside any city, and every city must be in that market.
 */
async function generatorContext(
  user: SessionUser,
  input: { sourcePageId: string; countryId: string; cityIds: readonly string[] },
) {
  const market = await resolveActionCountry(user, input.countryId);
  const source = await prisma.page.findUnique({
    where: { id: input.sourcePageId },
    include: { sections: { orderBy: { sortOrder: 'asc' } } },
  });
  if (!source || source.deletedAt) return { error: 'That source page no longer exists.' } as const;
  if (source.countryId !== market.id) {
    return { error: `Choose a source page from ${market.name}: city pages are copied within their own market.` } as const;
  }
  if (source.cityId) {
    return { error: 'That page already belongs to a city. Choose a page outside every city as the source.' } as const;
  }
  const ids = [...new Set(input.cityIds)];
  const cities = await prisma.city.findMany({
    where: { id: { in: ids }, countryId: market.id },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true, slug: true, region: true, isActive: true },
  });
  if (cities.length !== ids.length) {
    return { error: `Some of the chosen cities are not in ${market.name}. Reload the page and choose again.` } as const;
  }
  return { market, source, cities } as const;
}

export async function previewCityPages(input: unknown): Promise<ActionResult<GeneratorPreview>> {
  try {
    const user = await authorize('pages.create');
    const parsed = generatorPreviewSchema.parse(input);
    const context = await generatorContext(user, parsed);
    if ('error' in context) return failure(context.error ?? 'Not available.');
    const root = await getDefaultCountry();

    const rows = await planGeneration({
      source: context.source,
      country: context.market,
      cities: context.cities,
      titleTemplate: parsed.titleTemplate,
      rootCountryId: root.id,
    });
    const counts = { create: 0, exists: 0, conflict: 0, invalid: 0 };
    for (const row of rows) counts[row.outcome] += 1;

    return success({
      source: {
        id: context.source.id,
        title: context.source.title,
        slug: context.source.slug,
        sectionCount: context.source.sections.length,
        placeholders: sourcePlaceholders(context.source),
      },
      country: { id: context.market.id, name: context.market.name, code: context.market.code, slug: context.market.slug },
      rows,
      counts,
    });
  } catch (error) {
    return toActionError(error);
  }
}

/**
 * Generates city pages for up to `MAX_CITIES_PER_REQUEST` cities. A larger
 * run is sent in parts by the screen, each continuing the same batch.
 */
export async function generateCityPages(input: unknown): Promise<ActionResult<GeneratorRun>> {
  try {
    const user = await authorize('pages.create');
    const parsed = generatorRunSchema.parse(input);
    if (parsed.publish) await authorize('pages.publish');
    const context = await generatorContext(user, parsed);
    if ('error' in context) return failure(context.error ?? 'Not available.');
    const { market, source, cities } = context;

    let batchId = parsed.batchId ?? null;
    if (batchId) {
      const batch = await prisma.cityPageBatch.findUnique({ where: { id: batchId } });
      if (!batch || batch.countryId !== market.id || batch.sourcePageId !== source.id || batch.actorId !== user.id) {
        return failure('That generator run cannot be continued. Start it again.');
      }
    } else {
      const batch = await prisma.cityPageBatch.create({
        data: {
          countryId: market.id,
          sourcePageId: source.id,
          sourceTitle: source.title,
          sourceSlug: source.slug,
          actorId: user.id,
          actorEmail: user.email ?? null,
        },
      });
      batchId = batch.id;
    }

    const rows = await runGeneration({
      source,
      country: market,
      cities,
      titleTemplate: parsed.titleTemplate,
      publish: parsed.publish,
      batchId,
      actor: user,
    });
    const counts = { created: 0, skipped: 0, failed: 0 };
    for (const row of rows) counts[row.outcome] += 1;

    await prisma.$transaction(async (tx) => {
      const batch = await tx.cityPageBatch.findUnique({ where: { id: batchId! }, select: { results: true } });
      const earlier = Array.isArray(batch?.results) ? batch.results : [];
      await tx.cityPageBatch.update({
        where: { id: batchId! },
        data: {
          created: { increment: counts.created },
          skipped: { increment: counts.skipped },
          failed: { increment: counts.failed },
          results: [...earlier, ...rows],
        },
      });
    });

    await recordAudit({
      actor: user,
      action: 'generated',
      entity: 'CityPageBatch',
      entityId: batchId,
      summary: `Generated ${counts.created} city page${counts.created === 1 ? '' : 's'} from “${source.title}” in ${market.name}${counts.skipped ? `, skipped ${counts.skipped}` : ''}${counts.failed ? `, ${counts.failed} failed` : ''}`,
      after: { source: source.id, created: counts.created, skipped: counts.skipped, failed: counts.failed },
    });

    const created = rows.filter((row) => row.outcome === 'created' && row.pageId);
    revalidateCities();
    revalidateAddresses(created.map((row) => row.path));
    refreshSeoScores(created.map((row) => ({ type: 'PAGE' as const, id: row.pageId!, countryId: market.id })));

    return success({ batchId, rows, counts });
  } catch (error) {
    return toActionError(error);
  }
}

/** Pages that can be a generator's source: live pages of the market, outside every city. */
export async function searchGeneratorSources(
  input: unknown,
): Promise<ActionResult<Array<{ id: string; title: string; slug: string; status: string; sectionCount: number }>>> {
  try {
    const user = await authorize('pages.view');
    const parsed = generatorSourceSearchSchema.parse(input);
    const market = await resolveActionCountry(user, parsed.countryId);
    const q = parsed.q.trim();
    const pages = await prisma.page.findMany({
      where: {
        countryId: market.id,
        deletedAt: null,
        cityId: null,
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: 'insensitive' } },
                { slug: { contains: q.toLowerCase() } },
              ],
            }
          : {}),
      },
      orderBy: [{ isHomepage: 'desc' }, { title: 'asc' }],
      take: 25,
      select: { id: true, title: true, slug: true, status: true, _count: { select: { sections: true } } },
    });
    return success(
      pages.map((page) => ({
        id: page.id,
        title: page.title,
        slug: page.slug,
        status: page.status,
        sectionCount: page._count.sections,
      })),
    );
  } catch (error) {
    return toActionError(error);
  }
}
