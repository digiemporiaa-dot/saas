import 'server-only';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { sectionCopies } from '@/lib/cms/section-copy';
import { keywordColumns } from '@/lib/seo/keywords';
import { describeOwner, loadContentInfo } from '@/lib/urls/content';
import { syncRoutes } from '@/lib/urls/content-sync';
import { UrlRegistryError } from '@/lib/urls/errors';
import { joinMarket, MAX_PATH_LENGTH, MAX_SEGMENTS, pathKey, segmentsOf } from '@/lib/urls/path';
import { checkAvailability, lockRegistry, type Actor } from '@/lib/urls/registry';
import { entityKey } from '@/lib/urls/snapshot';
import type { UrlContentType } from '@/lib/urls/types';
import { sanitizeText } from '@/lib/utils/sanitize';
import { cityPageSlug } from './paths';
import {
  fillPlaceholders,
  fillPlaceholdersDeep,
  placeholderValues,
  placeholdersIn,
  type CityPlaceholder,
  type PlaceholderValues,
} from './template';

/**
 * The City Page Generator.
 *
 * Copies one page into many cities of its market: `dropbox-plus` becomes
 * `delhi/dropbox-plus`, `mumbai/dropbox-plus` and so on, each a complete,
 * ordinary page with every section of the source, its placeholders filled in
 * for that city.
 *
 * The rules:
 *
 *  - **Independent from the moment it exists.** A generated page is a new
 *    Page row with new PageSection rows. It records where it came from
 *    (`generatedFromPageId`, `generationBatchId`, `generatedAt`) and nothing
 *    ever reads that to copy anything again: editing the source changes no
 *    city page, and editing a city page changes nothing else.
 *  - **Never overwrites.** A city that already has a page at the address is
 *    skipped, and one whose address is held by anything else — a redirect, a
 *    product — fails with the reason. The preview shows both before anything
 *    is written.
 *  - **All or nothing per city.** Each city's page, its sections and its
 *    address are written in one transaction holding the registry lock, so a
 *    failure never leaves a page without its sections or an address without
 *    its page. One city failing does not stop the others.
 *  - **Drafts unless asked.** Generated pages are drafts by default, so a
 *    batch of copies is reviewed before anyone can find it.
 */

const SENTINEL = '__generated_page__';

export type SourcePage = Prisma.PageGetPayload<{ include: { sections: { orderBy: { sortOrder: 'asc' } } } }>;

export type GeneratorCity = { id: string; name: string; slug: string; region: string | null; isActive: boolean };
export type GeneratorCountry = { id: string; name: string; code: string; slug: string };

export type PlanOutcome = 'create' | 'exists' | 'conflict' | 'invalid';

export type PlanRow = {
  cityId: string;
  city: string;
  region: string | null;
  cityActive: boolean;
  slug: string;
  path: string;
  /** The generated page's title. */
  title: string;
  outcome: PlanOutcome;
  reason: string | null;
  /** The page or content already at the address. */
  holder: { description: string; editHref: string | null } | null;
};

export type RunOutcome = 'created' | 'skipped' | 'failed';

export type RunRow = {
  cityId: string;
  city: string;
  path: string;
  outcome: RunOutcome;
  pageId: string | null;
  reason: string | null;
};

/** The generated page's title: the template with placeholders filled, or the source's own title filled. */
export function generatedTitle(template: string | null, source: { title: string }, values: PlaceholderValues): string {
  const raw = template?.trim() || source.title;
  const title = sanitizeText(fillPlaceholders(raw, values)).slice(0, 200);
  return title || values['page.title'] || source.title;
}

function valuesFor(city: GeneratorCity, country: GeneratorCountry, source: { title: string; slug: string }) {
  return placeholderValues({ city, country, page: { title: source.title, slug: source.slug } });
}

/** Where the source's copy goes in a city, and whether that address can have it. */
function target(city: GeneratorCity, country: GeneratorCountry, source: { slug: string }) {
  const slug = cityPageSlug(city.slug, source.slug);
  const path = joinMarket(country.slug, slug);
  const invalid =
    segmentsOf(slug).length > MAX_SEGMENTS
      ? `That would be ${segmentsOf(slug).length} segments deep; addresses have at most ${MAX_SEGMENTS}.`
      : path.length > MAX_PATH_LENGTH
        ? `That address would be longer than ${MAX_PATH_LENGTH} characters.`
        : null;
  return { slug, path, invalid };
}

