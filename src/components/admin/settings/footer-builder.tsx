'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  addFooterSection,
  updateFooterSection,
  deleteFooterSection,
  duplicateFooterSection,
  reorderFooterSections,
  toggleFooterSectionVisibility,
  ensureFooterSections,
  resetFooter,
} from '@/lib/actions/footer-layout';
import type { BuilderSection } from '@/components/cms/section-builder';
import { SectionWorkspace, type WorkspaceActions } from '@/components/cms/section-workspace';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';

/**
 * The footer, as a builder.
 *
 * The same drag-and-drop screen the page editor, the blog and products use,
 * bound to the footer Server Actions — so rearranging a footer, dividing one
 * into columns or dropping a call to action into it are all the same gesture,
 * and none of them is a code change.
 *
 * **Rows are the sections in this list; columns live inside one.** A row is a
 * whole-width band of the footer; the "Footer columns" block divides one into
 * columns of text, links or a menu, and every page block is available too, so
 * a row can be a rich text block, an image or anything else.
 *
 * Footers belong to a market: rearranging one market's leaves every other
 * market exactly as it was.
 */
export function FooterBuilder({
  countryId,
  countryName,
  sections,
  canEdit,
}: {
  countryId: string;
  countryName: string;
  sections: BuilderSection[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [claiming, setClaiming] = React.useState(false);
  const [resetting, setResetting] = React.useState(false);

  const actions = React.useMemo<WorkspaceActions>(
    () => ({
      add: (blockType) => addFooterSection({ countryId, blockType }),
      save: (sectionId, payload) => updateFooterSection(sectionId, payload),
      duplicate: (sectionId) => duplicateFooterSection(sectionId),
      remove: (sectionId) => deleteFooterSection(sectionId),
      reorder: (order) => reorderFooterSections({ countryId, order }),
      toggleVisibility: (sectionId) => toggleFooterSectionVisibility(sectionId),
    }),
    [countryId],
  );

  /*
   * Until this market's footer has been saved once, the website renders the
   * built-in arrangement. Claiming it writes that arrangement out as real
   * rows, so the first edit starts from what is already live rather than from
   * an empty screen.
   */
  if (sections.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-hairline p-8 text-center">
        <p className="text-sm font-medium text-content">
          {countryName} is using the built-in footer
        </p>
        <p className="mx-auto mt-1.5 max-w-lg text-sm text-muted">
          The website already renders a complete footer for this market. Take control of it to
          reorder its rows, divide one into columns, restyle it or add anything you can add to a
          page — nothing on the website changes until you edit something, and no other market is
          affected.
        </p>
        {canEdit ? (
          <Button
            className="mt-5"
            disabled={claiming}
            onClick={async () => {
              setClaiming(true);
              const result = await ensureFooterSections(countryId);
              setClaiming(false);
              if (!result.ok) {
                toast(result.error, 'error');
                return;
              }
              router.refresh();
            }}
          >
            {claiming ? 'Preparing…' : 'Customise this footer'}
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
        surface="footer"
        dndId={`footer-${countryId}`}
        listLabel="Footer rows"
        addTitle="Add a row to the footer"
        addDescription="Rows stack top to bottom. “Footer columns” divides one into columns; every page section works here too."
        emptyTitle="Nothing here yet"
        emptyDescription="Add the brand block, the menus and the bottom row, then anything else this market needs."
      />

      {canEdit ? (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => setResetting(true)}>
            Reset to the built-in footer
          </Button>
        </div>
      ) : null}

      <ConfirmDialog
        open={resetting}
        onClose={() => setResetting(false)}
        title={`Reset ${countryName}'s footer?`}
        message="Every row here is removed and the footer goes back to the built-in arrangement. Other markets are not affected."
        confirmLabel="Reset"
        tone="danger"
        onConfirm={async () => {
          setResetting(false);
          const result = await resetFooter(countryId);
          if (!result.ok) {
            toast(result.error, 'error');
            return;
          }
          toast(result.message ?? 'Footer reset.');
          router.refresh();
        }}
      />
    </div>
  );
}
