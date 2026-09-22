import { describe, it, expect } from 'vitest';
import { originalSlug } from '@/lib/utils/slug';
import { visibleModules } from '@/lib/admin/nav';

/**
 * The recycle bin.
 *
 * Deleting has never destroyed anything here — a page, an article, a category
 * and a brand are all marked deleted and parked under a freed slug. These are
 * the two rules that makes visible: the bin is reachable, and the URL it shows
 * is the one somebody would look for rather than the parked spelling.
 */

describe('the URL a deleted thing is listed under', () => {
  it('is the one it had, not the one it is parked under', () => {
    expect(originalSlug('dropbox-business-deleted-1758000000000')).toBe('dropbox-business');
    expect(originalSlug('cloud-storage-deleted-1')).toBe('cloud-storage');
  });

  it('leaves a slug that was never parked alone', () => {
    expect(originalSlug('dropbox-business')).toBe('dropbox-business');
    // A slug that merely mentions the word is not a parked one.
    expect(originalSlug('how-we-deleted-our-servers')).toBe('how-we-deleted-our-servers');
  });

  it('never returns nothing, whatever it is handed', () => {
    // An empty slug is the homepage, and the bin still has to name it.
    expect(originalSlug('-deleted-123')).toBe('-deleted-123');
    expect(originalSlug('')).toBe('');
  });
});

describe('finding the bin', () => {
  const can = () => true;

  it('is in the sidebar for anybody who can see pages', () => {
    const items = visibleModules(can, false).flatMap((module) => module.items);
    const bin = items.find((item) => item.href === '/admin/trash');
    expect(bin, 'the recycle bin should be in the admin nav').toBeDefined();
    expect(bin?.permission).toBe('pages.view');
  });

  it('keeps the products bin as its own entry', () => {
    // Restoring a product is a decision about which markets sell it, so it
    // stays where the market context is.
    const items = visibleModules(can, false).flatMap((module) => module.items);
    expect(items.some((item) => item.href === '/admin/products/trash')).toBe(true);
  });

  it('is hidden from somebody who cannot see pages', () => {
    const items = visibleModules((permission) => permission !== 'pages.view', false).flatMap(
      (module) => module.items,
    );
    expect(items.some((item) => item.href === '/admin/trash')).toBe(false);
  });
});
