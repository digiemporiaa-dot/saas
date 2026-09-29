/**
 * Is the site calling itself by the address it is actually served on?
 *
 * Every absolute URL the site emits — canonical, og:url, hreflang, the
 * sitemaps, robots.txt — is built from NEXT_PUBLIC_SITE_URL. When the domain
 * is moved, say the bare domain now redirects to www, and that setting is not
 * moved with it, every one of those URLs points at a redirect. The admin is
 * served from the real address, so comparing the two there catches it.
 */

/** The host a request was addressed to: the first X-Forwarded-Host a proxy set, or Host. */
export function requestHostFrom(forwardedHost: string | null, host: string | null): string | null {
  const raw = (forwardedHost || host || '').split(',')[0]?.trim().toLowerCase();
  return raw ? raw : null;
}

export type SiteAddressMismatch = {
  /** The configured site address, e.g. https://example.com */
  configured: string;
  /** The host the admin is open on, e.g. www.example.com */
  actual: string;
  /** What the setting should probably say instead. */
  suggested: string;
};

/**
 * The mismatch, or null when the two agree.
 *
 * Local and bare-IP addresses are ignored: a developer's machine or a
 * container's internal address says nothing about where the public site lives.
 */
export function siteAddressMismatch(siteUrl: string, requestHost: string | null): SiteAddressMismatch | null {
  if (!requestHost) return null;
  let configured: URL;
  try {
    configured = new URL(siteUrl);
  } catch {
    return null;
  }
  const hostname = requestHost.replace(/:\d+$/, '');
  if (hostname === 'localhost' || hostname === '[::1]' || /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return null;
  if (configured.host.toLowerCase() === requestHost) return null;
  return {
    configured: configured.origin,
    actual: requestHost,
    suggested: `${configured.protocol}//${requestHost}`,
  };
}
