# Cities

Cities give a market local landing pages — `/delhi`, `/delhi/dropbox-plus`,
`/ae/dubai`, `/ae/dubai/dropbox-plus` — without a second content system. This
document is the reference for how they work, what they guarantee and where the
code lives.

## The model in one paragraph

**Country is the market** — currency, pricing, settings, URL prefix.
**City is a local address space inside one market** — a slug, a name, contact
details and search defaults. **Page is the content** — and a city's landing
page and every generated city page are ordinary `Page` rows, built in the Page
Builder like any other. A city holds settings and metadata, never content.

```
Country (IN, slug "")           Country (AE, slug "ae")
  └─ City Delhi (slug "delhi")    └─ City Dubai (slug "dubai")
       ├─ Page  delhi                  ├─ Page  dubai                → /ae/dubai
       │   (landing page)   → /delhi   └─ Page  dubai/dropbox-plus   → /ae/dubai/dropbox-plus
       └─ Page  delhi/dropbox-plus
                            → /delhi/dropbox-plus
```

Nothing is hard-coded: no country, city or product name appears in code. A
city is a database row; its pages are pages.

## Data

| Model | What it holds |
| --- | --- |
| `City` | `countryId`, `name`, `slug`, optional free-text `region`, `isActive`, `isPublished`, `sortOrder`; optional `salesPhone`, `whatsappNumber`, `salesEmail`, `address`, `postalCode`, `latitude`, `longitude`; `seoTitle`, `seoDescription`, `primaryKeyword1–3`, `noIndex`, `excludeFromSitemap`. Unique on `(countryId, slug)`. |
| `Page.cityId` | The city whose address space the page is in, or null. |
| `Page.isCityHomepage` | True for the page at the city's own address — its landing page. |
| `Page.generatedFromPageId`, `generationBatchId`, `generatedAt` | Where the City Page Generator copied the page from, in which run, and when. **History only.** |
| `CityPageBatch` | One generator run: source, market, counts, per-city results, who ran it. **History only.** |

`Region` is deliberately not a model and never required.

Guarantees the database enforces itself (migration `20260930120000_cities`,
additive — every existing page gets `cityId = NULL`):

- a city page belongs to its city's market (trigger `Page_city_in_country`);
- a city with pages cannot move to another market (trigger `City_country_fixed`);
- at most one live landing page per city (partial unique index `Page_one_city_homepage`);
- only a city page can be a landing page (check `Page_city_homepage_has_city`);
- a city with pages cannot be deleted (foreign key `Page.cityId`, `ON DELETE RESTRICT`).

## URLs

A city owns the **first segment** of addresses in its market: Delhi in the root
market owns `/delhi` and everything beneath it; Dubai in the UAE owns
`/ae/dubai/...`. Cities in other markets never matter — India's Delhi owns
`/delhi`, not `/ae/delhi`, and the UAE can have a Delhi of its own.

`Page.slug` stays market-relative and never carries the market prefix: the
page at `/ae/dubai/dropbox-plus` has the slug `dubai/dropbox-plus`.

There are **no per-city routes** (`app/delhi/page.tsx` does not exist). City
addresses are ordinary page addresses resolved by the existing catch-all and
URL registry: `/delhi/dropbox-plus` is a `UrlRoute` claim like any other,
pointing at a page by id. With the registry switched off, the previous router
finds the page by its slug, exactly as before.

### How a page joins a city

Whenever a page is given an address — by the page form, the Slug Manager, a
bulk change, a restore from the recycle bin, a city rename, the generator —
the registry's `placeContent` looks at the first segment of the new address.
If it is a city's slug in the page's market, the page is filed under that
city (`cityId`), and the page at the city's own address becomes its landing
page (`isCityHomepage`). Moving a page out of the space takes it out of the
city. The city is derived from the address in the one place every address
change passes, so it can never disagree with it.

### What the city's address space refuses

The city namespace is enforced by the URL registry, not by a second conflict
system:

- **Giving a city a slug** (creating or renaming it) is refused while the
  slug is a system route (`/admin`, `/api`, …), a market prefix, the address
  space of a content type (`/products`, `/blog`, `/categories`, `/brands` —
  saved patterns and the built-in ones), another city's slug in the market,
  or while anything that is not the city's own holds the city's address or
  content beneath it — pages, products, articles, redirects, anything in the
  URL registry, and pages the registry has not scanned yet. The error names
  the address and what holds it: “`/delhi` is already used by page “Delhi
  offers”. Choose another slug, or move what is there first.” The form checks
  the slug as it is typed; saving checks again under the registry lock.
