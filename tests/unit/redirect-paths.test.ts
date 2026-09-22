import { describe, it, expect } from 'vitest';
import {
  redirectLookupPaths,
  redirectCandidates,
  isSelfRedirect,
} from '@/lib/seo/redirect-paths';

/**
 * Which addresses a redirect rule is matched against.
 *
 * A rule is written once, in one box, and has to work for the URL somebody
 * actually typed — whichever market they are in, and whichever way the slashes
 * were typed. These are those rules, without a database in the way.
 */

const root = { slug: '' };
const uae = { slug: 'ae' };

describe('the addresses a request is matched on', () => {
  it('tries the market address and the market-relative one', () => {
    expect(redirectLookupPaths(uae, 'products/old-plan')).toEqual({
      full: '/ae/products/old-plan',
      relative: '/products/old-plan',
    });
  });

  it('is the same address twice in the root market', () => {
    expect(redirectLookupPaths(root, 'products/old-plan')).toEqual({
      full: '/products/old-plan',
      relative: '/products/old-plan',
    });
  });

  it('does not care how the caller typed the slashes', () => {
    for (const written of ['blog/gone', '/blog/gone', '///blog/gone']) {
      expect(redirectLookupPaths(uae, written).relative, written).toBe('/blog/gone');
    }
  });

  it('handles the homepage, which has no slug at all', () => {
    expect(redirectLookupPaths(uae, '')).toEqual({ full: '/ae', relative: '/' });
    expect(redirectLookupPaths(root, '')).toEqual({ full: '/', relative: '/' });
  });
});

describe('the stored sources a rule can be written as', () => {
  it('matches a rule whether or not it was saved with a leading slash', () => {
    const candidates = redirectCandidates('/old-plan');
    expect(candidates).toContain('/old-plan');
    expect(candidates).toContain('old-plan');
  });

  it('tries the market-relative address too, so one rule covers every market', () => {
    const candidates = redirectCandidates('/ae/old-plan', '/old-plan');
    // Written for the UAE alone…
    expect(candidates).toContain('/ae/old-plan');
    // …or written once for everywhere.
    expect(candidates).toContain('/old-plan');
  });

  it('never asks the database the same question twice', () => {
    const candidates = redirectCandidates('/old-plan', '/old-plan');
    expect(new Set(candidates).size).toBe(candidates.length);
  });
});

describe('a rule pointing at itself', () => {
  it('is ignored however its slashes were typed', () => {
    expect(isSelfRedirect('/old-plan', 'old-plan')).toBe(true);
    expect(isSelfRedirect('old-plan/', '/old-plan')).toBe(true);
    expect(isSelfRedirect('/old-plan', '/new-plan')).toBe(false);
  });
});
