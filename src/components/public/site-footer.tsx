import type * as React from 'react';
import Link from 'next/link';
import { Mail, Phone, MapPin } from 'lucide-react';
import type { WebsiteSettings } from '@prisma/client';
import { getFooter } from '@/lib/services/footer';
import { getMedia } from '@/lib/services/media';
import { footerVars, renderCopyright, type FooterContent } from '@/lib/cms/footer';
import { countryHref, countryPath } from '@/lib/country/routing';
import { safeUrl } from '@/lib/utils/sanitize';
import { cn } from '@/lib/utils/cn';
import {
  LinkedInLineIcon,
  XLineIcon,
  FacebookLineIcon,
  InstagramLineIcon,
  YouTubeLineIcon,
  type IconComponent,
} from '@/components/ui/icons';
import type { CountryContext, CountrySettingsView } from '@/lib/country/types';

/**
 * The site footer.
 *
 * One row of settings, one component. Everything it shows is a field on
 * Website design → Footer, and everything it leaves out is a switch there.
 *
 * Its content is the site's, its contact details are the market's: the phone,
 * email and address fall back to whichever storefront is being browsed, so one
 * footer serves every market without being rebuilt per market. Typing a value
 * into any of those three fields pins it instead.
 */

/*
 * Outlined rather than the filled badges the blog uses: five solid blocks on a
 * pale footer read as heavier than everything around them.
 */
const SOCIALS: Array<{ key: keyof WebsiteSettings; label: string; Icon: IconComponent }> = [
  { key: 'instagramUrl', label: 'Instagram', Icon: InstagramLineIcon },
  { key: 'facebookUrl', label: 'Facebook', Icon: FacebookLineIcon },
  { key: 'youtubeUrl', label: 'YouTube', Icon: YouTubeLineIcon },
  { key: 'linkedinUrl', label: 'LinkedIn', Icon: LinkedInLineIcon },
  { key: 'twitterUrl', label: 'X', Icon: XLineIcon },
];

