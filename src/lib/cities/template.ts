/**
 * The placeholders the City Page Generator fills in.
 *
 * A source page can be written once for every city: "Buy {{page.title}} in
 * {{city.name}}". When the generator copies it into Delhi, each placeholder is
 * replaced with Delhi's value — once, at that moment. The copy stores plain
 * text; nothing is re-rendered later, so a generated page is an ordinary page
 * from the moment it exists, and renaming the city or editing the source
 * never changes it.
 *
 * Replacement walks the stored JSON value by value and only ever touches
 * strings. Keys, numbers, booleans and the structure itself are left exactly
 * as they are — there is no serialising the whole document and replacing
 * inside the resulting text, which would corrupt JSON escapes and could
 * rewrite keys. An unknown placeholder is left untouched, so text that merely
 * looks like one is never mangled.
 *
 * Pure and dependency-free: the generator, its preview and the tests share
 * this one definition.
 */

export const CITY_PLACEHOLDERS = [
  'city.name',
  'city.slug',
  'city.region',
  'country.name',
  'country.code',
  'page.title',
  'page.slug',
] as const;

export type CityPlaceholder = (typeof CITY_PLACEHOLDERS)[number];

export type PlaceholderValues = Record<CityPlaceholder, string>;

/** What each placeholder stands for, for the generator screen. */
export const PLACEHOLDER_HELP: Record<CityPlaceholder, string> = {
  'city.name': 'The city’s name',
  'city.slug': 'The city’s URL segment',
  'city.region': 'The city’s region, or nothing when it has none',
  'country.name': 'The market’s name',
  'country.code': 'The market’s two-letter code',
  'page.title': 'The source page’s title',
  'page.slug': 'The source page’s slug',
};

/** `{{ city.name }}`: two braces, a known name, optional spaces inside. */
const TOKEN = /\{\{\s*([a-zA-Z]+\.[a-zA-Z]+)\s*\}\}/g;

/** Content nested deeper than this is refused rather than walked. */
const MAX_DEPTH = 64;

const KNOWN: ReadonlySet<string> = new Set(CITY_PLACEHOLDERS);

function isPlaceholder(name: string): name is CityPlaceholder {
  return KNOWN.has(name);
}

/** One string with every known placeholder replaced. */
export function fillPlaceholders(text: string, values: PlaceholderValues): string {
  if (!text.includes('{{')) return text;
  return text.replace(TOKEN, (match, raw: string) => {
    const name = raw.toLowerCase();
    return isPlaceholder(name) ? values[name] : match;
  });
}

export class PlaceholderDepthError extends Error {
  constructor() {
    super('This content is nested too deeply to copy.');
    this.name = 'PlaceholderDepthError';
  }
}

/**
 * A JSON value with every string's placeholders replaced, as a new value.
 *
 * Objects are rebuilt with `defineProperty`, so a key named `__proto__` in
 * stored JSON stays an ordinary key instead of changing the copy's prototype.
 */
export function fillPlaceholdersDeep<T>(value: T, values: PlaceholderValues): T {
  return walk(value, values, 0) as T;
}

function walk(value: unknown, values: PlaceholderValues, depth: number): unknown {
  if (depth > MAX_DEPTH) throw new PlaceholderDepthError();
  if (typeof value === 'string') return fillPlaceholders(value, values);
  if (Array.isArray(value)) return value.map((item) => walk(item, values, depth + 1));
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      Object.defineProperty(out, key, {
        value: walk(item, values, depth + 1),
        enumerable: true,
        writable: true,
        configurable: true,
      });
    }
    return out;
  }
  return value;
}

/** The known placeholders a value uses, in the order of `CITY_PLACEHOLDERS`. */
export function placeholdersIn(value: unknown): CityPlaceholder[] {
  const found = new Set<CityPlaceholder>();
  const visit = (item: unknown, depth: number) => {
    if (depth > MAX_DEPTH) return;
    if (typeof item === 'string') {
      if (!item.includes('{{')) return;
      for (const match of item.matchAll(TOKEN)) {
        const name = match[1]!.toLowerCase();
        if (isPlaceholder(name)) found.add(name);
      }
      return;
    }
    if (Array.isArray(item)) {
      for (const entry of item) visit(entry, depth + 1);
      return;
    }
    if (item !== null && typeof item === 'object') {
      for (const entry of Object.values(item)) visit(entry, depth + 1);
    }
  };
  visit(value, 0);
  return CITY_PLACEHOLDERS.filter((name) => found.has(name));
}

/**
 * The values for one city, from the records the generator already loaded.
 *
 * `page.title` is the source page's title with its own placeholders filled
 * first, so a source titled "{{city.name}} storage" gives "Delhi storage"
 * wherever `{{page.title}}` is used, never the raw placeholder.
 */
export function placeholderValues(input: {
  city: { name: string; slug: string; region: string | null };
  country: { name: string; code: string };
  page: { title: string; slug: string };
}): PlaceholderValues {
  const values: PlaceholderValues = {
    'city.name': input.city.name,
    'city.slug': input.city.slug,
    'city.region': input.city.region ?? '',
    'country.name': input.country.name,
    'country.code': input.country.code,
    'page.title': '',
    'page.slug': input.page.slug,
  };
  values['page.title'] = fillPlaceholders(input.page.title, values);
  return values;
}
