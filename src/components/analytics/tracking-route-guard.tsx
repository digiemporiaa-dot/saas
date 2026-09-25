'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { isPrivatePath } from '@/lib/analytics/private-paths';

/**
 * Keeps Google Analytics quiet on the private side of the site.
 *
 * Tags only load on public pages, but once loaded they stay in memory. A
 * client-side navigation into the admin — Back after "View site", a
 * `router.replace('/admin')` — keeps the same window, and GA4's enhanced
 * measurement would record the admin's history changes as page views. GA's
 * own opt-out flag, `window['ga-disable-<ID>']`, is set for as long as the path
 * is private and cleared again on the way back to the public site.
 */
export function TrackingRouteGuard({ measurementIds }: { measurementIds: string[] }) {
  const pathname = usePathname();
  const ids = measurementIds.join(',');

  React.useEffect(() => {
    if (!ids) return;
    const disabled = isPrivatePath(pathname ?? '/');
    const flags = window as unknown as Record<string, boolean>;
    for (const id of ids.split(',')) {
      flags[`ga-disable-${id}`] = disabled;
    }
  }, [pathname, ids]);

  return null;
}
