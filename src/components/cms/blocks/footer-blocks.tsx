import Link from 'next/link';
import { Mail, Phone, MapPin } from 'lucide-react';
import type {
  FooterBrandContent,
  FooterMenusContent,
  FooterColumnsContent,
  FooterBottomContent,
  FooterNewsletterContent,
} from '@/lib/cms/footer-blocks';
import { footerMenu } from '@/lib/cms/footer-render';
import {
  LinkedInIcon,
  XIcon,
  FacebookIcon,
  InstagramIcon,
  YouTubeIcon,
  type IconComponent,
} from '@/components/ui/icons';
import { PublicFormRenderer } from '@/components/forms/public-form';
import { getPublicForm } from '@/lib/services/forms';
import { cn } from '@/lib/utils/cn';
import type { BlockContext } from './shared';

/**
 * The blocks a footer is built from.
 *
 * Each reads the market from `ctx.footer`, which the layout resolves once for
 * the whole footer. None of them queries for the market they are in, so the
 * same block renders any market's footer — and an administrator can reorder,
 * hide or restyle them like any other section.
 *
 * A block rendered without a footer context returns null rather than throwing:
 * these are offered only on the footer surface, but a section row copied
 * elsewhere must not be able to break a page.
 */

const SOCIALS: Array<{ key: string; label: string; Icon: IconComponent }> = [
  { key: 'linkedinUrl', label: 'LinkedIn', Icon: LinkedInIcon },
  { key: 'twitterUrl', label: 'X', Icon: XIcon },
  { key: 'facebookUrl', label: 'Facebook', Icon: FacebookIcon },
  { key: 'instagramUrl', label: 'Instagram', Icon: InstagramIcon },
  { key: 'youtubeUrl', label: 'YouTube', Icon: YouTubeIcon },
];

/** Columns as a custom property: the count is data, and a class cannot be. */
function columnStyle(count: number): React.CSSProperties {
  return {
    display: 'grid',
    gap: 'var(--footer-column-gap, 2.5rem)',
    gridTemplateColumns: `repeat(${Math.min(Math.max(count, 1), 6)}, minmax(0, 1fr))`,
  };
}

export function FooterBrandBlock({
  content,
  ctx,
}: {
  content: FooterBrandContent;
  ctx: BlockContext;
}) {
  const footer = ctx.footer;
  if (!footer) return null;
  const { settings, local, homeUrl } = footer;

  const logoUrl = settings.logoDarkUrl ?? settings.logoUrl ?? null;
  const description = content.description || local.footerDescription;
  const email = content.emailOverride || local.salesEmail;
  const phone = content.phoneOverride || local.salesPhone;
  const address = content.addressOverride || local.address;

  return (
    <div className="max-w-sm">
      <Link href={homeUrl} className="inline-flex items-center gap-2">
        {logoUrl && content.showLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt={settings.siteName}
            className="w-auto max-w-[10rem] object-contain"
            style={{ height: content.logoHeight || 'var(--footer-logo-height, 2rem)' }}
          />
        ) : content.showSiteName ? (
          <span className="site-footer-heading font-heading text-lg font-bold">
            {settings.siteName}
          </span>
        ) : null}
      </Link>

      {description && content.showDescription ? (
        <p className="mt-4 text-sm leading-relaxed">{description}</p>
      ) : null}

      <ul className="mt-6 space-y-2 text-sm" style={{ color: 'var(--footer-contact)' }}>
        {email && content.showEmail ? (
          <li className="flex items-start gap-2.5">
            <Mail className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <a href={`mailto:${email}`} className="site-footer-link">
              {email}
            </a>
          </li>
        ) : null}
        {phone && content.showPhone ? (
          <li className="flex items-start gap-2.5">
            <Phone className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <a href={`tel:${phone.replace(/\s/g, '')}`} className="site-footer-link">
              {phone}
            </a>
          </li>
        ) : null}
        {address && content.showAddress ? (
          <li className="flex items-start gap-2.5">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{address}</span>
          </li>
        ) : null}
      </ul>
    </div>
  );
}

