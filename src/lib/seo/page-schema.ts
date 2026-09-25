import 'server-only';
import type { SeoSettings, WebsiteSettings } from '@prisma/client';
import { parseBlockContent, type FaqContent } from '@/lib/cms/blocks';
import type { CountryContext, CountrySettingsView } from '@/lib/country/types';
import { absoluteCountryUrl } from './metadata';
import {
  blogPostingSchema,
  countryBreadcrumbSchema,
  faqSchema,
  organizationSchema,
  productSchema,
  websiteSchema,
} from './structured-data';

/**
 * The JSON-LD each kind of public page emits.
 *
 * The public surfaces render exactly these arrays, and SEO Intelligence
 * analyses exactly these arrays, so the structured data a page is scored on is
 * the structured data it serves — there is no second description of it to
 * drift out of step.
 */

type Json = Record<string, unknown>;

type SectionLike = { blockType: string; content: unknown; isVisible: boolean };

/** The organisation and website objects the public layout adds to every page. */
export function siteJsonLd(
  country: CountryContext,
  local: CountrySettingsView,
  site: WebsiteSettings,
): Json[] {
  return [organizationSchema(country, local, site), websiteSchema(country, site)];
}

/** Questions and answers from a page's visible FAQ sections. */
export function faqItemsOf(sections: readonly SectionLike[]): Array<{ question: string; answer: string }> {
  return sections
    .filter((section) => section.blockType === 'faq' && section.isVisible)
    .flatMap((section) => parseBlockContent<FaqContent>('faq', section.content).items);
}

export function cmsPageJsonLd(
  country: CountryContext,
  page: { title: string; slug: string; sections: readonly SectionLike[] },
  siteName: string,
): Json[] {
  const faq = faqSchema(faqItemsOf(page.sections));
  const crumbs =
    page.slug === ''
      ? null
      : countryBreadcrumbSchema(country, [
          { name: siteName, path: '' },
          { name: page.title, path: page.slug },
        ]);
  return [faq, crumbs].filter((item): item is Json => item !== null);
}

export function productPageJsonLd(
  country: CountryContext,
  product: {
    name: string;
    slug: string;
    shortDescription: string | null;
    imageUrl: string | null;
    monthlyPrice: string | null;
    currency: string;
    sku: string | null;
    brandName: string | null;
  },
  siteName: string,
  sections: readonly SectionLike[] = [],
): Json[] {
  // An FAQ the product page shows is described like any other page's.
  const faq = faqSchema(faqItemsOf(sections));
  return [
    productSchema({
      name: product.name,
      description: product.shortDescription,
      url: absoluteCountryUrl(country, `products/${product.slug}`),
      imageUrl: product.imageUrl,
      price: product.monthlyPrice,
      currency: product.currency,
      sku: product.sku,
      // The brand the page shows beside the product name. The site name is the
      // fallback for a product with no brand, which is what every product
      // declared before brands were read here.
      brand: product.brandName || siteName,
    }),
    countryBreadcrumbSchema(country, [
      { name: 'Home', path: '' },
      { name: 'Plans', path: 'pricing' },
      { name: product.name, path: `products/${product.slug}` },
    ]),
    ...(faq ? [faq] : []),
  ];
}

export type BlogPostForSchema = {
  title: string;
  slug: string;
  seoDescription: string | null;
  excerpt: string | null;
  content: string;
  publishedAt: Date | null;
  updatedAt: Date;
  featuredImage: { url: string } | null;
  ogImage: { url: string } | null;
  tags: Array<{ tag: { name: string } }>;
  category: { name: string; slug: string } | null;
  author: {
    name: string;
    jobTitle: string | null;
    linkedinUrl: string | null;
    websiteUrl: string | null;
  } | null;
};

export function blogPostJsonLd(
  country: CountryContext,
  post: BlogPostForSchema,
  site: Pick<WebsiteSettings, 'siteName' | 'logoUrl'>,
  seo: Pick<SeoSettings, 'organizationName' | 'organizationLogoUrl'>,
): Json[] {
  return [
    blogPostingSchema({
      title: post.title,
      description: post.seoDescription || post.excerpt,
      url: absoluteCountryUrl(country, `blog/${post.slug}`),
      locale: country.locale,
      imageUrl: post.featuredImage?.url ?? post.ogImage?.url ?? null,
      publishedAt: post.publishedAt,
      updatedAt: post.updatedAt,
      wordCount: post.content.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean).length,
      keywords: post.tags.map(({ tag }) => tag.name),
      section: post.category?.name ?? null,
      author: post.author
        ? {
            name: post.author.name,
            jobTitle: post.author.jobTitle,
            url: post.author.linkedinUrl || post.author.websiteUrl,
          }
        : null,
      organizationName: seo.organizationName || site.siteName,
      logoUrl: seo.organizationLogoUrl ?? site.logoUrl,
    }),
    countryBreadcrumbSchema(country, [
      { name: 'Home', path: '' },
      { name: 'Blog', path: 'blog' },
      ...(post.category
        ? [{ name: post.category.name, path: `blog/category/${post.category.slug}` }]
        : []),
      { name: post.title, path: `blog/${post.slug}` },
    ]),
  ];
}

export function blogArchiveJsonLd(country: CountryContext): Json {
  return countryBreadcrumbSchema(country, [
    { name: 'Home', path: '' },
    { name: 'Blog', path: 'blog' },
  ]);
}

export function blogCategoryJsonLd(
  country: CountryContext,
  category: { name: string; slug: string; parent: { name: string; slug: string } | null },
): Json {
  return countryBreadcrumbSchema(country, [
    { name: 'Home', path: '' },
    { name: 'Blog', path: 'blog' },
    ...(category.parent
      ? [{ name: category.parent.name, path: `blog/category/${category.parent.slug}` }]
      : []),
    { name: category.name, path: `blog/category/${category.slug}` },
  ]);
}

export function blogTagJsonLd(country: CountryContext, tag: { name: string; slug: string }): Json {
  return countryBreadcrumbSchema(country, [
    { name: 'Home', path: '' },
    { name: 'Blog', path: 'blog' },
    { name: tag.name, path: `blog/tag/${tag.slug}` },
  ]);
}
