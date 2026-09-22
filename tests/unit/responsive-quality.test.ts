import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The layout rules that keep the page from scrolling sideways.
 *
 * Read from the source rather than from a browser, because these are the
 * mistakes that reintroduce themselves: a `100vw` panel, a table without a
 * scroll container, an overlay with no height bound. Each one below is a bug
 * this suite has already had to fix once.
 */

function tsxFiles(root: string, out: string[] = []): string[] {
  for (const entry of readdirSync(root)) {
    const path = join(root, entry);
    if (statSync(path).isDirectory()) tsxFiles(path, out);
    else if (path.endsWith('.tsx')) out.push(path);
  }
  return out;
}

/** Source with its comments removed, so prose about a rule is not read as one. */
function code(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const FILES = tsxFiles('src').map((path) => [path, readFileSync(path, 'utf8')] as const);
const CSS = readFileSync('src/app/globals.css', 'utf8');

describe('nothing widens the page', () => {
  /*
   * `100vw` counts the vertical scrollbar, so an element that wide overflows
   * every page that has one. The header's mega panel did, by about fifteen
   * pixels, on screens of every size.
   */
  it('sizes nothing to the full viewport width', () => {
    for (const [path, source] of FILES) {
      const offenders = code(source).match(/\bw-screen\b|width:\s*['"`]?100vw/g) ?? [];
      expect(offenders, `${path} sizes something to 100vw`).toEqual([]);
    }
  });

  it('caps a grid with no column count at the width it has', () => {
    // 159 grids are `grid gap-5 lg:grid-cols-3`, which below `lg` leaves the
    // single implicit column free to grow past the page.
    expect(CSS).toMatch(/\.grid\s*\{\s*grid-template-columns:\s*minmax\(0,\s*1fr\);/);
  });

  it('breaks a word too long for the screen instead of widening the page', () => {
    // A product name with no spaces, an email, a pasted URL: at a heading's
    // size any of those is wider than a phone on its own.
    expect(CSS).toMatch(/overflow-wrap:\s*break-word/);
  });
});

describe('tables scroll inside themselves', () => {
  it('never lets a table decide how wide the page is', () => {
    for (const [path, source] of FILES) {
      const body = code(source);
      if (!/<table/.test(body)) continue;

      const contained =
        /scroll-x|overflow-x-auto|overflow-auto|<TableWrap/.test(body) ||
        // A table that only exists on wide screens, with its own small-screen
        // rendering beside it, is not what makes a phone scroll.
        /hidden[^"']*\blg:block\b/.test(body);

      expect(contained, `${path} has a table with nowhere to scroll`).toBe(true);
    }
  });
});

describe('overlays stay inside the screen', () => {
  const OVERLAYS = [
    'src/components/ui/dialog.tsx',
    'src/components/public/popup-host.tsx',
    'src/components/admin/admin-search.tsx',
  ];

  it('bounds every overlay by the viewport and scrolls its body', () => {
    for (const path of OVERLAYS) {
      const source = readFileSync(path, 'utf8');
      expect(source, `${path} is unbounded`).toMatch(/max-h-\[\d+dvh\]/);
      expect(source, `${path} cannot scroll`).toMatch(/overflow-y-auto/);
    }
  });

  /*
   * `100vh` is the *large* viewport on a phone — taller than what is actually
   * showing while the address bar is up. A centred card measured against it
   * sits partly underneath that bar.
   */
  it('measures a centred full-height screen against the small viewport', () => {
    const CENTRED = [
      'src/app/auth/layout.tsx',
      'src/app/forbidden.tsx',
      'src/app/auth-control-panel/admin/page.tsx',
      'src/components/public/maintenance-notice.tsx',
    ];
    for (const path of CENTRED) {
      const source = readFileSync(path, 'utf8');
      expect(source, `${path} centres against 100vh`).toContain('min-h-dvh');
    }
  });
});

describe('the shells stay usable on a phone', () => {
  it('gives the admin sidebar a drawer rather than a column that pushes content off', () => {
    const shell = readFileSync('src/components/admin/admin-shell.tsx', 'utf8');
    // The rail is padding on wide screens only; below that it is a drawer the
    // topbar opens, so the main column keeps the whole width.
    expect(shell).toMatch(/lg:pl-/);
    expect(shell).toContain('onOpenSidebar');

    const sidebar = readFileSync('src/components/admin/sidebar.tsx', 'utf8');
    expect(sidebar).toMatch(/fixed inset-y-0/);
  });

  it('keeps the admin header from colliding with itself', () => {
    const topbar = readFileSync('src/components/admin/topbar.tsx', 'utf8');
    // Long names and long market names both live here, so the row needs
    // children that may shrink.
    expect(topbar).toContain('min-w-0');
  });

  it('lets a page header wrap its actions rather than pushing them out', () => {
    const header = readFileSync('src/components/admin/page-header.tsx', 'utf8');
    expect(header).toContain('flex-wrap');
    expect(header).toContain('min-w-0');
  });
});

describe('motion', () => {
  it('stands down when the visitor asked it to', () => {
    expect(CSS).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
  });
});
