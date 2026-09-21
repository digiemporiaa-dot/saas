import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getPublicProduct, getProductSeo, findLiveProductCountries } from '@/lib/services/products';
import { getMediaByIds } from '@/lib/services/media';
import { getWebsiteSettings } from '@/lib/services/settings';
import { buildMetadata, absoluteCountryUrl } from '@/lib/seo/metadata';
import { JsonLd } from '@/components/seo/json-ld';
import { countryBreadcrumbSchema, productSchema } from '@/lib/seo/structured-data';
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
  if (!product) notFound();

  const [gallery, detail, sidebar] = await Promise.all([
    getMediaByIds(product.galleryIds),
    getProductSections(product.id, 'DETAIL'),
    getProductSections(product.id, 'SIDEBAR'),
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
  };

  const { layout } = settings;
  const withSidebar = layout.sidebarEnabled && sidebar.some((section) => section.isVisible);
  const sidebarFirst = layout.sidebarPosition === 'left';

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
            'grid gap-12 lg:gap-16',
            withSidebar && 'lg:[grid-template-columns:var(--product-columns)]',
          )}
          style={
            withSidebar
              ? ({
                  ['--product-columns' as string]: sidebarFirst
                    ? 'var(--product-sidebar-width, 33%) 1fr'
                    : '1fr var(--product-sidebar-width, 33%)',
                  gap: 'var(--product-sidebar-gap)',
                } as React.CSSProperties)
              : undefined
          }
        >
          {withSidebar && sidebarFirst ? (
            <ProductAside sections={sidebar} ctx={ctx} sticky={layout.sidebarSticky} mobile={layout.mobileSidebar} />
          ) : null}

          {/* A flex column rather than `space-y`, so the gap between sections
              is one CSS variable the design screen can set. */}
          <div
            className="flex min-w-0 flex-col"
            style={{ gap: 'var(--product-section-gap, 3rem)' }}
          >
            <SectionList sections={detail} product={ctx} country={country} container={false} />
          </div>

          {withSidebar && !sidebarFirst ? (
            <ProductAside sections={sidebar} ctx={ctx} sticky={layout.sidebarSticky} mobile={layout.mobileSidebar} />
          ) : null}
        </div>
      </div>

      <JsonLd
        data={[
          productSchema({
            name: product.name,
            description: product.shortDescription,
            url: absoluteCountryUrl(country, `products/${product.slug}`),
            imageUrl: product.imageUrl,
            price: product.monthlyPrice,
            currency: product.currency,
            sku: product.sku,
            brand: site.siteName,
          }),
          countryBreadcrumbSchema(country, [
            { name: 'Home', path: '' },
            { name: 'Plans', path: 'pricing' },
            { name: product.name, path: `products/${product.slug}` },
          ]),
        ]}
      />
    </div>
  );
}

/**
 * The product's sidebar column.
 *
 * Sticky and mobile placement are design settings rather than per-section
 * ones: a price box that sticks on one product and not another is an
 * inconsistency a visitor notices, and neither is worth a control on every
 * widget.
 */
function ProductAside({
  sections,
  ctx,
  sticky,
  mobile,
}: {
  sections: RenderableSection[];
  ctx: ProductRenderContext;
  sticky: boolean;
  mobile: 'below' | 'above' | 'hidden';
}) {
  return (
    <aside
      className={cn(
        'space-y-6',
        mobile === 'hidden' && 'hidden lg:block',
        // Ordering only applies while the grid is a single column.
        mobile === 'above' ? 'order-first lg:order-none' : 'order-last lg:order-none',
        sticky && 'lg:sticky lg:self-start',
      )}
      style={sticky ? { top: 'var(--product-sticky-offset, 96px)' } : undefined}
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
