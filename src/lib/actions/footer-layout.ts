'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { authorize } from '@/lib/auth/guards';
import { recordAudit } from '@/lib/services/audit';
import { blockDefaults, getBlock, blockAllowedOnSurface } from '@/lib/cms/blocks';
import { parseSectionDesign, DEFAULT_SECTION_DESIGN } from '@/lib/cms/design';
import { materialiseFooter } from '@/lib/services/footer-cms';
import { FOOTER_ARRANGEMENTS, type FooterArrangement } from '@/lib/cms/footer-defaults';
import { resolveActionCountry } from '@/lib/country/admin';
import { assertCountryAccess } from '@/lib/country/access';
import { sanitizeText } from '@/lib/utils/sanitize';
import { success, failure, toActionError, type ActionResult } from '@/lib/utils/result';

/**
 * Footer structure actions.
 *
 * Deliberately a mirror of the page, blog and product section actions: same
 * validation through the block registry, same design parsing, same audit
 * trail. A footer section is a `FooterSection` row rather than a `PageSection`
 * one only because it hangs off a market — everything else is shared.
 *
 * Every one of these resolves the market first. A footer belongs to a market,
 * and an administrator who may not work in that market may not rearrange its
 * footer either.
 */

async function revalidateFooter(countryId: string) {
  revalidatePath('/admin/settings/design');
  void countryId;
  // The footer is in the public layout, so every page carries it.
  revalidatePath('/', 'layout');
}

async function requireCountry(rawCountryId: unknown) {
  const user = await authorize('settings.manage');
  const country = await resolveActionCountry(user, rawCountryId as string | undefined);
  await assertCountryAccess(user, country.id);
  return { user, country };
}

async function loadSection(sectionId: string) {
  return prisma.footerSection.findUnique({ where: { id: sectionId } });
}

const addSchema = z.object({
  countryId: z.string().min(1).max(40),
  blockType: z.string().min(1).max(60),
});

