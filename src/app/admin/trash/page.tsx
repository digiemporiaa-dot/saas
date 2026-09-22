import type { Metadata } from 'next';
import Link from 'next/link';
import { Package } from 'lucide-react';
import { requirePermission, userCan } from '@/lib/auth/guards';
import { getAdminCountryScope } from '@/lib/country/admin';
import { listTrash } from '@/lib/services/trash';
import { AdminPageHeader } from '@/components/admin/page-header';
import { TrashTable } from '@/components/admin/trash/trash-table';
import { buttonClasses } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Recycle bin' };
export const dynamic = 'force-dynamic';

/**
 * The recycle bin.
 *
 * Pages, articles, product categories and brands that were deleted and can
 * still be brought back. Products have their own bin, because restoring one
 * is a decision about which markets sell it rather than about a row.
 *
 * Read permission is the loosest of the kinds it lists — somebody who can see
 * pages can see the bin — and every action inside it checks its own.
 */
export default async function TrashAdmin() {
  const user = await requirePermission('pages.view');
  const scope = await getAdminCountryScope();
  const items = await listTrash(scope.country);

  const canManage =
    userCan(user, 'pages.delete') ||
    userCan(user, 'blog.delete') ||
    userCan(user, 'products.delete');

  return (
    <>
      <AdminPageHeader
        title="Recycle bin"
        description={`Deleted pages, articles, categories and brands in ${scope.country.name}. Restore one to bring it back as a draft, with the URL it had.`}
        actions={
          <Link href="/admin/products/trash" className={buttonClasses('outline', 'md')}>
            <Package className="h-4 w-4" aria-hidden="true" />
            Removed products
          </Link>
        }
      />

      <TrashTable items={items} canManage={canManage} />
    </>
  );
}
