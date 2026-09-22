import type { Metadata } from 'next';
import Link from 'next/link';
import { Eye, Palette } from 'lucide-react';
import { requirePermission, userCan } from '@/lib/auth/guards';
import { getAdminCountryScope } from '@/lib/country/admin';
import { getFooterSectionRows } from '@/lib/services/footer-cms';
import { parseBlockContent } from '@/lib/cms/blocks';
import { AdminPageHeader } from '@/components/admin/page-header';
import { FooterBuilder } from '@/components/admin/settings/footer-builder';
import type { BuilderSection } from '@/components/cms/section-builder';
import { buttonClasses } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Footer' };
export const dynamic = 'force-dynamic';

/**
 * The footer, for the market being worked in.
 *
 * Footers are per market — the contact details, the menus and the copyright
 * line are each a market's own — so this screen follows the market switcher
 * like every other market-scoped screen. Colours and spacing stay on Website
 * design; what is arranged here is the structure.
 */
export default async function FooterAdmin() {
  const user = await requirePermission('settings.manage');
  const scope = await getAdminCountryScope();
  const rows = await getFooterSectionRows(scope.country.id);

  const sections: BuilderSection[] = rows.map((row) => ({
    id: row.id,
    blockType: row.blockType,
    name: row.name,
    isVisible: row.isVisible,
    sortOrder: row.sortOrder,
    content: parseBlockContent(row.blockType, row.content),
    settings: (row.settings ?? {}) as Record<string, unknown>,
  }));

  return (
    <>
      <AdminPageHeader
        title={`${scope.country.name} — footer`}
        description="Rows stack down the footer; a row can be divided into columns. Only this market's footer is affected."
        crumbs={[{ label: 'Settings', href: '/admin/settings' }, { label: 'Footer' }]}
        actions={
          <>
            <Link href="/admin/settings/design" className={buttonClasses('outline', 'md')}>
              <Palette className="h-4 w-4" aria-hidden="true" />
              Colours and spacing
            </Link>
            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClasses('outline', 'md')}
            >
              <Eye className="h-4 w-4" aria-hidden="true" />
              View website
            </Link>
          </>
        }
      />

      <FooterBuilder
        countryId={scope.country.id}
        countryName={scope.country.name}
        sections={sections}
        canEdit={userCan(user, 'settings.manage')}
      />
    </>
  );
}
