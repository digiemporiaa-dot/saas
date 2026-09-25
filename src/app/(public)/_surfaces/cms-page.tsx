import type { Metadata } from 'next';
import { prisma } from '@/lib/db/prisma';
import { getPublishedPage, findPublishedPageCountries } from '@/lib/services/pages';
import { redirectOrNotFound } from '@/lib/services/redirects';
import { getWebsiteSettings } from '@/lib/services/settings';
import { SectionList } from '@/components/cms/section-renderer';
import { JsonLd } from '@/components/seo/json-ld';
import { buildMetadata } from '@/lib/seo/metadata';
import { cmsPageJsonLd } from '@/lib/seo/page-schema';
import { primaryKeywords } from '@/lib/seo/keywords';
import type { CountryContext } from '@/lib/country/types';

/**
 * A CMS page, in one market.
 *
 * Both entry points — the root market's catch-all and a prefixed market's —
 * render through here, so there is exactly one implementation of "what is a CMS
 * page" and no chance of the two drifting apart.
 */

export async function cmsPageMetadata(
  country: CountryContext,
  slug: string,
): Promise<Metadata> {
  const page = await getPublishedPage(country.id, slug);
  if (!page) return { title: 'Page not found', robots: { index: false, follow: false } };

  const [ogImage, twitterImage, alternates] = await Promise.all([
    page.ogImageId
      ? prisma.media.findUnique({ where: { id: page.ogImageId }, select: { url: true } })
      : null,
    page.twitterImageId
      ? prisma.media.findUnique({ where: { id: page.twitterImageId }, select: { url: true } })
      : null,
    findPublishedPageCountries(slug),
  ]);

  return buildMetadata({
    title: page.seoTitle || page.title,
    description: page.seoDescription,
    path: `/${slug}`,
    country,
    alternateCountryIds: alternates,
    canonicalUrl: page.canonicalUrl,
    noIndex: page.noIndex,
    noFollow: page.noFollow,
    ogTitle: page.ogTitle,
    ogDescription: page.ogDescription,
    ogImageUrl: ogImage?.url ?? null,
    twitterTitle: page.twitterTitle,
    twitterDescription: page.twitterDescription,
    twitterImageUrl: twitterImage?.url ?? null,
    keywords: primaryKeywords(page),
  });
}

export async function CmsPageSurface({
  country,
  slug,
}: {
  country: CountryContext;
  slug: string;
}) {
  const page = await getPublishedPage(country.id, slug);

  /*
   * A missing page in one market never falls back to another market's content
   * — that would serve the wrong prices to the wrong customers. A redirect
   * written for this address is followed; otherwise it is a 404.
   */
  if (!page) return redirectOrNotFound(country, slug);

  const site = await getWebsiteSettings();

  // FAQ markup from the page's FAQ sections, and its breadcrumb trail — built
  // by the same function SEO Intelligence analyses.
  const jsonLd = cmsPageJsonLd(country, { title: page.title, slug, sections: page.sections }, site.siteName);

  return (
    <>
      <SectionList sections={page.sections} country={country} />
      {jsonLd.map((data, index) => (
        <JsonLd key={index} data={data} />
      ))}
    </>
  );
}
