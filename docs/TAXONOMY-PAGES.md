# Category and brand pages

A category or a brand used to be a filter with nowhere to send anyone. Creating
one now also creates its page.

## What gets created

When a category or brand is created, a published page appears in the market it
was created in:

| Kind     | URL                    |
| -------- | ---------------------- |
| Category | `/categories/<slug>`   |
| Brand    | `/brands/<slug>`       |

It holds two sections:

1. **Hero** — the name as the heading, the description that was typed on the
   same form as the copy, and the category image or brand logo beside it where
   there is one.
2. **Product grid** — every product in that category or from that brand, in the
   market's catalogue order.

Its SEO title is the name and its SEO description is the typed description,
trimmed to a length a search result will show.

## The products are a question, not a copy

Nothing about the product list is written into the page. The grid stores
"products in this category" and is answered when the page is rendered, so a
product added to the category tomorrow is on the page tomorrow — nothing to
regenerate, nothing to keep in sync. Only products published in that market are
listed.

## It is an ordinary page

From the moment it exists it behaves like any other page: it is in the pages
list and the sitemap, sections can be added to it or removed from it, the whole
SEO tab applies, and it can be unpublished or deleted. Nothing reaches back in
and overwrites it later.

## Categories and brands that came first

Anything created from now on gets its page on the way in. Anything that already
existed shows **Create page** in the Page column on
`/admin/products/categories` and `/admin/products/brands`.

It is a button rather than something automatic, for the same reason nothing
overwrites an existing page: a page that was deleted on purpose should stay
deleted, not grow back the next time the category is renamed. The button does
nothing where a page already sits at that URL.

## Where the code is

| File                                 | What it holds                                     |
| ------------------------------------ | ------------------------------------------------- |
| `src/lib/cms/taxonomy-pages.ts`      | The blueprint: URL, title, description, sections. |
| `src/lib/services/taxonomy-pages.ts` | Creating the page, and finding an existing one.   |
| `src/lib/actions/products.ts`        | `saveProductCategory`, `saveBrand`, `generateTaxonomyPage`. |