/** The placeholders a source page uses anywhere the generator fills them. */
export function sourcePlaceholders(source: SourcePage): CityPlaceholder[] {
  return placeholdersIn([
    source.title,
    source.seoTitle,
    source.seoDescription,
    source.ogTitle,
    source.ogDescription,
    source.twitterTitle,
    source.twitterDescription,
    source.primaryKeyword1,
    source.primaryKeyword2,
    source.primaryKeyword3,
    ...source.sections.map((section) => [section.name, section.content]),
  ]);
}

/**
 * What generating would do for each city, read-only. The run repeats every
 * check under the registry lock; this is what the screen shows first.
 */
export async function planGeneration(input: {
  source: SourcePage;
  country: GeneratorCountry;
  cities: readonly GeneratorCity[];
  titleTemplate: string | null;
  rootCountryId: string;
}): Promise<PlanRow[]> {
  const { source, country } = input;
  const targets = input.cities.map((city) => ({ city, ...target(city, country, source) }));

  const existing = await prisma.page.findMany({
    where: { countryId: country.id, slug: { in: targets.map((row) => row.slug) } },
    select: { id: true, slug: true, title: true, deletedAt: true },
  });
  const existingBySlug = new Map(existing.map((page) => [page.slug, page]));

  const rows: PlanRow[] = [];
  const contentHolders: Array<{ index: number; type: UrlContentType; entityId: string; countryId: string }> = [];

  for (const row of targets) {
    const values = valuesFor(row.city, country, source);
    const base = {
      cityId: row.city.id,
      city: row.city.name,
      region: row.city.region,
      cityActive: row.city.isActive,
      slug: row.slug,
      path: row.path,
      title: generatedTitle(input.titleTemplate, source, values),
    };
    if (row.invalid) {
      rows.push({ ...base, outcome: 'invalid', reason: row.invalid, holder: null });
      continue;
    }
    const page = existingBySlug.get(row.slug);
    if (page) {
      rows.push({
        ...base,
        outcome: 'exists',
        reason: page.deletedAt
          ? `A page in the recycle bin still holds ${row.path}; restore or delete it for good first.`
          : `A page is already at ${row.path}; it is left exactly as it is.`,
        holder: { description: `page “${page.title}”`, editHref: `/admin/pages/${page.id}` },
      });
      continue;
    }
    const availability = await checkAvailability(prisma, pathKey(row.path)!, {
      entityId: SENTINEL,
      countryId: country.id,
      type: 'PAGE',
    });
    if (!availability.ok) {
      const owner = availability.owner;
      const ref = ownerRef(owner);
      if (ref) contentHolders.push({ index: rows.length, ...ref });
      rows.push({
        ...base,
        outcome: 'conflict',
        reason: `${row.path} is already used by ${owner.description}.`,
        holder: { description: owner.description, editHref: null },
      });
      continue;
    }
    rows.push({ ...base, outcome: 'create', reason: null, holder: null });
  }

  if (contentHolders.length > 0) {
    const infos = await loadContentInfo(contentHolders, input.rootCountryId);
    for (const holder of contentHolders) {
      const info = infos.get(entityKey(holder.entityId, holder.countryId));
      const row = rows[holder.index];
      if (!info || !row) continue;
      row.holder = { description: describeOwner(info), editHref: info.editHref };
      row.reason = `${row.path} is already used by ${describeOwner(info)}.`;
    }
  }

  return rows;
}

function ownerRef(owner: { kind: string; type?: UrlContentType; entityId?: string; countryId: string }) {
  return owner.kind === 'content' && owner.type && owner.entityId
    ? { type: owner.type, entityId: owner.entityId, countryId: owner.countryId }
    : null;
}

/**
 * Generates the source's copy in each city, one transaction per city.
 * Never throws for one city's failure; each city's outcome is returned.
 */