export async function SiteFooter({
  settings,
  local,
  country,
}: {
  settings: WebsiteSettings;
  /** The market being browsed — its contact details fill the last column. */
  local: CountrySettingsView;
  country: CountryContext;
}) {
  const { content, design } = await getFooter();
  if (!content.enabled) return null;

  const logo = content.brand.logoId ? await getMedia(content.brand.logoId) : null;
  const logoUrl = logo?.url ?? settings.logoDarkUrl ?? settings.logoUrl ?? null;

  const columns = content.columns.filter(
    (column) => column.heading || column.links.some((link) => link.label),
  );

  const contact = content.contact;
  const phone = contact.showPhone ? contact.phone || local.salesPhone : null;
  const email = contact.showEmail ? contact.email || local.salesEmail : null;
  const address = contact.showAddress ? contact.address || local.address : null;
  const withContact = contact.show && Boolean(phone || email || address);

  const socials = content.brand.showSocials
    ? SOCIALS.map(({ key, label, Icon }) => {
        const href = settings[key];
        return { label, Icon, href: typeof href === 'string' ? safeUrl(href) : null };
      }).filter((social): social is { label: string; Icon: IconComponent; href: string } =>
        Boolean(social.href),
      )
    : [];

  const bottomLine = content.bottom.show
    ? renderCopyright(content.bottom.text, settings.siteName).trim()
    : '';

  /*
   * The row is as wide as the columns it has.
   *
   * The count used to be a fixed four, so a footer with a brand column and a
   * contact column drew two tracks of content and two of nothing — half a row
   * of empty page. The design's own count still overrides this where somebody
   * wants a gap on purpose.
   */
  const renderedColumns =
    (content.brand.show ? 1 : 0) + columns.length + (withContact ? 1 : 0);

  const withName =
    content.brand.logoMode === 'logoAndName' || content.brand.logoMode === 'name';
  const withLogo =
    Boolean(logoUrl) && (content.brand.logoMode === 'logoAndName' || content.brand.logoMode === 'logo');

  return (
    <footer
      className="site-footer"
      style={footerVars(design, renderedColumns) as React.CSSProperties}
    >
      <div className="site-footer__inner">
        <div className="site-footer__grid">
          {content.brand.show ? (
            <div className="min-w-0">
              <Link
                href={countryPath(country)}
                className="inline-flex items-center gap-3"
                aria-label={settings.siteName}
              >
                {withLogo ? (
                  /*
                   * Beside the name the logo is a mark, so it is capped much
                   * narrower: a wide logo with its own wordmark baked in took
                   * ten rems of the column and pushed the name onto two lines.
                   */
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoUrl ?? undefined}
                    alt=""
                    className={cn('site-footer__logo', withName && 'site-footer__logo--mark')}
                    style={{ height: 'var(--footer-logo-height, 2.5rem)' }}
                  />
                ) : null}
                {withName ? (
                  <span className="site-footer__wordmark">
                    {content.brand.title || settings.siteName}
                  </span>
                ) : null}
              </Link>

              {content.brand.description ? (
                <p className="site-footer__lede">{content.brand.description}</p>
              ) : null}

              {socials.length > 0 ? (
                <ul className="site-footer__socials">
                  {socials.map(({ label, href, Icon }) => (
                    <li key={label}>
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={label}
                        className={cn('site-footer__social', `site-footer__social--${design.socialStyle}`)}
                      >
                        <Icon className="site-footer__social-glyph" aria-hidden="true" />
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          {columns.map((column, index) => (
            <nav key={index} className="min-w-0" aria-label={column.heading || undefined}>
              {column.heading ? <h2 className="site-footer__heading">{column.heading}</h2> : null}
              <ul className="site-footer__links">
                {column.links
                  .filter((link) => link.label)
                  .map((link, linkIndex) => (
                    <li key={linkIndex}>
                      <FooterLink country={country} url={link.url} label={link.label} />
                    </li>
                  ))}
              </ul>
            </nav>
          ))}

          {withContact ? (
            <div className="min-w-0">
              {contact.heading ? <h2 className="site-footer__heading">{contact.heading}</h2> : null}
              <ul className="site-footer__links">
                {phone ? (
                  <ContactLine icon={Phone} href={`tel:${phone.replace(/\s/g, '')}`} text={phone} />
                ) : null}
                {email ? <ContactLine icon={Mail} href={`mailto:${email}`} text={email} /> : null}
                {address ? <ContactLine icon={MapPin} text={address} /> : null}
              </ul>
            </div>
          ) : null}
        </div>
      </div>

      {content.bottom.show && bottomLine ? (
        <>
          {content.bottom.showDivider ? (
            <div
              className={cn(
                'site-footer__rule',
                design.fullWidthDivider && 'site-footer__rule--bleed',
              )}
              aria-hidden="true"
            />
          ) : null}
          <div className="site-footer__inner site-footer__bottom" data-align={content.bottom.align}>
            <p>{bottomLine}</p>
          </div>
        </>
      ) : null}
    </footer>
  );
}

/** A footer link. A path is resolved inside the market; a full URL is left alone. */
function FooterLink({
  country,
  url,
  label,
}: {
  country: CountryContext;
  url: string;
  label: string;
}) {
  const href = safeUrl(url) || '';
  if (!href) return <span className="site-footer__link">{label}</span>;

  const resolved = href.startsWith('/') ? countryHref(country, href) : href;
  const external = !resolved.startsWith('/');

  return (
    <Link
      href={resolved}
      className="site-footer__link"
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
    >
      {label}
    </Link>
  );
}

function ContactLine({
  icon: Icon,
  href,
  text,
}: {
  icon: IconComponent;
  href?: string;
  text: string;
}) {
  return (
    <li className="site-footer__contact">
      <Icon className="site-footer__contact-icon" aria-hidden="true" />
      {href ? (
        <a href={href} className="site-footer__link">
          {text}
        </a>
      ) : (
        <span>{text}</span>
      )}
    </li>
  );
}
