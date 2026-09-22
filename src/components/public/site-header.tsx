'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { buttonClasses, type ButtonVariant } from '@/components/ui/button';
import { resolveCmsIcon } from '@/components/ui/icons';
import type { ResolvedNavItem } from '@/lib/services/navigation';
import type { MarketOption } from '@/lib/country/switch';
import { MarketSwitcher } from './market-switcher';

export type HeaderBrand = {
  siteName: string;
  logoUrl: string | null;
  /** The current market's home page. `/` for the root market. */
  homeUrl: string;
  ctaLabel: string | null;
  ctaUrl: string | null;
  secondaryCtaLabel: string | null;
  secondaryCtaUrl: string | null;
  announcement: { text: string; url: string | null } | null;
  /**
   * Where the menu sits between the logo and the header buttons.
   *
   * Defaults to `left`, which is where it has always been, so a site that has
   * never touched the setting renders the header it already had.
   */
  menuAlign?: 'left' | 'center' | 'right';
  /**
   * Header buttons, beyond their label and link: an icon from the shipped set,
   * the side it sits on, and which button style to use. All optional — a site
   * that sets none of them gets the primary/ghost pair it always had.
   */
  ctaIcon?: string | null;
  ctaIconSide?: 'left' | 'right';
  ctaVariant?: ButtonVariant;
  secondaryCtaIcon?: string | null;
  secondaryCtaIconSide?: 'left' | 'right';
  secondaryCtaVariant?: ButtonVariant;
  /** Whether the header follows the page down. On unless switched off. */
  sticky?: boolean;
  /** Whether the hairline under the header is drawn. */
  border?: boolean;
};

/**
 * A header button: label, link, and an optional icon on either side.
 *
 * The icon is resolved through `resolveCmsIcon`, so what reaches the page is
 * always an icon this app ships — a stored value can name one or name nothing,
 * never bring its own markup.
 */
function HeaderButton({
  label,
  href,
  icon,
  side = 'left',
  variant,
  size,
  className,
}: {
  label: string;
  href: string;
  icon?: string | null;
  side?: 'left' | 'right';
  variant: ButtonVariant;
  size: 'sm' | 'lg';
  className?: string;
}) {
  const Icon = resolveCmsIcon(icon);
  return (
    <Link href={href} className={buttonClasses(variant, size, cn('btn-tokens', className))}>
      {Icon && side === 'left' ? <Icon className="h-4 w-4" aria-hidden="true" /> : null}
      {label}
      {Icon && side === 'right' ? <Icon className="h-4 w-4" aria-hidden="true" /> : null}
    </Link>
  );
}

/**
 * The wide panel a mega-menu item opens.
 *
 * A dropdown and a mega menu are the same tree read at different depths, and
 * the panel handles both shapes rather than demanding one:
 *
 * - **Grouped** — where any sub-item has sub-items of its own, each becomes a
 *   column heading with its links beneath it.
 * - **Flat** — where none does, the sub-items are simply dealt across the
 *   columns as links.
 *
 * That second case is what makes the switch worth having on a menu that is
 * only two levels deep: turning it on widens the list into columns instead of
 * producing a panel of headings with nothing under them.
 */
