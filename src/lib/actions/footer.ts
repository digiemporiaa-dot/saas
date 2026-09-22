'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requirePermission } from '@/lib/auth/guards';
import { recordAudit } from '@/lib/services/audit';
import { footerContentSchema, footerDesignSchema } from '@/lib/cms/footer';
import { success, toActionError, type ActionResult } from '@/lib/utils/result';

const payloadSchema = z.object({
  content: footerContentSchema,
  design: footerDesignSchema,
});

/**
 * Saves the footer.
 *
 * One row, written whole. Both documents go through their own schema first, so
 * what is stored is always something the renderer can read — a field the form
 * did not send takes its default rather than being absent, which is how the
 * last footer ended up with switches that read as off because nobody had ever
 * turned them on.
 */
export async function saveFooter(input: unknown): Promise<ActionResult> {
  try {
    const user = await requirePermission('settings.manage');
    const data = payloadSchema.parse(input);

    await prisma.footerSettings.upsert({
      where: { id: 'singleton' },
      update: { content: data.content, design: data.design },
      create: { id: 'singleton', content: data.content, design: data.design },
    });

    await recordAudit({
      actor: user,
      action: 'footer.updated',
      entity: 'FooterSettings',
      entityId: 'singleton',
      summary: 'Updated the site footer',
      after: data,
    });

    revalidatePath('/admin/settings/design');
    // The footer is in the root layout, so this is every page.
    revalidatePath('/', 'layout');
    return success(undefined, 'Footer saved.');
  } catch (error) {
    return toActionError(error);
  }
}
