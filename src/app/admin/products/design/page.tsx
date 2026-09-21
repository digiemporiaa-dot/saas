import type { Metadata } from 'next';
import Link from 'next/link';
import { Package } from 'lucide-react';
import { requirePermission, userCan } from '@/lib/auth/guards';
import { getProductSettings } from '@/lib/services/product-cms';
import { AdminPageHeader } from '@/components/admin/page-header';
import { ProductDesignForm } from '@/components/admin/products/product-design-form';
import { buttonClasses } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Product design' };
export const dynamic = 'force-dynamic';

/**
 * Catalogue-wide product presentation.
 *
 * Everything here applies to every product: card appearance, image sizes, the
 * page's two columns and the product type scale. What one product does
 * differently is arranged on that product's own layout screen instead.
 */
export default async function ProductDesignAdmin() {
  const user = await requirePermission('products.view');
  const settings = await getProductSettings();

  return (
    <>
      <AdminPageHeader
        title="Product design"
        description="How products look everywhere: card style, image sizes, the page layout and the type scale. Every value is an override — leave one blank and it follows the website's own design."
        crumbs={[{ label: 'Products', href: '/admin/products' }, { label: 'Design' }]}
        actions={
          <Link href="/admin/products" className={buttonClasses('outline', 'md')}>
            <Package className="h-4 w-4" aria-hidden="true" />
            All products
          </Link>
        }
      />

      <ProductDesignForm initial={settings} canEdit={userCan(user, 'products.edit')} />
    </>
  );
}
