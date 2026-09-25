import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { isPrivatePath } from '@/lib/analytics/private-paths';
import { LOGIN_PATH } from '@/lib/auth/routes';

/**
 * Marketing tags load on the public site and nowhere else.
 *
 * The root layout wraps every route — the admin, the sign-in screen, two-factor
 * setup, previews — so the tags live in the public layout, and a guard keeps
 * GA quiet if a tag loaded on a public page is still in memory when the visitor
 * navigates into the admin.
 */

describe('isPrivatePath', () => {
  it('covers the admin, sign-in, two-factor, preview and API routes', () => {
    for (const path of [
      '/admin',
      '/admin/leads',
      '/auth',
      '/auth/verify-2fa',
      LOGIN_PATH,
      '/preview',
      '/preview/x',
      '/api/forms',
    ]) {
      expect(isPrivatePath(path), path).toBe(true);
    }
  });

  it('leaves the public site alone, including paths that only start alike', () => {
    for (const path of ['/', '/ae/', '/blog/foo', '/products/bar', '/authors', '/administrator']) {
      expect(isPrivatePath(path), path).toBe(false);
    }
  });
});

describe('where the tags are rendered', () => {
  const root = readFileSync('src/app/layout.tsx', 'utf8');
  const publicLayout = readFileSync('src/app/(public)/layout.tsx', 'utf8');

  it('keeps them out of the root layout, which wraps the admin too', () => {
    for (const tag of ['<HeadTracking', '<BodyTracking', '<ConsentBanner', 'trackingScript']) {
      expect(root, tag).not.toContain(tag);
    }
    expect(root).toContain('<TrackingRouteGuard measurementIds={measurementIds} />');
  });

  it('renders them, and the consent banner, in the public layout', () => {
    expect(publicLayout).toContain('<HeadTracking');
    expect(publicLayout).toContain('placement="BODY_START"');
    expect(publicLayout).toContain('placement="BODY_END"');
    expect(publicLayout).toContain('<ConsentBanner');
  });
});
