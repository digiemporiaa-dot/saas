import type { PublicProduct } from '@/lib/services/products';
import type { ResolvedMedia } from '@/lib/services/media';
import type { CountryContext } from '@/lib/country/types';
import type { ResolvedProductSettings } from './product-settings';

/**
 * Everything a product block needs that is not its own content.
 *
 * The route resolves this once — the product for this market, its gallery, the
 * design settings — and every block reads from it. Blocks never query for the
 * product they are on, which is what lets the same `productFeatures` block work
 * on any product page without knowing which one it is.
 */
export type ProductRenderContext = {
  /** The market this product page is being rendered for. */
  country: CountryContext;
  product: PublicProduct;
  /** Gallery media, already in the order the administrator arranged. */
  gallery: ResolvedMedia[];
  settings: ResolvedProductSettings;
  /** Used by the price box's small print. */
  siteName: string;
};
