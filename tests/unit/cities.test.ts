import { describe, it, expect } from 'vitest';
import {
  fillPlaceholders,
  fillPlaceholdersDeep,
  placeholdersIn,
  placeholderValues,
  PlaceholderDepthError,
  CITY_PLACEHOLDERS,
} from '@/lib/cities/template';
import {
  cityPageSlug,
  cityPublicPath,
  citySegmentOf,
  isCityLandingSlug,
  isInCity,
  moveToCity,
} from '@/lib/cities/paths';
import { cityInputSchema, citySlugSchema, suggestCitySlug } from '@/lib/validation/city';
import { cityPageSeo } from '@/lib/cities/seo';
import { withCityDetails } from '@/lib/cities/local';
import { joinMarket } from '@/lib/urls/path';
import type { CountrySettingsView } from '@/lib/country/types';

const values = placeholderValues({
  city: { name: 'Delhi', slug: 'delhi', region: 'NCR' },
  country: { name: 'India', code: 'IN' },
  page: { title: 'Dropbox Plus', slug: 'dropbox-plus' },
});

describe('city placeholders', () => {
  it('fills every known placeholder, once', () => {
    expect(fillPlaceholders('Buy {{page.title}} in {{city.name}}, {{country.name}}', values)).toBe(
      'Buy Dropbox Plus in Delhi, India',
    );
    expect(fillPlaceholders('/{{city.slug}}/{{page.slug}} ({{country.code}}, {{city.region}})', values)).toBe(
      '/delhi/dropbox-plus (IN, NCR)',
    );
    expect(CITY_PLACEHOLDERS).toHaveLength(7);
  });

  it('tolerates spaces and capitals inside the braces', () => {
    expect(fillPlaceholders('{{ city.name }} / {{City.Name}}', values)).toBe('Delhi / Delhi');
  });

  it('leaves unknown placeholders and look-alikes untouched', () => {
    expect(fillPlaceholders('{{city.population}} {{name}} {city.name} {{ }}', values)).toBe(
      '{{city.population}} {{name}} {city.name} {{ }}',
    );
  });

  it('renders an optional region as nothing when the city has none', () => {
    const none = placeholderValues({
      city: { name: 'Dubai', slug: 'dubai', region: null },
      country: { name: 'United Arab Emirates', code: 'AE' },
      page: { title: 'Plans', slug: 'plans' },
    });
    expect(fillPlaceholders('[{{city.region}}]', none)).toBe('[]');
  });

  it('fills the source title’s own placeholders before using it as {{page.title}}', () => {
    const nested = placeholderValues({
      city: { name: 'Mumbai', slug: 'mumbai', region: null },
      country: { name: 'India', code: 'IN' },
      page: { title: 'Storage for {{city.name}}', slug: 'storage' },
    });
    expect(nested['page.title']).toBe('Storage for Mumbai');
    expect(fillPlaceholders('{{page.title}}', nested)).toBe('Storage for Mumbai');
  });

  it('walks JSON value by value: strings are filled, keys and other values are not', () => {
    const content = {
      heading: 'Dropbox in {{city.name}}',
      count: 3,
      visible: true,
      nothing: null,
      '{{city.name}}': 'key untouched',
      items: [{ title: '{{city.name}} office', tags: ['{{country.code}}', 7] }],
      html: '<p class="x">Serving {{city.name}} &amp; around</p>',
    };
    const out = fillPlaceholdersDeep(content, values);
    expect(out).toEqual({
      heading: 'Dropbox in Delhi',
      count: 3,
      visible: true,
      nothing: null,
      '{{city.name}}': 'key untouched',
      items: [{ title: 'Delhi office', tags: ['IN', 7] }],
      html: '<p class="x">Serving Delhi &amp; around</p>',
    });
    // A new value: the source is never changed.
    expect(content.heading).toBe('Dropbox in {{city.name}}');
  });

  it('keeps a stored "__proto__" key as an ordinary key', () => {
    const parsed = JSON.parse('{"__proto__": {"polluted": "{{city.name}}"}, "a": 1}');
    const out = fillPlaceholdersDeep(parsed, values) as Record<string, unknown>;
    expect(Object.getPrototypeOf(out)).toBe(Object.prototype);
    expect(Object.keys(out)).toContain('__proto__');
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(JSON.parse(JSON.stringify(out)).__proto__.polluted).toBe('Delhi');
  });

  it('refuses absurdly deep content rather than recursing without end', () => {
    let deep: unknown = 'x';
    for (let i = 0; i < 100; i += 1) deep = [deep];
    expect(() => fillPlaceholdersDeep(deep, values)).toThrow(PlaceholderDepthError);
  });

  it('lists the placeholders a value uses', () => {
    expect(placeholdersIn([{ a: '{{city.name}}' }, 'x {{page.slug}} {{unknown.thing}}'])).toEqual([
      'city.name',
      'page.slug',
    ]);
  });
});

