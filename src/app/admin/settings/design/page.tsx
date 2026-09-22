import type { Metadata } from 'next';
import Link from 'next/link';
import { Eye } from 'lucide-react';
import { requirePermission, userCan } from '@/lib/auth/guards';
import { getWebsiteSettings } from '@/lib/services/settings';
import { getAdminCountryScope } from '@/lib/country/admin';
import { getFooterSectionRows } from '@/lib/services/footer-cms';
import { listActiveFormChoices } from '@/lib/services/forms';
import { AdminPageHeader } from '@/components/admin/page-header';
import { WebsiteSettingsForm } from '@/components/admin/settings/settings-form';
import { FooterBuilder } from '@/components/admin/settings/footer-builder';
import type { BuilderSection } from '@/components/cms/section-builder';
import { parseBlockContent } from '@/lib/cms/blocks';
import { Card, CardBody } from '@/components/ui/card';
import { buttonClasses } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Website design' };
export const dynamic = 'force-dynamic';

/**
 * Website design.
 *
 * The colours, typography and layout half of website settings, on its own
 * screen so an admin changing the brand palette is not scrolling past SMTP and
 * contact details. It renders the same form component and calls the same
 * `saveWebsiteSettings` action as /admin/settings — there is no second theme
 * store.
 *
 * The whole footer is here too. It used to be in three places — a Footer tab
 * on this screen, the same tab again on /admin/settings, and the builder on a
 * screen of its own — which is three answers to "where do I change the
 * footer" and no way to tell which one does anything. The Footer tab now
 * carries its structure and its appearance, one above the other, and is the
 * only place either lives.
 */
export default async function WebsiteDesignAdmin() {
  const user = await requirePermission('settings.manage');
  const [settings, scope, forms] = await Promise.all([
    getWebsiteSettings(),
    getAdminCountryScope(),
    listActiveFormChoices(),
  ]);
  const rows = await getFooterSectionRows(scope.country.id);

  const footerSections: BuilderSection[] = rows.map((row) => ({
    id: row.id,
    blockType: row.blockType,
    name: row.name,
    isVisible: row.isVisible,
    sortOrder: row.sortOrder,
    content: parseBlockContent(row.blockType, row.content),
    settings: (row.settings ?? {}) as Record<string, unknown>,
  }));

  const { id, updatedAt, ...rest } = settings;
  void id;
  void updatedAt;

  const initial = Object.fromEntries(
    Object.entries(rest).map(([key, value]) => [key, value === null ? '' : value]),
  ) as Record<string, string | boolean>;

  return (
    <div className="mx-auto max-w-4xl">
      <AdminPageHeader
        title="Website design"
        description="Colours, fonts, buttons, layout, and the header and footer. Every CMS section can override these individually."
        actions={
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClasses('outline', 'md')}
          >
            <Eye className="h-4 w-4" aria-hidden="true" />
            View website
          </Link>
        }
      />
      <WebsiteSettingsForm
        initial={initial}
        canEdit={userCan(user, 'settings.manage')}
        only={['theme', 'typography', 'design', 'header', 'footer']}
        forms={forms}
        footerSlot={
          <Card>
            <CardBody className="space-y-4">
              <div>
                <h2 className="font-heading text-base font-semibold text-content">
                  Footer structure — {scope.country.name}
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Rows stack down the footer; a row can be divided into columns. A footer belongs
                  to its market, so this part follows the market switcher — the appearance below
                  is the whole website&apos;s.
                </p>
              </div>
              <FooterBuilder
                countryId={scope.country.id}
                countryName={scope.country.name}
                sections={footerSections}
                canEdit={userCan(user, 'settings.manage')}
              />
            </CardBody>
          </Card>
        }
      />
    </div>
  );
}