- **Placing anything but a plain page** in a city's space — a product, an
  article, a category or brand landing page — is refused, even at a free
  address, so the space stays the city's pages alone.
- **A market prefix** cannot be created with the slug of a root-market city.

Redirects *beneath* a city's address are left alone: they are explicit rules
for single addresses, and the city's pages simply cannot take those addresses
while the rules exist (the generator reports them).

The Slug Manager marks every city page (“City: Delhi”), and a conflict held by
a city links to that city.

## Status

| Switch | Effect |
| --- | --- |
| `isActive = false` | Every page in the city answers 404 — including through redirects to them — and leaves the sitemap and hreflang. Nothing is deleted; switching it back on brings everything back. Another city's or market's content is never served instead. |
| `isPublished = false` | The market convention: pages are still served to anyone with the link, and stay out of the sitemap. |
| `noIndex` | Every page in the city sends noindex, and leaves the sitemap. |
| `excludeFromSitemap` | Pages stay indexable but are not listed in the sitemap. |

All of this is applied where every public page query already goes:
`publishedPageWhere()` (served), `indexablePageWhere()` (hreflang) and
`listedPageWhere()` (sitemap) in `src/lib/services/pages.ts`.

## The landing page

One per city, at the city's own address, an ordinary page. It can be created
with the city (“Create the city's landing page”, with a title that may use
`{{city.name}}` — the business name is never assumed) or later from the city's
screen. It starts as an empty draft; build it in the Page Builder and publish
it like any page. Deleting it is deleting a page.

## The City Page Generator

Admin → Locations → City Page Generator (`/admin/cities/generator`).

1. Choose the market, a **source page** of that market (outside every city),
   and the **cities**.
2. **Preview**: each city's address (`/delhi/dropbox-plus`), the generated
   title, and whether it will be created, already exists (skipped) or is taken
   by something else (fails, with what holds it). Nothing is written.
3. **Generate**: for each city, one transaction under the registry lock
   creates the page, copies every section and registers the address. A
   failure in one city rolls back only that city — never a page without its
   sections — and the others continue. The screen sends large runs in parts
   of 25 cities, each continuing the same batch. The summary lists Created /
   Skipped existing / Failed with the reason.

Slugs: `dropbox-plus` → `delhi/dropbox-plus`; `solutions/dropbox-plus` →
`delhi/solutions/dropbox-plus`; the market homepage → `delhi` (the landing
page, when the city has none). Never with the market prefix.