describe('city paths', () => {
  it('builds generated slugs under the city, never with the market prefix', () => {
    expect(cityPageSlug('delhi', 'dropbox-plus')).toBe('delhi/dropbox-plus');
    expect(cityPageSlug('delhi', 'solutions/dropbox-plus')).toBe('delhi/solutions/dropbox-plus');
    expect(cityPageSlug('dubai', 'dropbox-plus')).toBe('dubai/dropbox-plus');
    // The market homepage becomes the city's own address: its landing page.
    expect(cityPageSlug('delhi', '')).toBe('delhi');
  });

  it('builds the public URLs for the root market and a prefixed one', () => {
    expect(joinMarket('', 'delhi')).toBe('/delhi');
    expect(cityPublicPath('', 'delhi/dropbox-plus')).toBe('/delhi/dropbox-plus');
    expect(joinMarket('ae', 'dubai')).toBe('/ae/dubai');
    expect(cityPublicPath('ae', 'dubai/dropbox-plus')).toBe('/ae/dubai/dropbox-plus');
  });

  it('knows which pages are a city’s and which is its landing page', () => {
    expect(citySegmentOf('delhi/dropbox-plus')).toBe('delhi');
    expect(citySegmentOf('')).toBeNull();
    expect(isCityLandingSlug('delhi', 'delhi')).toBe(true);
    expect(isCityLandingSlug('delhi/dropbox-plus', 'delhi')).toBe(false);
    expect(isInCity('delhi/dropbox-plus', 'delhi')).toBe(true);
    expect(isInCity('delhi-offers', 'delhi')).toBe(false);
  });

  it('moves a page to a renamed city, and leaves other pages alone', () => {
    expect(moveToCity('delhi/dropbox-plus', 'delhi', 'new-delhi')).toBe('new-delhi/dropbox-plus');
    expect(moveToCity('delhi', 'delhi', 'new-delhi')).toBe('new-delhi');
    expect(moveToCity('delhite/x', 'delhi', 'new-delhi')).toBe('delhite/x');
  });
});

describe('city validation', () => {
  const base = { name: 'Delhi', slug: 'delhi' };

  it('treats region as optional', () => {
    expect(cityInputSchema.parse(base).region).toBeNull();
    expect(cityInputSchema.parse({ ...base, region: '   ' }).region).toBeNull();
    expect(cityInputSchema.parse({ ...base, region: 'NCR' }).region).toBe('NCR');
  });

  it('normalises and checks the slug as one URL segment', () => {
    expect(citySlugSchema.parse(' Delhi ')).toBe('delhi');
    expect(citySlugSchema.safeParse('new/delhi').success).toBe(false);
    expect(citySlugSchema.safeParse('new delhi').success).toBe(false);
    expect(citySlugSchema.safeParse('-delhi').success).toBe(false);
    expect(citySlugSchema.safeParse('').success).toBe(false);
    expect(suggestCitySlug('New Delhi')).toBe('new-delhi');
  });

  it('keeps names safe to write into pages', () => {
    expect(cityInputSchema.safeParse({ ...base, name: 'Delhi <script>' }).success).toBe(false);
    expect(cityInputSchema.safeParse({ ...base, name: 'Delhi {{x}}' }).success).toBe(false);
    expect(cityInputSchema.safeParse({ ...base, name: 'Xi’an & Co.' }).success).toBe(true);
  });

  it('reads switches as a form sends them', () => {
    const parsed = cityInputSchema.parse({ ...base, isActive: 'false', isPublished: 'true', noIndex: 'false' });
    expect(parsed.isActive).toBe(false);
    expect(parsed.isPublished).toBe(true);
    expect(parsed.noIndex).toBe(false);
    expect(cityInputSchema.parse(base).isActive).toBe(true);
  });

  it('checks contact details and coordinates', () => {
    expect(cityInputSchema.safeParse({ ...base, salesEmail: 'not-an-email' }).success).toBe(false);
    expect(cityInputSchema.safeParse({ ...base, salesPhone: '+91 (11) 4000-0000' }).success).toBe(true);
    expect(cityInputSchema.safeParse({ ...base, salesPhone: 'call us' }).success).toBe(false);
    expect(cityInputSchema.safeParse({ ...base, latitude: '28.6139', longitude: '77.2090' }).success).toBe(true);
    expect(cityInputSchema.safeParse({ ...base, latitude: '128', longitude: '77' }).success).toBe(false);
    expect(cityInputSchema.safeParse({ ...base, latitude: '28.6' }).success).toBe(false);
  });

  it('refuses a repeated keyword', () => {
    const result = cityInputSchema.safeParse({ ...base, primaryKeyword1: 'Dropbox Delhi', primaryKeyword2: 'dropbox  delhi' });
    expect(result.success).toBe(false);
  });
});

