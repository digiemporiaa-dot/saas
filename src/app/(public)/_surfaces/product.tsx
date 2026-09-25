import type { Metadata } from 'next';
import { getPublicProduct, getProductSeo, findLiveProductCountries } from '@/lib/services/products';
import { getMediaByIds } from '@/lib/services/media';
import { redirectOrNotFound } from '@/lib/services/redirects';
import { taxonomyHrefs } from '@/lib/services/taxonomy-pages';
import { getWebsiteSettings } from '@/lib/services/settings';
import { buildMetadata } from '@/lib/seo/metadata';
import { effectiveKeywords } from '@/lib/seo/keywords';
import { JsonLd } from '@/components/seo/json-ld';
import { productPageJsonLd } from '@/lib/seo/page-schema';
import { SectionList, type RenderableSection } from '@/components/cms/section-renderer';
import { getProductSections, getProductSettings } from '@/lib/services/product-cms';
import { productStyleVars } from '@/lib/cms/product-settings';
import type { ProductRenderContext } from '@/lib/cms/product-render';
import { cn } from '@/lib/utils/cn';
import type { CountryContext } from '@/lib/country/types';

/**
 * A product page, in one market.
 *
 * Identity, specification and imagery come from the global product; price,
 * currency, availability, local copy and SEO come from that market's
 * `ProductCountry` row — which is also what decides whether the page exists
 * there at all.
 */

export async function productMetadata(
  country: CountryContext,
  slug: string,
): Promise<Metadata> {
  const [row, alternates] = await Promise.all([
    getProductSeo(country.id, slug),
    findLiveProductCountries(slug),
  ]);
  if (!row) return { title: 'Product not found', robots: { index: false, follow: false } };

  const product = row.product;

  return buildMetadata({
    title: row.seoTitle || product.seoTitle || product.name,
    description: row.seoDescription || product.seoDescription || product.shortDescription,
    path: `/products/${slug}`,
    country,
    alternateCountryIds: alternates,
    canonicalUrl: row.canonicalUrl || product.canonicalUrl,
    noIndex: row.noIndex || product.noIndex,
    ogImageUrl: row.ogImage?.url ?? product.ogImage?.url ?? product.image?.url ?? null,
    type: 'product',
    // The market's own keywords, or the product's when the market set none.
    keywords: effectiveKeywords(row, product).keywords,
  });
}

export async function ProductSurface({
  country,
  slug,
}: {
  country: CountryContext;
  slug: string;
}) {
  const [product, site, settings] = await Promise.all([
    getPublicProduct(country, slug),
    getWebsiteSettings(),
    getProductSettings(),
  ]);
  /*
   * A product this market does not sell — renamed, retired, or never offered
   * here — follows a redirect if one was written for its address. A renamed
   * product's old URL is exactly what the redirect manager is for.
   */
  if (!product) return redirectOrNotFound(country, `products/${slug}`);

  const [gallery, detail, sidebar, taxonomy] = await Promise.all([
    getMediaByIds(product.galleryIds),
    getProductSections(product.id, 'DETAIL'),
    getProductSections(product.id, 'SIDEBAR'),
    taxonomyHrefs(country, product),
  ]);

  // Preserve the order the admin arranged in the gallery picker.
  const galleryImages = product.galleryIds
    .map((id) => gallery.get(id))
    .filter((image): image is NonNullable<typeof image> => Boolean(image));

  /*
   * One context for the whole page. Every section reads the product from here
   * rather than querying for it, which is what lets a product page be built
   * from the same blocks as any other page.
   */
  const ctx: ProductRenderContext = {
    country,
    product,
    gallery: galleryImages,
    settings,
    siteName: site.siteName,
    categoryHref: taxonomy.categoryHref,
    brandHref: taxonomy.brandHref,
  };

  const { layout } = settings;
  const withSidebar = layout.sidebarEnabled && sidebar.some((section) => section.isVisible);

  return (
    <div
      className="product-surface"
      style={productStyleVars(settings) as React.CSSProperties}
    >
      <div
        className="mx-auto px-4 py-14 sm:px-6 sm:py-20"
        style={{ maxWidth: 'var(--product-container, 72rem)' }}
      >
        <div
          className={cn(
            'product-layout',
            !withSidebar && 'product-layout--no-sidebar',
            withSidebar && layout.sidebarPosition === 'left' && 'product-layout--left',
            withSidebar && layout.mobileSidebar === 'above' && 'product-layout--aside-above',
            withSidebar && layout.mobileSidebar === 'hidden' && 'product-layout--aside-hidden',
          )}
        >
          {/* A flex column rather than `space-y`, so the gap between sections
              is one CSS variable the design screen can set. */}
          <div
            className="product-layout__main flex flex-col"
            style={{ gap: 'var(--product-section-gap, 3rem)' }}
          >
            <SectionList sections={detail} product={ctx} country={country} container={false} />
          </div>

          {/* The sidebar follows the content in the markup as well as in the
              grid, so a phone reads the product first whichever column the
              sidebar takes on a wide screen. */}
          {withSidebar ? (
            <ProductAside sections={sidebar} ctx={ctx} sticky={layout.sidebarSticky} />
          ) : null}
        </div>
      </div>

      <JsonLd data={productPageJsonLd(country, product, site.siteName, detail)} />
    </div>
  );
}

/**
 * The product's sidebar column.
 *
 * Sticky and mobile placement are design settings rather than per-section
 * ones: a price box that sticks on one product and not another is an
 * inconsistency a visitor notices, and neither is worth a control on every
 * widget. Both live in `.product-layout` in globals.css, where the phone
 * placement is a row of the grid rather than a stack of order utilities.
 */
function ProductAside({
  sections,
  ctx,
  sticky,
}: {
  sections: RenderableSection[];
  ctx: ProductRenderContext;
  sticky: boolean;
}) {
  return (
    <aside
      className={cn(
        'product-layout__aside space-y-6',
        sticky && 'product-layout__aside--sticky',
      )}
    >
      <SectionList
        sections={sections}
        product={ctx}
        country={ctx.country}
        container={false}
        allowFirst={false}
      />
    </aside>
  );
}