Generated pages are **drafts** unless “Publish straight away” is chosen, which
needs the publish permission. Their canonical is their own address, and each
is its own page group (not the source's twin in another market).

### Placeholders

Filled in **once**, when each copy is made, in the title, the SEO fields
(title, description, Open Graph, Twitter, keywords) and every string inside
every section:

| Placeholder | Value |
| --- | --- |
| `{{city.name}}` | The city's name |
| `{{city.slug}}` | The city's slug |
| `{{city.region}}` | The city's region, or nothing |
| `{{country.name}}` | The market's name |
| `{{country.code}}` | The market's code |
| `{{page.title}}` | The source page's title (its own placeholders filled) |
| `{{page.slug}}` | The source page's slug |

Replacement walks the stored JSON value by value and only touches strings —
never keys, numbers or structure, and never by serialising the document and
replacing text in it. Unknown placeholders are left as they are. City names
and regions cannot contain `< > { } " \`` so they are safe wherever they land.

### Independent editing — the guarantee

A generated page is a new `Page` with new `PageSection` rows. The provenance
fields record where it came from, and **nothing reads them to copy anything**:
there is no sync, no inheritance and no re-render. Editing the source never
changes a city page; editing a city page never changes the source or another
city. Running the generator again skips cities that already have the page and
never overwrites it.

## Search (SEO, AEO, GEO)

City pages are ordinary pages to SEO Intelligence: the same scoring engine,
the same dashboard (with a **City** filter), the same score panel in the
editor. What a city contributes, resolved by one function
(`src/lib/cities/seo.ts`) for both the public page and its score:

- **title** — the city's SEO title, for the **landing page only**, when the
  page has none of its own (on other pages it would duplicate one title
  across the city);
- **description** — the city's, for any city page without its own, before the
  market's default;
- **keywords** — the city's, for the landing page only, when it names none;
- **noindex** — the city's switch, for every page in the city.

The chain is **Page → City → Country → Global**: a page's own field always
wins, and the market's and the site's defaults still apply after the city.
There are no automatic keyword variations.

Sitemap: a city page is listed when it is published and not noindexed, and
its city is active, published, not noindexed and not excluded — on top of the
market's own rules, with the market prefix kept.

## Local business details

A city's sales phone, WhatsApp number, sales email, address and coordinates
are shown on its pages — in the footer and in the Organization/LocalBusiness
structured data — instead of the market's. Blank fields fall back to the
market's, and the market's to the site's, when the page is rendered; nothing
is copied into rows. An address is taken as a whole, coordinates only as a
pair (`src/lib/cities/local.ts`).

## Products

Products are unchanged: `Product → ProductCountry` per market, no per-city
product or price. City pages show products at their market's prices.

## Permissions

The page permissions, plus market access, checked on the server against the
records as loaded — never against ids in a request:

| Action | Needs |
| --- | --- |
| See cities and the generator's history | `pages.view` |
| Add a city, create a landing page, preview and generate | `pages.create` |
| Edit a city | `pages.edit` |
| Switch a city on, or back into the sitemap; generate published pages | `pages.publish` |
| Delete a city | `pages.delete` |

A user restricted to some markets cannot see, edit, generate for or delete a
city in any other. A city never moves to another market.

## Deleting a city

Only a city without pages can be deleted. The list shows each city's page
count; deleting one with pages is refused with the count and offers to
deactivate it instead. Pages in the recycle bin leave the city when it is
deleted; restoring one later brings it back as an ordinary page. Deleting a
market deletes its cities with its pages.

## Markets and cities

- Copying a market's content (**Countries → Sync**, `npm run market:clone`)
  leaves city pages out: a city belongs to one market.
- Copying a single page to another market (**Copy to country**) still works
  for any page.

## Admin screens

- **Locations → Cities** (`/admin/cities`): search, country and status
  filters, pagination; city, country, region, URL, pages, landing page and its
  SEO score, status; edit, edit/open the landing page, view pages, generate,
  activate/deactivate, delete.
- **New city / edit city**: country, name, slug (checked as typed), optional
  region, active, published, sort order, local business details, search
  defaults, noindex, sitemap exclusion, and the optional landing page.
- **Locations → City Page Generator**.
- **Pages** list: City filter and a city badge; the page editor says which
  city a page belongs to and where it was generated from.

## Where the code is

| Concern | Code |
| --- | --- |
| Schema and migration | `prisma/schema.prisma`, `prisma/migrations/20260930120000_cities` |
| Namespace rules | `src/lib/urls/registry.ts` (`placeContent`, `checkAvailability`, `prefixConflict`), `src/lib/urls/cities.ts` |
| Actions | `src/lib/actions/cities.ts` |
| Rename and landing page | `src/lib/cities/manage.ts` |
| Generator | `src/lib/cities/generator.ts`, `src/lib/cities/template.ts`, `src/lib/cities/paths.ts` |
| Validation | `src/lib/validation/city.ts` |
| Public liveness and sitemap | `src/lib/services/pages.ts`, `src/lib/seo/sitemap.ts` |
| SEO and local details | `src/lib/cities/seo.ts`, `src/lib/cities/local.ts`, `src/app/(public)/_surfaces/cms-page.tsx`, `src/app/(public)/layout.tsx`, `src/lib/seo/intelligence/documents.ts` |
| Admin | `src/app/admin/cities`, `src/components/admin/cities` |
| Tests | `tests/unit/cities.test.ts`, `tests/integration/cities.test.ts`, `tests/integration/city-permissions.test.ts` |

## Limitations

- The city's SEO title is used by its landing page only; other city pages
  rely on their own titles (the generator fills them per city).
- A city page's breadcrumb is `Site → Page`; the city level is not added.
- Products have no per-city availability or pricing, by design.
- Renaming a city with many pages moves them in one transaction (up to two
  minutes); very large cities are better renamed outside peak hours.
