'use client';

import * as React from 'react';
import { Check, Loader2, Play, RefreshCw, TriangleAlert, X } from 'lucide-react';
import type { SeedFile, SeedRunResult } from '@/lib/seed-files/seed-files.service';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/cn';

/**
 * Pick seed files, run them, read what each one said.
 *
 * The list is server-rendered and handed in; this component only tracks what
 * is ticked and what came back. Nothing it does is trusted: the endpoint it
 * posts to re-checks the role, re-reads the directory and refuses any name
 * that is not in it, so a tampered request gets the same answer as a tampered
 * URL.
 */
export function SeedFilesManager({ files }: { files: SeedFile[] }) {
  const [selected, setSelected] = React.useState<string[]>([]);
  const [confirming, setConfirming] = React.useState(false);
  const [running, setRunning] = React.useState(false);
  const [results, setResults] = React.useState<SeedRunResult[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const allSelected = files.length > 0 && selected.length === files.length;
  const someSelected = selected.length > 0 && !allSelected;

  const selectAllRef = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someSelected;
  }, [someSelected]);

  const toggle = (name: string) => {
    setSelected((current) =>
      current.includes(name) ? current.filter((item) => item !== name) : [...current, name],
    );
  };

  const toggleAll = () => setSelected(allSelected ? [] : files.map((file) => file.name));

  async function run() {
    setConfirming(false);
    setRunning(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch('/api/seed-files', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ files: selected }),
      });
      const payload = (await response.json()) as {
        results?: SeedRunResult[];
        error?: string;
      };

      if (!response.ok) {
        // 401 and 403 are the interesting ones: the session expired, or the
        // account is no longer a super admin. Both are worth saying plainly.
        setError(payload.error ?? `The seed run failed (HTTP ${response.status}).`);
        return;
      }
      setResults(payload.results ?? []);
    } catch {
      setError('Could not reach the server. Check the connection and try again.');
    } finally {
      setRunning(false);
    }
  }

  if (files.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-hairline bg-surface px-4 py-10 text-center">
        <p className="text-sm font-medium text-content">No seed files found.</p>
        <p className="mt-1.5 text-sm text-muted">
          Add a <code className="rounded bg-muted/10 px-1 py-0.5">.ts</code> file to{' '}
          <code className="rounded bg-muted/10 px-1 py-0.5">prisma/seed/</code> and reload. Files
          beginning with an underscore are treated as helpers and are not listed.
        </p>
      </div>
    );
  }

  const failed = results?.some((result) => !result.ok) ?? false;

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-hairline bg-surface shadow-sm">
        <div className="flex flex-col gap-3 border-b border-hairline px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-content">
            <input
              ref={selectAllRef}
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              disabled={running}
              className="h-4 w-4 rounded border-hairline text-brand focus:ring-brand"
            />
            Select all
            <span className="font-normal text-muted">
              ({selected.length} of {files.length} selected)
            </span>
          </label>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
              disabled={running}
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Rescan
            </Button>
            <Button
              size="sm"
              onClick={() => setConfirming(true)}
              disabled={running || selected.length === 0}
            >
              {running ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Play className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {running ? 'Seeding…' : 'Seed selected'}
            </Button>
          </div>
        </div>

        <ul className="divide-y divide-hairline">
          {files.map((file) => {
            const result = results?.find((item) => item.name === file.name);
            return (
              <li key={file.name}>
                <label
                  className={cn(
                    'flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-muted/[0.03]',
                    running && 'cursor-progress opacity-70',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(file.name)}
                    onChange={() => toggle(file.name)}
                    disabled={running}
                    className="h-4 w-4 shrink-0 rounded border-hairline text-brand focus:ring-brand"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-mono text-sm text-content">
                      {file.name}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted">
                      {formatBytes(file.sizeBytes)} · modified{' '}
                      {new Date(file.modifiedAt).toLocaleString()}
                    </span>
                  </span>

                  {result ? (
                    <Badge tone={result.ok ? 'success' : 'danger'}>
                      {result.ok ? 'Seeded' : 'Failed'} · {formatMs(result.durationMs)}
                    </Badge>
                  ) : null}
                </label>

                {result ? (
                  <pre className="mx-4 mb-3 max-h-64 overflow-auto rounded-lg bg-muted/[0.06] p-3 text-xs leading-relaxed text-content">
                    {result.output}
                  </pre>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>

      {confirming ? (
        <div className="flex flex-col gap-3 rounded-xl border border-amber-500/30 bg-amber-50 px-4 py-3.5 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-2">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              This runs {selected.length} seed file{selected.length === 1 ? '' : 's'} against the
              live database, in the order listed above. Continue?
            </span>
          </p>
          <span className="flex shrink-0 items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={run}>
              Run them
            </Button>
          </span>
        </div>
      ) : null}

      {error ? (
        <p className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-50 px-4 py-3 text-sm text-red-800">
          <X className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : null}

      {results && results.length > 0 ? (
        <p
          className={cn(
            'flex items-start gap-2 rounded-xl border px-4 py-3 text-sm',
            failed
              ? 'border-red-500/30 bg-red-50 text-red-800'
              : 'border-emerald-500/30 bg-emerald-50 text-emerald-800',
          )}
        >
          {failed ? (
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          ) : (
            <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          {failed
            ? `A seed failed, so the run stopped there. ${results.length} of ${selected.length} file(s) were attempted.`
            : `All ${results.length} seed file(s) completed.`}
        </p>
      ) : null}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function formatMs(ms: number): string {
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}
