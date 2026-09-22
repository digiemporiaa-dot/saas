import type * as React from 'react';
import type { WebsiteSettings } from '@prisma/client';
import { getPublicFormById } from '@/lib/services/forms';
import { getFooterSections } from '@/lib/services/footer-cms';
import { SectionList } from '@/components/cms/section-renderer';
import type { FooterRenderContext } from '@/lib/cms/footer-render';
import type { ResolvedNavigation, ResolvedNavItem } from '@/lib/services/navigation';
import type { CountryContext, CountrySettingsView } from '@/lib/country/types';

/**
 * The site footer.
 *
 * It is built the way a page is: a list of sections this market owns, each an
 * ordinary CMS block with the same design panel as everything else. Rows are
 * sections; columns live inside one, in the footer-columns block or in any
 * page block that lays out in columns.
 *
 * A market that has never opened the builder has no rows and renders the
 * built-in arrangement — the footer exactly as it was — so adding the builder
 * changed no live site.
 *
 * Brand identity stays global; the company name, contact details, menus and
 * copyright line come from the market being browsed, which is why the whole
 * footer is per market rather than one arrangement shared by all of them.
 */
export async function SiteFooter({
  settings,
  local,
  country,
  homeUrl = '/',
  columns,
  legal,
}: {
  settings: WebsiteSettings;
  /** The current market's contact details and copy. */
  local: CountrySettingsView;
  country: CountryContext;
  /** The current market's home page. */
  homeUrl?: string;
  columns: ResolvedNavigation[];
  legal: ResolvedNavItem[];
}) {
  /*
   * An existing form rather than a footer-only email box: its fields, consent
   * text, captcha, notifications and submissions then work exactly as they do
   * on any other page, and a signup from here lands in the same place as one
   * from a landing page.
   */
  const [sections, newsletter] = await Promise.all([
    getFooterSections(country.id),
    settings.footerNewsletterEnabled && settings.footerNewsletterFormId
      ? getPublicFormById(settings.footerNewsletterFormId)
      : Promise.resolve(null),
  ]);

  const ctx: FooterRenderContext = {
    settings,
    local,
    homeUrl,
    menus: columns,
    legal,
    newsletter,
  };

  return (
    <footer className="site-footer site-footer-body border-t border-hairline">
      <div
        className="mx-auto px-4 sm:px-6"
        style={{
          maxWidth: 'var(--footer-width, 80rem)',
          paddingBlock: 'var(--footer-padding-y, 3.5rem)',
        }}
      >
        {/* A flex column rather than `space-y`, so the gap between rows is one
            CSS variable the design screen can set. */}
        <div className="flex flex-col" style={{ gap: 'var(--footer-row-gap, 3rem)' }}>
          <SectionList
            sections={sections}
            footer={ctx}
            country={country}
            container={false}
            allowFirst={false}
          />
        </div>
      </div>
    </footer>
  );
}
