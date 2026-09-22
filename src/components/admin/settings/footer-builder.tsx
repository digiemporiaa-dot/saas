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
  replaceFooterArrangement,
  resetFooter,
} from '@/lib/actions/footer-layout';
import { FOOTER_ARRANGEMENTS, type FooterArrangement } from '@/lib/cms/footer-defaults';
import type { BuilderSection } from '@/components/cms/section-builder';
import { SectionWorkspace, type WorkspaceActions } from '@/components/cms/section-workspace';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils/cn';

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
  const [claiming, setClaiming] = React.useState<FooterArrangement | null>(null);
  const [resetting, setResetting] = React.useState(false);
  const [picking, setPicking] = React.useState(false);
  /** The arrangement waiting on a confirmation, because rebuilding discards. */
  const [rebuilding, setRebuilding] = React.useState<FooterArrangement | null>(null);

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
          page — nothing on the website changes until you pick one, and no other market is
          affected.
        </p>

        {/*
          * Two starting points rather than one. Either is an ordinary set of
          * rows the moment it is written, so choosing the one nearer the
          * footer somebody has in mind saves them rebuilding it — it does not
          * lock anything in.
          */}
        {canEdit ? (
          <ArrangementCards
            className="mx-auto mt-6 max-w-2xl"
            busy={claiming}
            actionLabel="Start from this"
            onPick={async (key) => {
              setClaiming(key);
              const result = await ensureFooterSections(countryId, key);
              setClaiming(null);
              if (!result.ok) {
                toast(result.error, 'error');
                return;
              }
              router.refresh();
            }}
          />
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
        <>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setPicking((open) => !open)}>
              {picking ? 'Never mind' : 'Start again from an arrangement'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setResetting(true)}>
              Reset to the built-in footer
            </Button>
          </div>

          {/*
            * Switching is the ordinary thing to want — the footer written
            * first is not always the shape the site turns out to need — but it
            * discards what is here, so it asks before it does.
            */}
          {picking ? (
            <div className="rounded-xl border border-dashed border-hairline p-4">
              <p className="mb-3 text-sm text-muted">
                Rebuilding replaces every row below. Nothing else about this market changes.
              </p>
              <ArrangementCards
                busy={null}
                actionLabel="Rebuild from this"
                onPick={(key) => setRebuilding(key)}
              />
            </div>
          ) : null}
        </>
      ) : null}

      <ConfirmDialog
        open={rebuilding !== null}
        onClose={() => setRebuilding(null)}
        title={
          rebuilding ? `Rebuild ${countryName}'s footer from “${FOOTER_ARRANGEMENTS[rebuilding].label}”?` : ''
        }
        message="Every row here is replaced with that arrangement. Other markets are not affected."
        confirmLabel="Rebuild"
        tone="danger"
        onConfirm={async () => {
          const key = rebuilding;
          setRebuilding(null);
          if (!key) return;
          const result = await replaceFooterArrangement(countryId, key);
          if (!result.ok) {
            toast(result.error, 'error');
            return;
          }
          setPicking(false);
          toast(result.message ?? 'Footer rebuilt.');
          router.refresh();
        }}
      />

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

/**
 * The arrangements a footer can be built from, as cards.
 *
 * Shared by the empty screen and by the rebuild panel so the two offer the
 * same choice in the same words — the only difference is what picking one
 * does.
 */
function ArrangementCards({
  busy,
  actionLabel,
  onPick,
  className,
}: {
  busy: FooterArrangement | null;
  actionLabel: string;
  onPick: (key: FooterArrangement) => void;
  className?: string;
}) {
  return (
    <div className={cn('grid gap-3 sm:grid-cols-2', className)}>
      {(Object.keys(FOOTER_ARRANGEMENTS) as FooterArrangement[]).map((key) => {
        const arrangement = FOOTER_ARRANGEMENTS[key];
        return (
          <div key={key} className="flex flex-col rounded-lg border border-hairline p-4 text-left">
            <p className="text-sm font-medium text-content">{arrangement.label}</p>
            <p className="mt-1 flex-1 text-xs leading-relaxed text-muted">
              {arrangement.description}
            </p>
            <Button
              className="mt-4"
              size="sm"
              variant={key === 'classic' ? 'primary' : 'outline'}
              disabled={busy !== null}
              onClick={() => onPick(key)}
            >
              {busy === key ? 'Preparing…' : actionLabel}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
