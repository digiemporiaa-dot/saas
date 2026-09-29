import 'server-only';
import { prisma } from '@/lib/db/prisma';
import { publishedPageWhere } from '@/lib/services/pages';
import { publishedPostWhere } from '@/lib/services/blog';
import { publishedProductWhere } from '@/lib/services/products';
import type { UrlContentType } from './types';

/**
 * Whether content is public, by the same rules its own page applies.
 *
 * A redirect only ever sends a visitor to content that is live: a redirect to
 * a draft answers 404 rather than disclosing where the draft will be, and a
 * redirect to deleted content answers 404 rather than sending anyone to a dead
 * end or, worse, the home page.
 */

/** The current address of content, or null unless the content is public. */
export async function liveRoutePath(
  type: UrlContentType,
  entityId: string,
  countryId: string,
): Promise<string | null> {
  const route = await prisma.urlRoute.findUnique({
    where: { entityId_countryId: { entityId, countryId } },
    select: { path: true, type: true },
  });
  if (!route) return null;
  return (await isLive((route.type as UrlContentType) ?? type, entityId, countryId)) ? route.path : null;
}

/** Whether content is public in a market, by the same rules its page uses. */
export async function isLive(type: UrlContentType, entityId: string, countryId: string): Promise<boolean> {
  switch (type) {
    case 'PAGE':
    case 'CATEGORY_PAGE':
    case 'BRAND_PAGE':
      return Boolean(
        await prisma.page.findFirst({
          where: { ...publishedPageWhere(), id: entityId, countryId },
          select: { id: true },
        }),
      );
    case 'PRODUCT':
      return Boolean(
        await prisma.productCountry.findFirst({
          where: { ...publishedProductWhere(countryId), productId: entityId },
          select: { id: true },
        }),
      );
    case 'BLOG_POST':
      return Boolean(
        await prisma.blogPost.findFirst({
          where: { ...publishedPostWhere(countryId), id: entityId },
          select: { id: true },
        }),
      );
    case 'BLOG_CATEGORY':
      return Boolean(await prisma.blogCategory.findUnique({ where: { id: entityId }, select: { id: true } }));
    case 'BLOG_TAG':
      return Boolean(await prisma.blogTag.findUnique({ where: { id: entityId }, select: { id: true } }));
    case 'BLOG_ARCHIVE':
      return true;
  }
}