export function FooterMenusBlock({
  content,
  ctx,
}: {
  content: FooterMenusContent;
  ctx: BlockContext;
}) {
  const footer = ctx.footer;
  if (!footer) return null;

  /*
   * Named slugs pick and order the menus; naming none shows every footer menu
   * in the order they were created, which is what this block replaces. A slug
   * that no longer matches a menu is skipped rather than rendering an empty
   * column.
   */
  const menus =
    content.menuSlugs.length > 0
      ? content.menuSlugs
          .map((slug) => footerMenu(footer, slug))
          .filter((menu): menu is NonNullable<typeof menu> => Boolean(menu))
      : footer.menus;

  if (menus.length === 0) return null;

  return (
    <div style={columnStyle(content.columns || menus.length)}>
      {menus.map((menu) => (
        <nav key={menu.id} aria-label={menu.name}>
          {content.showHeadings ? (
            <h2 className="site-footer-heading font-heading text-sm font-semibold">{menu.name}</h2>
          ) : null}
          <ul className={cn('space-y-2.5 text-sm', content.showHeadings && 'mt-4')}>
            {menu.items.map((item) =>
              item.href === '#' ? null : (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    target={item.openInNewTab ? '_blank' : undefined}
                    rel={item.openInNewTab ? 'noopener noreferrer' : undefined}
                    className="site-footer-link transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ),
            )}
          </ul>
        </nav>
      ))}
    </div>
  );
}

export function FooterColumnsBlock({
  content,
  ctx,
}: {
  content: FooterColumnsContent;
  ctx: BlockContext;
}) {
  const footer = ctx.footer;
  if (!footer || content.items.length === 0) return null;

  return (
    <div style={columnStyle(content.columns)}>
      {content.items.map((column, index) => {
        const menu = footerMenu(footer, column.menuSlug);
        const links = column.links.filter((link) => link.label && link.url);

        return (
          <div key={index} className="min-w-0">
            {column.heading && content.showHeadings ? (
              <h2 className="site-footer-heading font-heading text-sm font-semibold">
                {column.heading}
              </h2>
            ) : null}
            {column.body ? (
              <p className="mt-3 text-sm leading-relaxed">{column.body}</p>
            ) : null}

            {/* A named menu and hand-typed links can both appear: a column of
                product links with one extra "see all" underneath is ordinary. */}
            {menu || links.length > 0 ? (
              <ul className="mt-4 space-y-2.5 text-sm">
                {menu?.items.map((item) =>
                  item.href === '#' ? null : (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        target={item.openInNewTab ? '_blank' : undefined}
                        rel={item.openInNewTab ? 'noopener noreferrer' : undefined}
                        className="site-footer-link transition-colors"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ),
                )}
                {links.map((link, linkIndex) => (
                  <li key={`link-${linkIndex}`}>
                    <Link href={link.url} className="site-footer-link transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export async function FooterNewsletterBlock({
  content,
  ctx,
}: {
  content: FooterNewsletterContent;
  ctx: BlockContext;
}) {
  const footer = ctx.footer;
  if (!footer) return null;

  /*
   * The block's own form where it names one, and the market's newsletter form
   * otherwise. An existing form rather than a footer-only email box: its
   * fields, consent text, captcha and notifications then work exactly as they
   * do anywhere else, and a signup here lands where a landing page's does.
   */
  const form = content.formSlug
    ? await getPublicForm(content.formSlug, ctx.country.id)
    : footer.newsletter;
  if (!form) return null;

  const heading = content.heading || form.name;
  const description = content.description || form.description;

  return (
    <div
      className={cn(
        'grid gap-6 rounded-2xl bg-white/5 p-6 sm:p-8',
        content.layout === 'split' && 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-center',
      )}
    >
      <div>
        <h2 className="site-footer-heading font-heading text-lg font-bold">{heading}</h2>
        {description ? <p className="mt-2 text-sm leading-relaxed">{description}</p> : null}
      </div>
      {/*
        * On a light panel: the form carries its own colours from Forms →
        * Design, and those are chosen against a page background. Painting it
        * straight onto a dark footer would leave an administrator restyling
        * one form for one location.
        */}
      <div className="rounded-xl bg-surface p-4 text-content sm:p-5">
        <PublicFormRenderer form={form} ctaLocation="footer-newsletter" compact />
      </div>
    </div>
  );
}

export function FooterBottomBlock({
  content,
  ctx,
}: {
  content: FooterBottomContent;
  ctx: BlockContext;
}) {
  const footer = ctx.footer;
  if (!footer) return null;
  const { settings, local, legal } = footer;

  const socials = SOCIALS.map(({ key, label, Icon }) => {
    const href = settings[key as keyof typeof settings];
    return { label, Icon, href: typeof href === 'string' ? href : null };
  }).filter((social): social is { label: string; Icon: IconComponent; href: string } =>
    Boolean(social.href),
  );

  const copyright = (content.copyrightOverride || local.copyrightText || '').replace(
    '{year}',
    String(new Date().getFullYear()),
  );

  return (
    <div
      className={cn(
        'flex flex-col gap-4 pt-6 sm:flex-row sm:items-center',
        content.showDivider ? 'site-footer-rule border-t' : null,
        content.align === 'between' && 'sm:justify-between',
        content.align === 'center' && 'sm:justify-center sm:text-center',
      )}
    >
      {content.showCopyright ? (
        <p className="text-xs">
          {copyright || `© ${new Date().getFullYear()} ${local.companyName}`}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {content.showLegal && legal.length > 0 ? (
          <nav aria-label="Legal">
            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs">
              {legal.map((item) =>
                item.href === '#' ? null : (
                  <li key={item.id}>
                    <Link href={item.href} className="site-footer-link transition-colors">
                      {item.label}
                    </Link>
                  </li>
                ),
              )}
            </ul>
          </nav>
        ) : null}

        {content.showSocials && socials.length > 0 ? (
          <ul className="flex items-center gap-3">
            {socials.map(({ label, href, Icon }) => (
              <li key={label}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="site-footer-link inline-flex items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
                  style={{
                    height: 'var(--footer-social-size, 2rem)',
                    width: 'var(--footer-social-size, 2rem)',
                  }}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