export async function runGeneration(input: {
  source: SourcePage;
  country: GeneratorCountry;
  cities: readonly GeneratorCity[];
  titleTemplate: string | null;
  publish: boolean;
  batchId: string;
  actor: Actor & { id: string };
}): Promise<RunRow[]> {
  const { source, country } = input;
  const sections = sectionCopies(source.sections);
  const out: RunRow[] = [];

  for (const city of input.cities) {
    const { slug, path, invalid } = target(city, country, source);
    const row = { cityId: city.id, city: city.name, path };
    if (invalid) {
      out.push({ ...row, outcome: 'failed', pageId: null, reason: invalid });
      continue;
    }

    try {
      const result = await prisma.$transaction(
        async (tx) => {
          // Checked again under the lock: the preview may be minutes old.
          await lockRegistry(tx);
          const existing = await tx.page.findUnique({
            where: { countryId_slug: { countryId: country.id, slug } },
            select: { id: true, title: true },
          });
          if (existing) {
            return {
              outcome: 'skipped' as const,
              pageId: existing.id,
              reason: `A page is already at ${path} (“${existing.title}”); it was left exactly as it is.`,
            };
          }
          const availability = await checkAvailability(tx, pathKey(path)!, {
            entityId: SENTINEL,
            countryId: country.id,
            type: 'PAGE',
          });
          if (!availability.ok) {
            throw new UrlRegistryError(`${path} is already used by ${availability.owner.description}.`, 'conflict');
          }

          const values = valuesFor(city, country, source);
          const fill = (value: string | null) => (value ? fillPlaceholders(value, values) : value);
          const now = new Date();

          const page = await tx.page.create({
            data: {
              countryId: country.id,
              title: generatedTitle(input.titleTemplate, source, values),
              slug,
              status: input.publish ? 'PUBLISHED' : 'DRAFT',
              publishedAt: input.publish ? now : null,
              isHomepage: false,
              categoryId: source.categoryId,
              showHeader: source.showHeader,
              showFooter: source.showFooter,
              seoTitle: fill(source.seoTitle),
              seoDescription: fill(source.seoDescription),
              // A city page is canonical to its own address, never the source's.
              canonicalUrl: null,
              noIndex: source.noIndex,
              noFollow: source.noFollow,
              ogTitle: fill(source.ogTitle),
              ogDescription: fill(source.ogDescription),
              ogImageId: source.ogImageId,
              twitterTitle: fill(source.twitterTitle),
              twitterDescription: fill(source.twitterDescription),
              twitterImageId: source.twitterImageId,
              ...keywordColumns({
                primaryKeyword1: fill(source.primaryKeyword1),
                primaryKeyword2: fill(source.primaryKeyword2),
                primaryKeyword3: fill(source.primaryKeyword3),
              }),
              // Set here and confirmed by the registry below, from the address.
              cityId: city.id,
              isCityHomepage: segmentsOf(slug).length === 1,
              generatedFromPageId: source.id,
              generationBatchId: input.batchId,
              generatedAt: now,
              createdById: input.actor.id,
              updatedById: input.actor.id,
              sections: {
                create: sections.map((section) => ({
                  ...section,
                  name: section.name ? fillPlaceholders(section.name, values) : section.name,
                  content: fillPlaceholdersDeep(section.content, values) as Prisma.InputJsonObject,
                  settings: section.settings as Prisma.InputJsonObject,
                })),
              },
            },
          });
          // A city page is its own page, not another market's twin of the source.
          await tx.page.update({ where: { id: page.id }, data: { groupKey: page.id } });
          await syncRoutes(tx, [{ type: 'PAGE', entityId: page.id, countryId: country.id }], {
            actor: input.actor,
            reason: 'CREATE',
            batchId: input.batchId,
          });
          return { outcome: 'created' as const, pageId: page.id, reason: null };
        },
        { timeout: 30_000, maxWait: 15_000 },
      );
      out.push({ ...row, ...result });
    } catch (error) {
      out.push({ ...row, outcome: 'failed', pageId: null, reason: failureReason(error) });
    }
  }
  return out;
}

function failureReason(error: unknown): string {
  if (error instanceof UrlRegistryError) return error.message;
  if (error instanceof Error && error.message.includes('Unique constraint')) {
    return 'Another change took this address at the same moment. Run the generator again to skip or retry it.';
  }
  if (error instanceof Error && error.name === 'PlaceholderDepthError') return error.message;
  console.error('[city-generator]', error);
  return 'The page could not be created. Nothing was saved for this city.';
}
