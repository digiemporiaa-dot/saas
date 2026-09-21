'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { ProductSurface } from '@prisma/client';
import {
  addProductSection,
  updateProductSection,
  deleteProductSection,
  duplicateProductSection,
  reorderProductSections,
  toggleProductSectionVisibility,
  ensureProductSurface,
  resetProductSurface,
} from '@/lib/actions/product-layout';
import type { BuilderSection } from '@/components/cms/section-builder';
import { SectionWorkspace, type WorkspaceActions } from '@/components/cms/section-workspace';
import { AdminTabs, TabPanel } from '@/components/admin/admin-tabs';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import type { BlockSurface } from '@/lib/cms/blocks';

/**
 * One product's page, as a builder.
 *
 * Two surfaces, one workspace. Each tab is the same drag-and-drop screen the
 * page editor and the blog use, bound to the product Server Actions — so
 * rearranging a product page, adding a FAQ to it or rebuilding its price
 * column are all the same gesture, and none of them is a code change.
 *
 * Layouts belong to the product, not to the catalogue: changing one product's
 * page leaves every other product exactly as it was.
 */

const SURFACE_META: Record<
  ProductSurface,
  {
    label: string;
    blockSurface: BlockSurface;
    listLabel: string;
    addTitle: string;
    addDescription: string;
    empty: string;
    claim: string;
  }
> = {
  DETAIL: {
    label: 'Page',
    blockSurface: 'productDetail',
    listLabel: 'Product page structure',
    addTitle: 'Add a section to this product',
    addDescription:
      'Every section you can put on a page can go here too — a hero, a FAQ, testimonials, a slider.',
    empty: 'Add the header, the images and the description, then anything else this product needs.',
    claim: 'product page',
  },
  SIDEBAR: {
    label: 'Sidebar',
    blockSurface: 'productSidebar',
    listLabel: 'Sidebar widgets',
    addTitle: 'Add a widget beside the product',
    addDescription: 'Widgets render top to bottom in the order below.',
    empty: 'Add the price box, then whatever should sit under it.',
    claim: 'sidebar',
  },
};

export function ProductLayoutBuilder({
  productId,
  surfaces,
  canEdit,
  initialTab = 'DETAIL',
}: {
  productId: string;
  surfaces: Record<ProductSurface, BuilderSection[]>;
  canEdit: boolean;
  initialTab?: ProductSurface;
}) {
  const [tab, setTab] = React.useState<ProductSurface>(initialTab);
  const order: ProductSurface[] = ['DETAIL', 'SIDEBAR'];

  return (
    <>
      <AdminTabs
        tabs={order.map((surface) => ({
          id: surface,
          label: SURFACE_META[surface].label,
          badge: surfaces[surface].length,
        }))}
        active={tab}
        onChange={(id) => setTab(id as ProductSurface)}
        className="mb-4"
      />

      {order.map((surface) => (
        <TabPanel key={surface} id={surface} active={tab}>
          <SurfacePanel
            productId={productId}
            surface={surface}
            sections={surfaces[surface]}
            canEdit={canEdit}
          />
        </TabPanel>
      ))}
    </>
  );
}

function SurfacePanel({
  productId,
  surface,
  sections,
  canEdit,
}: {
  productId: string;
  surface: ProductSurface;
  sections: BuilderSection[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [claiming, setClaiming] = React.useState(false);
  const [resetting, setResetting] = React.useState(false);
  const meta = SURFACE_META[surface];

  const actions = React.useMemo<WorkspaceActions>(
    () => ({
      add: (blockType) => addProductSection({ productId, surface, blockType }),
      save: (sectionId, payload) => updateProductSection(sectionId, payload),
      duplicate: (sectionId) => duplicateProductSection(sectionId),
      remove: (sectionId) => deleteProductSection(sectionId),
      reorder: (order) => reorderProductSections({ productId, surface, order }),
      toggleVisibility: (sectionId) => toggleProductSectionVisibility(sectionId),
    }),
    [productId, surface],
  );

  /**
   * Until this product's surface has been saved once, the website renders the
   * built-in arrangement. Claiming it writes that arrangement out as real
   * rows, so the first edit starts from what is already live rather than from
   * an empty screen.
   */
  if (sections.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-hairline p-8 text-center">
        <p className="text-sm font-medium text-content">
          This {meta.claim} is using the built-in arrangement
        </p>
        <p className="mx-auto mt-1.5 max-w-md text-sm text-muted">
          The website already renders a complete {meta.claim} for this product. Take control of it
          to reorder, restyle, add or remove its sections — nothing on the website changes until you
          edit something, and no other product is affected.
        </p>
        {canEdit ? (
          <Button
            className="mt-5"
            disabled={claiming}
            onClick={async () => {
              setClaiming(true);
              const result = await ensureProductSurface(productId, surface);
              setClaiming(false);
              if (!result.ok) {
                toast(result.error, 'error');
                return;
              }
              router.refresh();
            }}
          >
            {claiming ? 'Preparing…' : `Customise this ${meta.claim}`}
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SectionWorkspace
        initialSections={sections}
        canEdit={canEdit}
        actions={actions}
        surface={meta.blockSurface}
        dndId={`product-${productId}-${surface}`}
        listLabel={meta.listLabel}
        addTitle={meta.addTitle}
        addDescription={meta.addDescription}
        emptyTitle="Nothing here yet"
        emptyDescription={meta.empty}
      />

      {canEdit ? (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => setResetting(true)}>
            Reset to the built-in arrangement
          </Button>
        </div>
      ) : null}

      <ConfirmDialog
        open={resetting}
        onClose={() => setResetting(false)}
        title={`Reset this ${meta.claim}?`}
        message={`Every section you added or changed here is removed, and this product goes back to the built-in ${meta.claim}. Other products are not affected.`}
        confirmLabel="Reset"
        tone="danger"
        onConfirm={async () => {
          const result = await resetProductSurface(productId, surface);
          setResetting(false);
          toast(result.ok ? 'Layout reset.' : result.error, result.ok ? 'success' : 'error');
          if (result.ok) router.refresh();
        }}
      />
    </div>
  );
}