export async function addFooterSection(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = addSchema.parse(input);
    const { user, country } = await requireCountry(parsed.countryId);

    const definition = getBlock(parsed.blockType);
    if (!definition) return failure('Unknown block type.');
    if (!blockAllowedOnSurface(parsed.blockType, 'footer')) {
      return failure('That block cannot be added to a footer.');
    }

    // Adding to a footer nobody has opened materialises it first, so the new
    // row joins the arrangement rather than replacing it.
    await materialiseFooter(country.id);

    /*
     * A singleton block is part of the footer's anatomy — one bottom row — so
     * adding a second is rejected rather than silently producing two.
     *
     * Counted after the arrangement exists, never before: the built-in footer
     * already carries the bottom row, so a count taken while the footer was
     * still empty would wave through a second one.
     */
    if (definition.singleton) {
      const existing = await prisma.footerSection.count({
        where: { countryId: country.id, blockType: parsed.blockType },
      });
      if (existing > 0) return failure(`“${definition.label}” is already in this footer.`);
    }

    const last = await prisma.footerSection.findFirst({
      where: { countryId: country.id },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });

    const section = await prisma.footerSection.create({
      data: {
        countryId: country.id,
        blockType: parsed.blockType,
        name: definition.label,
        sortOrder: (last?.sortOrder ?? 0) + 10,
        content: blockDefaults(parsed.blockType) as object,
        settings: DEFAULT_SECTION_DESIGN as unknown as object,
      },
    });

    await recordAudit({
      actor: user,
      action: 'footer.section.added',
      entity: 'FooterSection',
      entityId: section.id,
      summary: `Added a ${definition.label} to ${country.name}'s footer`,
    });

    await revalidateFooter(country.id);
    return success({ id: section.id }, `${definition.label} added.`);
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateFooterSection(
  sectionId: string,
  payload: { content?: unknown; settings?: unknown; name?: string | null; isVisible?: boolean },
): Promise<ActionResult> {
  try {
    const section = await loadSection(sectionId);
    if (!section) return failure('That section no longer exists.');
    await requireCountry(section.countryId);

    const definition = getBlock(section.blockType);
    const data: Record<string, unknown> = {};

    if (payload.content !== undefined && definition) {
      data.content = definition.schema.parse(payload.content);
    }
    if (payload.settings !== undefined) {
      const design = parseSectionDesign(payload.settings);

      if (design.anchorId) {
        const siblings = await prisma.footerSection.findMany({
          where: { countryId: section.countryId, id: { not: sectionId } },
          select: { settings: true },
        });
        const taken = siblings.some(
          (row) => parseSectionDesign(row.settings).anchorId === design.anchorId,
        );
        if (taken) {
          return failure(`Another row already uses the anchor “${design.anchorId}”.`, {
            anchorId: ['This anchor is already used in this footer'],
          });
        }
      }

      data.settings = design as unknown as object;
    }
    if (payload.name !== undefined) data.name = payload.name ? sanitizeText(payload.name) : null;
    if (payload.isVisible !== undefined) data.isVisible = payload.isVisible;

    await prisma.footerSection.update({ where: { id: sectionId }, data });
    await revalidateFooter(section.countryId);
    return success(undefined, 'Row saved.');
  } catch (error) {
    return toActionError(error);
  }
}

export async function duplicateFooterSection(
  sectionId: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const source = await loadSection(sectionId);
    if (!source) return failure('That section no longer exists.');
    await requireCountry(source.countryId);

    const definition = getBlock(source.blockType);
    if (definition?.singleton) {
      return failure(`“${definition.label}” can only appear once, so it cannot be duplicated.`);
    }

    // The copy keeps every design value except the anchor: two elements cannot
    // share one DOM id.
    const design = parseSectionDesign(source.settings);

    const copy = await prisma.footerSection.create({
      data: {
        countryId: source.countryId,
        blockType: source.blockType,
        name: source.name ? `${source.name} (copy)` : null,
        sortOrder: source.sortOrder + 5,
        isVisible: source.isVisible,
        content: source.content as object,
        settings: { ...design, anchorId: '' } as unknown as object,
      },
    });

    await normaliseOrder(source.countryId);
    await revalidateFooter(source.countryId);
    return success({ id: copy.id }, 'Row duplicated.');
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteFooterSection(sectionId: string): Promise<ActionResult> {
  try {
    const section = await loadSection(sectionId);
    if (!section) return failure('That section no longer exists.');
    await requireCountry(section.countryId);

    await prisma.footerSection.delete({ where: { id: sectionId } });
    await revalidateFooter(section.countryId);
    return success(undefined, 'Row removed.');
  } catch (error) {
    return toActionError(error);
  }
}

const reorderSchema = z.object({
  countryId: z.string().min(1).max(40),
  order: z.array(z.string().min(1)).max(200),
});

export async function reorderFooterSections(input: unknown): Promise<ActionResult> {
  try {
    const parsed = reorderSchema.parse(input);
    const { country } = await requireCountry(parsed.countryId);

    // Reject ids that do not belong to this market's footer.
    const owned = await prisma.footerSection.findMany({
      where: { countryId: country.id },
      select: { id: true },
    });
    const ownedIds = new Set(owned.map((row) => row.id));
    if (parsed.order.some((id) => !ownedIds.has(id))) return failure('Invalid row order.');

    await prisma.$transaction(
      parsed.order.map((id, index) =>
        prisma.footerSection.update({ where: { id }, data: { sortOrder: (index + 1) * 10 } }),
      ),
    );

    await revalidateFooter(country.id);
    return success(undefined, 'Order saved.');
  } catch (error) {
    return toActionError(error);
  }
}

export async function toggleFooterSectionVisibility(sectionId: string): Promise<ActionResult> {
  try {
    const section = await loadSection(sectionId);
    if (!section) return failure('That section no longer exists.');
    await requireCountry(section.countryId);

    await prisma.footerSection.update({
      where: { id: sectionId },
      data: { isVisible: !section.isVisible },
    });

    await revalidateFooter(section.countryId);
    return success(undefined, section.isVisible ? 'Row hidden.' : 'Row shown.');
  } catch (error) {
    return toActionError(error);
  }
}

/** Materialises the built-in arrangement so it can be edited. */
export async function ensureFooterSections(
  rawCountryId: unknown,
  rawArrangement: unknown = 'classic',
): Promise<ActionResult> {
  try {
    const { country } = await requireCountry(rawCountryId);
    const arrangement = z
      .enum(Object.keys(FOOTER_ARRANGEMENTS) as [FooterArrangement, ...FooterArrangement[]])
      .catch('classic' as FooterArrangement)
      .parse(rawArrangement);

    await materialiseFooter(country.id, arrangement);
    await revalidateFooter(country.id);
    return success(undefined, 'Footer ready to edit.');
  } catch (error) {
    return toActionError(error);
  }
}

/**
 * Throws a market's footer away, so it follows the built-in arrangement again.
 *
 * The honest way back: with no rows, the footer renders the default anatomy,
 * which is exactly what a market that was never touched renders.
 */
export async function resetFooter(rawCountryId: unknown): Promise<ActionResult> {
  try {
    const { user, country } = await requireCountry(rawCountryId);

    await prisma.footerSection.deleteMany({ where: { countryId: country.id } });

    await recordAudit({
      actor: user,
      action: 'footer.reset',
      entity: 'Country',
      entityId: country.id,
      summary: `Reset ${country.name}'s footer to the default`,
    });

    await revalidateFooter(country.id);
    return success(undefined, 'Footer reset to the default.');
  } catch (error) {
    return toActionError(error);
  }
}

/**
 * Replaces a market's footer with one of the built-in arrangements.
 *
 * Reset then take control again would do it, but only from an empty screen —
 * and a footer somebody has already taken control of never shows that screen.
 * Switching is the ordinary thing to want: the footer that was written first
 * is not always the shape the site turns out to need.
 *
 * Everything it holds is thrown away, which is why it is confirmed. What it
 * writes is ordinary rows, editable from that moment like any other.
 */
export async function replaceFooterArrangement(
  rawCountryId: unknown,
  rawArrangement: unknown,
): Promise<ActionResult> {
  try {
    const { user, country } = await requireCountry(rawCountryId);
    const arrangement = z
      .enum(Object.keys(FOOTER_ARRANGEMENTS) as [FooterArrangement, ...FooterArrangement[]])
      .parse(rawArrangement);

    await prisma.footerSection.deleteMany({ where: { countryId: country.id } });
    await materialiseFooter(country.id, arrangement);

    await recordAudit({
      actor: user,
      action: 'footer.rebuilt',
      entity: 'Country',
      entityId: country.id,
      summary: `Rebuilt ${country.name}'s footer from “${FOOTER_ARRANGEMENTS[arrangement].label}”`,
    });

    await revalidateFooter(country.id);
    return success(undefined, `Footer rebuilt from “${FOOTER_ARRANGEMENTS[arrangement].label}”.`);
  } catch (error) {
    return toActionError(error);
  }
}

async function normaliseOrder(countryId: string) {
  const rows = await prisma.footerSection.findMany({
    where: { countryId },
    orderBy: { sortOrder: 'asc' },
    select: { id: true },
  });
  await prisma.$transaction(
    rows.map((row, index) =>
      prisma.footerSection.update({ where: { id: row.id }, data: { sortOrder: (index + 1) * 10 } }),
    ),
  );
}
