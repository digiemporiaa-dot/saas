import { describe, it, expect } from 'vitest';
import { originalSlug, uniqueSlug } from '@/lib/utils/slug';

/**
 * Restoring a removed product has to give it back its URL.
 *
 * Retiring one parks its slug under a generated suffix so the name is free for
 * whatever replaces it; this is the other half of that, and it is the part a
 * visitor notices — every link and every search result points at the old URL.
 */
describe('the slug a retired product comes back under', () => {
  it('strips the suffix retirement added', () => {
    expect(originalSlug('dropbox-standard-deleted-1758547200000')).toBe('dropbox-standard');
    expect(originalSlug('plan-deleted-1')).toBe('plan');
  });

  it('leaves a slug nobody retired alone', () => {
    expect(originalSlug('dropbox-standard')).toBe('dropbox-standard');
    // Words an administrator might genuinely type are not a retirement suffix.
    expect(originalSlug('deleted-scenes')).toBe('deleted-scenes');
    expect(originalSlug('recently-deleted')).toBe('recently-deleted');
    expect(originalSlug('product-deleted-2026-plan')).toBe('product-deleted-2026-plan');
  });

  it('never returns an empty URL', () => {
    // Nothing but a suffix is not a slug, so the stored value is kept.
    expect(originalSlug('-deleted-123')).toBe('-deleted-123');
  });

  it('takes the next free URL when the original was claimed meanwhile', async () => {
    const taken = new Set(['dropbox-standard']);
    const slug = await uniqueSlug(
      originalSlug('dropbox-standard-deleted-1758547200000'),
      async (candidate) => taken.has(candidate),
    );
    expect(slug).toBe('dropbox-standard-2');
  });

  it('gives the original back when nothing claimed it', async () => {
    const slug = await uniqueSlug(
      originalSlug('dropbox-standard-deleted-1758547200000'),
      async () => false,
    );
    expect(slug).toBe('dropbox-standard');
  });
});
