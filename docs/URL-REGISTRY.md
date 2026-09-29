# URL registry and the Slug & URL Manager

Every public address on the site belongs to exactly one thing: a page, a
product in one market, an article, a blog category or tag, the blog archive, or
a redirect. The **URL registry** records who owns which address, and the
**Slug & URL Manager** (Admin → SEO → Slug & URL Manager, `/admin/slug-manager`)
is where addresses are changed.

This document covers what the registry does, how an address is decided, how to
roll it out and back, and what to check when something looks wrong.

---

## Contents

- [In one minute](#in-one-minute)
- [How an address is decided](#how-an-address-is-decided)
- [The four common changes](#the-four-common-changes)
- [Redirects](#redirects)
- [What an address may be](#what-an-address-may-be)
- [The manager, tab by tab](#the-manager-tab-by-tab)
- [Bulk changes and CSV](#bulk-changes-and-csv)
- [Links, canonicals, sitemaps and hreflang](#links-canonicals-sitemaps-and-hreflang)
- [Permissions](#permissions)
- [Rollout](#rollout)
- [Switching off, and other recovery](#switching-off-and-other-recovery)
- [Backup and restore](#backup-and-restore)
- [Performance](#performance)
- [Data model](#data-model)
- [Limitations](#limitations)

---

## In one minute

- Content is identified by its **id and market**, never by its URL. A URL is an
  attribute that can change; the id cannot. Links, redirects, hreflang and
  the market switcher all find content by id.
- An address is decided by **custom address → market pattern → global
  pattern → built-in default**, in that order.
- When a published address changes, the old one **redirects permanently to the
  content by id**, so it keeps working through any number of later changes
  without ever becoming a chain.
- Editing a title never changes a published address.
- Uniqueness is enforced by the **database**: one row per normalised address
  (`UrlRoute.pathKey`, unique), whatever writes it.
- The registry ships **switched off**. Until an administrator switches it on,
  the site is served exactly as before. Switching it off again is the
  rollback.

---

## How an address is decided

| Order | Source | Scope | Survives a pattern change? |
|---|---|---|---|
| 1 | **Custom address** | one piece of content in one market | Yes — patterns never touch it |
| 2 | **Market pattern** | one content type in one market | — |
| 3 | **Global pattern** | one content type in every market without its own | — |
| 4 | **Built-in default** | one content type | — |

The built-in defaults are the addresses the site has always used, so nothing
moves until someone changes something:

| Content | Default pattern | Example |
|---|---|---|
| Product | `/products/{slug}` | `/products/dropbox`, `/ae/products/dropbox` |
| Blog article | `/blog/{slug}` | `/blog/article` |
| Blog category | `/blog/category/{slug}` | `/blog/category/guides` |
| Blog tag | `/blog/tag/{slug}` | `/blog/tag/security` |
| Blog archive | `/blog` | `/blog` |
| Category page | `/categories/{slug}` | the page generated for a product category |
| Brand page | `/brands/{slug}` | the page generated for a brand |
| Page | — | a page's address is its own path, e.g. `/about` or `/software/backup` |

A market's prefix is added in front of every pattern: the UAE's product
pattern `/{slug}` gives `/ae/dropbox`.

**Rules that always hold**

- `{slug}` must appear exactly once, as a whole segment. `/{slug}` removes the
  prefix; `/software/{slug}` adds a custom one; up to five segments may be
  nested.
- **The blog is root-only.** Articles, categories, tags and the archive exist
  once, in the root market, and a market-prefixed blog address
  (`/ae/blog/...`) redirects permanently to the root one.
- **Category and brand landing pages are linked by id** (`Page.landingCategoryId`,
  `Page.landingBrandId`). Renaming the page or re-slugging the category no
  longer breaks the link between them.
- **A title edit never changes a published address.** A slug edit moves an
  address that follows its pattern; a custom address stays where it is.
- **Drafts are private.** A draft's address is reserved for it, so nothing else
  can take it, but it answers 404 until the content is published, is never
  offered as a redirect destination, and moving it leaves no redirect behind.

---

## The four common changes

The registry must be switched on first (see [Rollout](#rollout)).

**`/products/dropbox` → `/dropbox`, for every product.**
URL Patterns → Product → *Global default* → `/{slug}` → **Preview** → **Apply**.
The preview lists every product that moves, every conflict (an address already
used by a page, say) and every exclusion (products with a custom address).
Every product that has been public gets a permanent redirect from its old
address.

**`/dropbox` → `/software/dropbox-business`, for one product.**
All URLs → search *dropbox* → open it → *Custom address* →
`/software/dropbox-business`. Availability is checked as you type, and the
drawer shows the final URL on the site's domain and the redirect that will be
written. **Save address.**

**`/ae/products/dropbox` → `/ae/dropbox`, for one market only.**
URL Patterns → Product → the UAE column → `/{slug}` → Preview → Apply. Every
other market keeps its pattern.

**`/blog/article` → `/insights/article`.**
URL Patterns → Blog article → `/insights/{slug}`. To move the archive too, set
Blog archive → `/insights`, and categories and tags likewise.

---

## Redirects

**Automatic.** When a published address changes, a permanent redirect is
written from the old address to the content, by id. If the content moves
again, every earlier redirect goes straight to the new address — no chains.
Content that was never public (a draft moving around) leaves no redirect.

**Manual.** Redirects tab → New redirect. A destination can be published
content (chosen by name, and followed by id from then on), a path, or an
external `https://` URL. A redirect claims its address in the registry, so it
can never shadow a page, and two redirects can never answer for one address.
Saving refuses a loop, and a destination that is itself a redirect is followed
to where it ends before it is saved.

**Every market.** A manual redirect for an unprefixed address can also answer
under every market prefix (`/old-plan`, `/ae/old-plan`, ...). Wherever content
already lives at one of those addresses, the content wins and the redirect is
listed as *never fires* there.

**Status codes.** Redirects are answered before anything renders, with a real
HTTP status and a `Location` header, using the framework's codes: **308**
(permanent) and **307** (temporary). Search engines treat 308 like 301.

**Browsers cache permanent redirects**, often for a long time. Switching a 308
off or pointing it elsewhere does not reach anyone who already followed it. Use
307 while you are unsure. The admin says the same thing in *How redirects
behave*.

**Query strings** are kept: on this site every parameter is carried over,
UTMs included; to an external destination only attribution parameters
(`utm_*`, `gclid`, `fbclid`, `msclkid` and similar) are forwarded. Parameters
the destination already sets win.

**Deleted content** keeps its history. Its addresses answer 404 — they are
never sent to the home page by default. History → *New home*, or URL Health →
*Redirect*, sends them to published content someone chose. An automatic
redirect left pointing at deleted content is re-pointed rather than refused.

**The bare domain and www.** The site address is `NEXT_PUBLIC_SITE_URL`.
Requests on its twin (`example.com` for `www.example.com`, or the other way
round) are sent to it with a 308 by the middleware, keeping path and query.
Other hosts, `localhost` and IP addresses are left alone.
`CANONICAL_HOST_REDIRECT=false` turns it off, for a proxy that already does it.

---

## What an address may be

Addresses are compared by a normalised **key**: lower case, no trailing slash,
no empty segments, percent-encoding decoded. `/Dropbox/` and `/dropbox` are the
same address, and the database enforces one owner per key.

An address the editor types may contain lower-case letters, digits, hyphens
and slashes. Capitals and spaces are tidied (and the editor is told);
everything else is refused with the reason:

- the home page (`/`) cannot be moved;
- no `.` or `..` segments, no encoded separators, no control characters;
- at most 8 segments, 120 characters per segment, 300 in all;
- the first segment may not be a **market prefix** (`/ae/...`), a **system
  route** (`admin`, `api`, `_next`, `auth`, the sign-in path, `login`,
  `logout`, `preview`, `uploads`, `media`, `static`, `assets`, `sitemaps`,
  `health`, `ready` and others — `src/lib/country/reserved.ts`), or anything
  containing a dot (`sitemap.xml`, `robots.txt`, files).

A request for an address that is not valid at all (bad encoding, traversal)
answers 404 rather than being interpreted as something else.

---

## The manager, tab by tab

The page keeps its state in the address bar: filters, the page of results and
the open tab survive a reload and can be shared as a link. Saving never reloads
the page.

- **All URLs** — every piece of content with its address, status (live,
  scheduled, draft, archived, hidden) and whether it follows its pattern or has
  a custom address. Search, market, type, status and mode filters; select rows
  for bulk actions; export or import CSV. Click a row to open the **edit
  drawer**: current URL, custom address or pattern, the inherited pattern and
  where it comes from, live availability, the final URL on the site's domain,
  redirects pointing here, recent history, and *Reset to the inherited
  pattern* with a preview of its effect.
- **URL Patterns** — the global default and each market's override, per
  content type, with how many items follow each and how many have custom
  addresses. Every change is previewed.
- **Redirects** — automatic and manual, with status code, hits and last hit,
  enable/disable, destination and notes.
- **Conflicts** — content without an address and why: taken (with the owner
  and a link to it), reserved, never reachable under the previous router, or
  simply free now. *Suggest alternatives* offers free addresses nearby; one
  click opens it in the drawer to check and save — nothing is applied
  automatically. Also: redirects that never fire, and redirects the scan could
  not import.
- **History** — every address change: old and new path, reason, who and when.
  *Restore* puts content back at an earlier address after checking it is still
  free; the address it leaves redirects to it. For deleted content, *New home*
  redirects its old address to content you choose.
- **URL Health** — addresses visitors asked for that answered 404, with hits,
  first and last seen, and the last referrer (origin and path only); redirects
  whose destination was deleted, unpublished, is itself a redirect, or does not
  exist; and stored internal links that lead nowhere. Worked out from real
  requests and the database — nothing fetches a URL. Query strings are never
  stored; lists are bounded (at most 5,000 recorded 404s — the least requested
  and longest unseen are dropped first).

---

## Bulk changes and CSV

Every bulk change — selected rows reset to their pattern, a prefix replaced
(`/software` → `/apps`), a pattern changed, a CSV imported — becomes a **plan**:
one line per piece of content, marked *change*, *unchanged*, *conflict*,
*invalid*, *excluded* or *duplicate*, with the reason. Nothing changes until the
plan has been reviewed and applied.

- **Stale previews are refused.** Applying works the plan out again from
  current data; if anything moved since the preview, nothing is applied and the
  new preview is shown instead.
- Two lines that want the same address are **both** marked as conflicts rather
  than one being picked.
- Up to 50 changes apply in one transaction. Larger plans apply in batches of
  25, each in its own transaction, with progress shown; an interrupted
  operation is listed under URL Patterns with a *Resume* button, and two people
  resuming it at once take turns rather than applying a batch twice.

**CSV.** *Export CSV* writes the current view:

```
entity_id,country,type,name,status,mode,current_path,pattern_path,target_path
```

Edit `target_path` and import the file back. Only `entity_id`, `country` and
`target_path` are read: rows are matched by stable id and market (ISO code),
never by name or current path. A blank `target_path` leaves the row alone;
`@pattern` puts it back on its pattern; a path may include the market prefix.
At most 5,000 rows per import. Cells a spreadsheet would run as a formula are
exported with a leading apostrophe.

---

## Links, canonicals, sitemaps and hreflang

One set of helpers (`src/lib/urls/links.ts`) builds every public URL — product
cards, menus, CTAs, breadcrumbs, the market switcher, canonical and Open Graph
URLs, JSON-LD, the sitemaps, hreflang alternates and SEO Intelligence — from
the content's id and market. The registered address wins; without one, the
pattern applies.

- **Another market's version** of a page or product is found by identity: the
  same product id, or the same page group (`Page.groupKey`) — not by assuming
  it has the same slug.
- **Links typed into content** (a CTA pointing at `/products/dropbox`) are
  rendered at the content's current address, so a moved page's inbound links do
  not go through a redirect. After a move, the drawer also lists stored links
  that match the old address **exactly** and offers to rewrite them; nothing is
  rewritten without being chosen.
- **Explicit canonical URLs** are never replaced: they are listed for review.
- Changes are live on the next request, on every server, without a rebuild.

---

## Permissions

- Opening the manager: `seo.manage`.
- Changing an address — in the drawer, in bulk, by CSV, by pattern or by
  restore — additionally needs permission to edit that kind of content
  (`pages.edit`, `products.edit`, `blog.edit`, `blog.categories`, `blog.tags`,
  `blog.design` for the archive), and access to the market. Every row of a
  bulk change is checked on its own.
- A global pattern, the scan, and switching the registry on or off need access
  to every market.
- Every check runs on the server, in the action; the interface only mirrors it.
- The ordinary content forms (create, duplicate, restore from trash, copy to
  another market) go through the same registry validation, so they cannot
  create an address the manager would refuse.

---

## Rollout

The migration is additive and changes no public address. The registry starts
empty and switched off; the site is served exactly as before until step 4.

1. **Deploy.** `prisma migrate deploy` runs on start (`docker/entrypoint.sh`),
   or run it yourself. Migration: `20260929120000_url_registry`.
2. **Rehearse the scan (optional).**
   `npm run urls:backfill -- --dry-run` runs the whole scan against the live
   data under the registry lock and rolls it back, printing what it would
   register and every collision. Nothing is written.
3. **Scan.** Slug & URL Manager → *Run first scan*, or `npm run urls:backfill`.
   It registers every address exactly where the site serves it today, links
   landing pages to their taxonomy, groups the same page across markets and
   imports existing redirects. It is idempotent: run it as often as you like.
   It exits with status 2 when there is something to review.
4. **Review Conflicts.** Collisions are addresses the scan could not register —
   most of them were never reachable under the previous router either (a page
   under `/blog/...`, say). They stay as they are; nothing is moved to make
   room.
5. **Switch on.** *Switch on* in the manager's header (you are asked to confirm
   any collisions). From the next request, on every server, addresses are
   answered from the registry. Nothing moves.
6. **Change addresses** — one at a time, by pattern or in bulk.

**After copying a market** with `npm run market:clone`, or any other direct
database import, run a scan: content written straight to the database is not
registered until then, and while the registry is on, content without an
address is not served. The clone script prints this reminder.

**After changing the default market**, run a scan.

---

## Switching off, and other recovery

**Switch off** (manager header) is the rollback. From the next request the
previous router serves the site again, and nothing is lost:

- content is served at its pre-registry address again (`/products/<slug>`,
  `/blog/<slug>`, a page at its path);
- addresses the registry gave out (`/dropbox`, `/software/dropbox-business`)
  send visitors to the content's pre-registry address with a **temporary**
  redirect (307) — temporary, because switching back on makes them the real
  addresses again;
- redirects to content go to where the previous router serves it,
  temporarily while the content's registry address differs;
- links, canonicals, sitemaps and hreflang are built from the built-in
  patterns;
- the registry, its history and every redirect are kept. Switch back on and
  everything is exactly as it was.

**A change made by mistake**: History → *Restore* for one address; for a
pattern, apply the previous pattern again (URL Patterns → edit → *Inherit* or
the old value). Either way, the addresses in between keep redirecting.

**Rolling the application back to 1.1.0** works with the new schema: the
migration only adds tables, columns and indexes, and the previous release reads
none of them. Switch the registry off before rolling back, so the old code
serves the addresses it knows. The one relaxed constraint — `Redirect.source`
is no longer unique, because one address per market is now enforced by the
registry — is compatible with the old code, which checked it in the action.

**Rebuilding the registry**: the scan only ever adds what is missing and
releases routes of content that no longer exists. It never moves an address,
so it is always safe to run.

---

## Backup and restore

The registry is ordinary tables in the same database (`UrlRoute`,
`UrlPattern`, `UrlHistory`, `UrlNotFound`, `UrlOperation`, `UrlSettings`, plus
columns on `Redirect` and `Page`), so every database backup includes it and a
restore brings it back consistent with the content restored alongside it. See
[BACKUP-RESTORE.md](./BACKUP-RESTORE.md).

After restoring a backup taken **before** this migration, run
`prisma migrate deploy` and then a scan — the same as a first rollout. After
restoring a backup taken with the registry on, nothing else is needed; each
server reloads the registry on its next request.

---

## Performance

- A public request reads one row (`UrlSettings`, by primary key) to learn
  whether the registry changed. The registry itself is held in memory by each
  server and rebuilt once per change, by one request, whoever asks first.
- Resolving an address is one indexed lookup (`UrlRoute.pathKey`).
- Admin, API, authentication and asset requests are never resolved through
  the registry, and the middleware does no database work at all.
- Listings are built from a handful of batched queries, never one per row.
- Link helpers are synchronous and read the in-memory copy.

---

## Data model

| Table | Holds |
|---|---|
| `UrlRoute` | One row per claimed address: `kind` CONTENT (type + entity id + market) or REDIRECT (a `Redirect` row); `pathKey` unique; `mode` PATTERN or CUSTOM; `version` for optimistic concurrency. One route per content per market (`@@unique([entityId, countryId])`). |
| `UrlPattern` | Patterns by scope: `PRODUCT:*` (global), `PRODUCT:<countryId>` (a market). |
| `UrlHistory` | Every address change: old and new path, reason, who, when, batch. Kept when content is deleted. |
| `UrlNotFound` | Recorded 404s: normalised path, market, hits, first and last seen, last referrer (origin and path), status. |
| `UrlOperation` | Bulk changes: the plan, progress and per-item results. |
| `UrlSettings` | Whether the registry answers requests, its version, and the last scan's report. |
| `Redirect` | Gains `origin` (MANUAL/AUTOMATIC), market, `allMarkets`, the target content by id, `lastHitAt`, and who created and changed it. |
| `Page` | Gains `groupKey` (the same page across markets) and `landingCategoryId` / `landingBrandId`. |

Database constraints back the application rules: a CONTENT route must name
content and no redirect, a REDIRECT route a redirect and no content; a key must
be lower case, start with `/`, have no trailing slash and no empty segment.
Writers take one PostgreSQL advisory lock
(`pg_advisory_xact_lock(7263541)`), so concurrent saves are serialised, and
each route carries a version, so a save based on an out-of-date view is
refused.

---

## Limitations

- **Status codes are 308 and 307**, not 301 and 302: they are what the
  framework sends from a page. Search engines treat them the same way.
- **Each server holds the registry in memory.** Tens of thousands of addresses
  are a few megabytes; a site far larger than that would want the snapshot
  sharded.
- **Swapping two addresses in one bulk change** (A takes B's address while B
  takes A's) is refused as a conflict; do it in two steps through a free
  address.
- **Market-prefixed blog addresses** redirect to the root blog; the blog
  cannot have per-market addresses.
- **Stored-link rewriting** matches exact addresses only (`href="/old"`, a
  CTA's URL). Links built by string concatenation in custom HTML are reported
  under URL Health once they break, not rewritten.
- **A scan is needed** after content is written straight to the database
  (market clone, imports) and after the default market changes.
