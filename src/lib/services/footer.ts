import 'server-only';
import { cache } from 'react';
import { prisma } from '@/lib/db/prisma';
import {
  parseFooterContent,
  parseFooterDesign,
  DEFAULT_FOOTER_CONTENT,
  DEFAULT_FOOTER_DESIGN,
  type FooterContent,
  type FooterDesign,
} from '@/lib/cms/footer';

export type ResolvedFooter = { content: FooterContent; design: FooterDesign };

/**
 * The footer, already parsed.
 *
 * A site whose row has never been written falls back to the built-in footer
 * rather than rendering nothing, and reading never writes: a missing row
 * resolves to the defaults instead of creating one, so serving a page cannot
 * touch the database beyond the read it needs.
 */
export const getFooter = cache(async (): Promise<ResolvedFooter> => {
  const row = await prisma.footerSettings.findUnique({ where: { id: 'singleton' } });
  if (!row) return { content: DEFAULT_FOOTER_CONTENT, design: DEFAULT_FOOTER_DESIGN };

  return {
    content: parseFooterContent(row.content),
    design: parseFooterDesign(row.design),
  };
});