function MegaPanel({
  item,
  columns,
  onNavigate,
}: {
  item: ResolvedNavItem;
  columns: number;
  onNavigate?: () => void;
}) {
  const grouped = item.children.some((child) => child.children.length > 0);

  return (
    <div className="absolute left-1/2 top-full w-screen max-w-5xl -translate-x-1/2 px-4 pt-2">
      <div
        className="animate-slide-up rounded-xl border border-hairline bg-surface p-6 shadow-xl"
        style={{
          display: 'grid',
          gap: grouped ? '1.5rem 2rem' : '0.25rem 1rem',
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        }}
      >
        {grouped
          ? item.children.map((group) => (
              <div key={group.id} className="min-w-0">
                {/*
                  * A column heading is a link where it has somewhere to go and
                  * plain text where it does not — a group whose own page was
                  * deleted still names its column.
                  */}
                {group.href === '#' ? (
                  <p className="px-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                    {group.label}
                  </p>
                ) : (
                  <Link
                    href={group.href}
                    target={group.openInNewTab ? '_blank' : undefined}
                    rel={group.openInNewTab ? 'noopener noreferrer' : undefined}
                    onClick={onNavigate}
                    className="block px-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted hover:text-brand"
                  >
                    {group.label}
                  </Link>
                )}
                {group.children.length > 0 ? (
                  <ul className="mt-2 space-y-1">
                    {group.children.map((child) => (
                      <li key={child.id}>
                        <NavPanelLink item={child} onNavigate={onNavigate} />
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))
          : item.children.map((child) => (
              <NavPanelLink key={child.id} item={child} onNavigate={onNavigate} />
            ))}
      </div>
    </div>
  );
}

/**
 * A link inside a dropdown or a mega-menu column, with its icon and blurb.
 *
 * `onNavigate` closes the panel on the way out. Next navigates on the client,
 * and the effect that watches the path only fires once the new route commits —
 * long enough for the old menu to be left hanging over the new page.
 */
function NavPanelLink({
  item,
  onNavigate,
}: {
  item: ResolvedNavItem;
  onNavigate?: () => void;
}) {
  const Icon = resolveCmsIcon(item.icon);

  const body = (
    <>
      {Icon ? <Icon className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" /> : null}
      <span className="min-w-0">
        <span className="block text-sm font-medium text-content">{item.label}</span>
        {item.description ? (
          <span className="mt-0.5 block text-xs leading-relaxed text-muted">
            {item.description}
          </span>
        ) : null}
      </span>
    </>
  );

  const className = 'flex gap-2.5 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/[0.06]';

  // `#` means the item's target is gone. It is still worth showing where it
  // heads a group, but it is not a link, and pretending otherwise is what a
  // link that does nothing when clicked feels like.
  if (item.href === '#') {
    return <span className={className}>{body}</span>;
  }

  return (
    <Link
      href={item.href}
      target={item.openInNewTab ? '_blank' : undefined}
      rel={item.openInNewTab ? 'noopener noreferrer' : undefined}
      onClick={onNavigate}
      className={className}
    >
      {body}
    </Link>
  );
}

export function SiteHeader({
  nav,
  brand,
  markets = [],
}: {
  nav: ResolvedNavItem[];
  brand: HeaderBrand;
  /** Every market a visitor can switch to. Fewer than two renders nothing. */
  markets?: MarketOption[];
}) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [openDropdown, setOpenDropdown] = React.useState<string | null>(null);
  const pathname = usePathname();

  /*
   * Closing is deferred by a beat.
   *
   * Without it, the pointer leaving the trigger on its way to the panel — or
   * crossing the sub-pixel seam between them — closed the menu before the
   * click landed, which is exactly what "the submenu links don't work" looks
   * like from the other side of the screen.
   */
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = React.useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const open = React.useCallback(
    (id: string) => {
      cancelClose();
      setOpenDropdown(id);
    },
    [cancelClose],
  );

  const closeSoon = React.useCallback(() => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpenDropdown(null), 180);
  }, [cancelClose]);

  const closeNow = React.useCallback(() => {
    cancelClose();
    setOpenDropdown(null);
  }, [cancelClose]);

  React.useEffect(() => cancelClose, [cancelClose]);

  React.useEffect(() => {
    setMobileOpen(false);
    setOpenDropdown(null);
  }, [pathname]);

  React.useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileOpen(false);
        closeNow();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [closeNow]);

  const isActive = (href: string) =>
    href !== '/' && href !== '#' ? pathname === href || pathname.startsWith(`${href}/`) : pathname === href;

  /*
   * Everything the design screen can change is a CSS variable with the
   * header's original value as its fallback, so a site that has set nothing
   * renders exactly the header it rendered before those settings existed.
   */
  return (
    <header
      className={cn('top-0 z-topbar w-full', brand.sticky === false ? 'relative' : 'sticky')}
    >
      {brand.announcement ? (
        <div
          className="px-4 py-2 text-center text-xs sm:text-sm"
          style={{
            background: 'var(--announcement-bg, rgb(var(--brand-secondary)))',
            color: 'var(--announcement-text, #fff)',
          }}
        >
          {brand.announcement.url ? (
            <Link href={brand.announcement.url} className="underline-offset-4 hover:underline">
              {brand.announcement.text}
            </Link>
          ) : (
            <span>{brand.announcement.text}</span>
          )}
        </div>
      ) : null}

      <div
        className={cn(
          'bg-surface/90 backdrop-blur supports-[backdrop-filter]:bg-surface/75',
          brand.border === false ? null : 'border-b',
        )}
        style={{
          background: 'var(--header-bg)',
          borderColor: 'var(--header-border-color)',
          boxShadow: 'var(--header-shadow)',
        }}
      >
        <nav
          className="mx-auto flex items-center gap-6 px-4 sm:px-6"
          aria-label="Main"
          style={{
            height: 'var(--header-height, 4rem)',
            maxWidth: 'var(--header-width, 80rem)',
            color: 'var(--header-text)',
          }}
        >
          <Link
            href={brand.homeUrl}
            className="flex shrink-0 items-center gap-2"
            aria-label={`${brand.siteName} home`}
          >
            {brand.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={brand.logoUrl}
                alt={brand.siteName}
                className="w-auto object-contain"
                style={{
                  height: 'var(--header-logo-height, 2rem)',
                  maxWidth: 'var(--header-logo-max-width, 10rem)',
                }}
              />
            ) : (
              <span className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white">
                  {brand.siteName.charAt(0).toUpperCase()}
                </span>
                <span className="font-heading text-base font-bold text-content">{brand.siteName}</span>
              </span>
            )}
          </Link>

          {/*
            * The menu's own alignment, from Website design → Header.
            *
            * "left" and "center" both claim the space between the logo and the
            * buttons — the difference is only where the items sit inside it.
            * "right" gives the space up instead and lets `ml-auto` push the
            * menu against the buttons, which is what makes the three settings
            * visibly different rather than two of them looking the same.
            */}
          <ul
            className={cn(
              'hidden items-center lg:flex',
              brand.menuAlign === 'right' ? 'ml-auto' : 'flex-1',
              brand.menuAlign === 'center' && 'justify-center',
              brand.menuAlign === 'right' && 'justify-end',
            )}
            style={{
              gap: 'var(--header-menu-gap, 0.25rem)',
              fontSize: 'var(--header-menu-size)',
              fontWeight: 'var(--header-menu-weight)',
              textTransform: 'var(--header-menu-transform, none)' as React.CSSProperties['textTransform'],
            }}
          >
            {/*
              * Hover opens a dropdown, and so does focus — a keyboard could
              * not reach these links at all while hover was the only way in.
              * Clicking the trigger opens it too rather than toggling: on a
              * touch screen the tap arrives as an enter *and* a click, and a
              * toggle would close what the enter had just opened. Clicking it
              * again, with the menu already open, is what closes it.
              */}
            {nav.map((item) => (
              <li key={item.id} className="relative">
                {item.children.length > 0 ? (
                  <div
                    onMouseEnter={() => open(item.id)}
                    onMouseLeave={closeSoon}
                    onFocus={() => open(item.id)}
                    onBlur={(event) => {
                      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                        closeSoon();
                      }
                    }}
                  >
                    <button
                      type="button"
                      aria-expanded={openDropdown === item.id}
                      aria-haspopup="true"
                      onPointerDown={(event) => {
                        // Pointer-type aware: a mouse has already opened it on
                        // enter, so a click means close. A touch has not.
                        if (event.pointerType === 'mouse' && openDropdown === item.id) {
                          closeNow();
                        } else {
                          open(item.id);
                        }
                      }}
                      onClick={(event) => {
                        /*
                         * `detail` is 0 for a click synthesised from Enter or
                         * Space, which never sends a pointerdown — so that is
                         * the one case this has to handle itself.
                         */
                        if (event.detail === 0) {
                          if (openDropdown === item.id) closeNow();
                          else open(item.id);
                        }
                      }}
                      className={cn(
                        'nav-tokens site-nav-link flex items-center gap-1 rounded-lg px-3 py-2 transition-colors',
                        isActive(item.href) ? 'is-active text-brand' : 'text-content hover:text-brand',
                      )}
                    >
                      {item.label}
                      <ChevronDown
                        className={cn('h-3.5 w-3.5 transition-transform', openDropdown === item.id && 'rotate-180')}
                      />
                    </button>
                    {openDropdown === item.id ? (
                      item.megaMenu ? (
                        <MegaPanel item={item} columns={item.megaColumns} onNavigate={closeNow} />
                      ) : (
                        <div className="absolute left-0 top-full w-[22rem] pt-2">
                          <ul className="animate-slide-up rounded-xl border border-hairline bg-surface p-2 shadow-xl">
                            {item.children.map((child) => (
                              <li key={child.id}>
                                <NavPanelLink item={child} onNavigate={closeNow} />
                              </li>
                            ))}
                          </ul>
                        </div>
                      )
                    ) : null}
                  </div>
                ) : (
                  <Link
                    href={item.href}
                    target={item.openInNewTab ? '_blank' : undefined}
                    rel={item.openInNewTab ? 'noopener noreferrer' : undefined}
                    aria-current={isActive(item.href) ? 'page' : undefined}
                    className={cn(
                      'nav-tokens site-nav-link rounded-lg px-3 py-2 transition-colors',
                      isActive(item.href) ? 'is-active text-brand' : 'text-content hover:text-brand',
                    )}
                  >
                    {item.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>

          <div
            className={cn(
              'hidden items-center gap-2 lg:flex',
              // With a right-aligned menu the menu owns `ml-auto`; a second one
              // here would push the buttons away from it again.
              brand.menuAlign === 'right' ? 'ml-4' : 'ml-auto',
            )}
          >
            <MarketSwitcher markets={markets} />
            {brand.secondaryCtaLabel && brand.secondaryCtaUrl ? (
              <HeaderButton
                label={brand.secondaryCtaLabel}
                href={brand.secondaryCtaUrl}
                icon={brand.secondaryCtaIcon}
                side={brand.secondaryCtaIconSide}
                variant={brand.secondaryCtaVariant ?? 'ghost'}
                size="sm"
              />
            ) : null}
            {brand.ctaLabel && brand.ctaUrl ? (
              <HeaderButton
                label={brand.ctaLabel}
                href={brand.ctaUrl}
                icon={brand.ctaIcon}
                side={brand.ctaIconSide}
                variant={brand.ctaVariant ?? 'primary'}
                size="sm"
              />
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            className="ml-auto rounded-lg p-2 text-content transition-colors hover:bg-muted/10 lg:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </nav>
      </div>

      {mobileOpen ? (
        <div
          id="mobile-menu"
          className="fixed inset-x-0 bottom-0 z-drawer overflow-y-auto border-t border-hairline bg-surface lg:hidden"
          style={{ top: 'var(--header-height, 4rem)' }}
        >
          <ul className="space-y-1 px-4 py-4">
            {nav.map((item) => (
              <li key={item.id}>
                {item.children.length > 0 ? (
                  <details className="group">
                    <summary className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-3 text-base font-medium text-content marker:content-none">
                      {item.label}
                      <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                    </summary>
                    <ul className="ml-3 space-y-1 border-l border-hairline pl-3">
                      {item.children.map((child) =>
                        child.href === '#' ? null : (
                          <li key={child.id}>
                            <Link
                              href={child.href}
                              target={child.openInNewTab ? '_blank' : undefined}
                              rel={child.openInNewTab ? 'noopener noreferrer' : undefined}
                              onClick={() => setMobileOpen(false)}
                              className="block rounded-lg px-3 py-2.5 text-sm text-muted"
                            >
                              {child.label}
                            </Link>
                          </li>
                        ),
                      )}
                    </ul>
                  </details>
                ) : (
                  <Link href={item.href} className="block rounded-lg px-3 py-3 text-base font-medium text-content">
                    {item.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
          <div className="space-y-2 border-t border-hairline px-4 py-4">
            {markets.length > 1 ? (
              <nav aria-label="Country" className="pb-2">
                <ul className="flex flex-wrap gap-2">
                  {markets.map((market) => (
                    <li key={market.code}>
                      <Link
                        href={market.href}
                        hrefLang={market.locale}
                        aria-current={market.isCurrent ? 'true' : undefined}
                        className={cn(
                          'inline-flex items-center rounded-lg border border-hairline px-3 py-2 text-sm transition-colors',
                          market.isCurrent
                            ? 'border-brand text-brand'
                            : 'text-content hover:text-brand',
                        )}
                      >
                        {market.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ) : null}
            {brand.ctaLabel && brand.ctaUrl ? (
              <HeaderButton
                label={brand.ctaLabel}
                href={brand.ctaUrl}
                icon={brand.ctaIcon}
                side={brand.ctaIconSide}
                variant={brand.ctaVariant ?? 'primary'}
                size="lg"
                className="w-full"
              />
            ) : null}
            {brand.secondaryCtaLabel && brand.secondaryCtaUrl ? (
              <HeaderButton
                label={brand.secondaryCtaLabel}
                href={brand.secondaryCtaUrl}
                icon={brand.secondaryCtaIcon}
                side={brand.secondaryCtaIconSide}
                variant={brand.secondaryCtaVariant ?? 'outline'}
                size="lg"
                className="w-full"
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </header>
  );
}
