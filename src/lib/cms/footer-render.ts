import type { WebsiteSettings } from '@prisma/client';
import type { CountrySettingsView } from '@/lib/country/types';
import type { ResolvedNavigation, ResolvedNavItem } from '@/lib/services/navigation';
import type { PublicForm } from '@/lib/services/forms';

/**
 * Everything a footer block needs that is not its own content.
 *
 * The layout resolves this once — the market's settings, its menus, the
 * newsletter form — and every block reads from it. Blocks never query for the
 * market they are in, which is what lets the same `footerBrand` block render
 * any market's footer without knowing which one it is.
 */
export type FooterRenderContext = {
  settings: WebsiteSettings;
  /** The market's own contact details and copy. */
  local: CountrySettingsView;
  /** The market's home page. */
  homeUrl: string;
  /** Every menu with a footer location, in the order they were created. */
  menus: ResolvedNavigation[];
  /** The legal menu's items, which the bottom row lists. */
  legal: ResolvedNavItem[];
  /** The newsletter form, already loaded, or null where none is configured. */
  newsletter: PublicForm | null;
};

/** A menu by slug, for the blocks that name one. */
export function footerMenu(
  ctx: FooterRenderContext,
  slug: string,
): ResolvedNavigation | null {
  const wanted = slug.trim().toLowerCase();
  if (!wanted) return null;
  return ctx.menus.find((menu) => menu.slug.toLowerCase() === wanted) ?? null;
}
