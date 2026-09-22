'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FileText, FilePlus } from 'lucide-react';
import { generateTaxonomyPage } from '@/lib/actions/products';
import type { TaxonomyKind } from '@/lib/cms/taxonomy-pages';
import { useToast } from '@/components/ui/toast';
import { Spinner } from '@/components/ui/icons';

/**
 * The page a category or brand sends people to.
 *
 * Anything created from now on has one already, so this is usually a link. The
 * button is for the categories and brands that existed before pages were
 * generated, and it is a button rather than something automatic: a page
 * deleted on purpose should stay deleted.
 */
export function TaxonomyPageLink({
  kind,
  id,
  name,
  pageId,
  canEdit,
}: {
  kind: TaxonomyKind;
  id: string;
  name: string;
  pageId: string | null;
  canEdit: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, setPending] = React.useState(false);

  if (pageId) {
    return (
      <Link
        href={`/admin/pages/${pageId}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-content"
      >
        <FileText className="h-3.5 w-3.5" aria-hidden="true" />
        Edit page
      </Link>
    );
  }

  if (!canEdit) return <span className="text-sm text-muted">—</span>;

  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        const result = await generateTaxonomyPage(kind, id);
        setPending(false);
        if (!result.ok) {
          toast(result.error, 'error');
          return;
        }
        toast(result.message ?? 'Page created.');
        router.refresh();
      }}
      className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-content disabled:opacity-60"
      aria-label={`Create the page for ${name}`}
    >
      {pending ? (
        <Spinner className="h-3.5 w-3.5" />
      ) : (
        <FilePlus className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      Create page
    </button>
  );
}