describe('city search defaults', () => {
  const city = {
    name: 'Delhi',
    seoTitle: 'Dropbox partner in Delhi',
    seoDescription: 'Local Dropbox help in Delhi.',
    primaryKeyword1: 'dropbox delhi',
    primaryKeyword2: null,
    primaryKeyword3: null,
    noIndex: false,
  };
  const page = {
    title: 'Delhi',
    seoTitle: null,
    seoDescription: null,
    noIndex: false,
    isCityHomepage: true,
    primaryKeyword1: null,
    primaryKeyword2: null,
    primaryKeyword3: null,
  };

  it('gives the landing page the city’s title, description and keywords where its own are blank', () => {
    const seo = cityPageSeo(page, city);
    expect(seo.title).toBe('Dropbox partner in Delhi');
    expect(seo.description).toBe('Local Dropbox help in Delhi.');
    expect(seo.keywords).toEqual(['dropbox delhi']);
    expect(seo.inherited).toEqual({ title: true, description: true, keywords: true, noIndex: false });
  });

  it('never gives the city’s title or keywords to its other pages', () => {
    const seo = cityPageSeo({ ...page, title: 'Dropbox Plus in Delhi', isCityHomepage: false }, city);
    expect(seo.title).toBe('Dropbox Plus in Delhi');
    expect(seo.keywords).toEqual([]);
    // The description is closer to a Delhi page than the market's default.
    expect(seo.description).toBe('Local Dropbox help in Delhi.');
  });

  it('lets the page’s own fields win', () => {
    const seo = cityPageSeo(
      { ...page, seoTitle: 'Own title', seoDescription: 'Own description', primaryKeyword1: 'own keyword' },
      city,
    );
    expect(seo).toMatchObject({ title: 'Own title', description: 'Own description', keywords: ['own keyword'] });
    expect(seo.inherited).toEqual({ title: false, description: false, keywords: false, noIndex: false });
  });

  it('noindexes every page of a noindexed city', () => {
    expect(cityPageSeo({ ...page, isCityHomepage: false }, { ...city, noIndex: true }).noIndex).toBe(true);
  });

  it('changes nothing for a page outside every city', () => {
    const seo = cityPageSeo({ ...page, title: 'Pricing', isCityHomepage: false }, null);
    expect(seo).toMatchObject({ title: 'Pricing', description: null, keywords: [], noIndex: false });
  });
});

describe('city contact details', () => {
  const local = {
    countryId: 'in',
    salesPhone: '+91 1',
    whatsappNumber: '+91 2',
    salesEmail: 'sales@example.test',
    addressLine1: 'Market street',
    addressLine2: null,
    city: 'Gurugram',
    region: 'Haryana',
    postalCode: '122001',
    address: 'Market street, Gurugram',
    latitude: '28.4',
    longitude: '77.0',
  } as unknown as CountrySettingsView;

  const blankCity = {
    name: 'Delhi',
    region: null,
    salesPhone: null,
    whatsappNumber: null,
    salesEmail: null,
    address: null,
    postalCode: null,
    latitude: null,
    longitude: null,
  };

  it('falls back to the market for every blank field', () => {
    expect(withCityDetails(local, blankCity)).toEqual(local);
    expect(withCityDetails(local, null)).toBe(local);
  });

  it('uses the city’s own phone, email and address, the address as a whole', () => {
    const merged = withCityDetails(local, {
      ...blankCity,
      salesPhone: '+91 11 4000',
      salesEmail: 'delhi@example.test',
      address: 'Connaught Place',
      postalCode: '110001',
      region: 'NCR',
    });
    expect(merged).toMatchObject({
      salesPhone: '+91 11 4000',
      whatsappNumber: '+91 2',
      salesEmail: 'delhi@example.test',
      address: 'Connaught Place',
      addressLine1: null,
      city: 'Delhi',
      region: 'NCR',
      postalCode: '110001',
    });
  });

  it('takes coordinates only as a pair', () => {
    expect(withCityDetails(local, { ...blankCity, latitude: '28.6' })).toMatchObject({ latitude: '28.4', longitude: '77.0' });
    expect(withCityDetails(local, { ...blankCity, latitude: '28.6', longitude: '77.2' })).toMatchObject({
      latitude: '28.6',
      longitude: '77.2',
    });
  });
});
