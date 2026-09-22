# Recycle bin

Nothing this admin deletes is destroyed. A page, an article, a product, a
product category and a brand are all **marked deleted** and parked under a
freed slug, so the URL each had is available again immediately and the row
itself waits to be restored.

## Where it is

**Website → Recycle Bin** (`/admin/trash`) lists deleted pages, articles,
product categories and brands, newest first, with a filter per kind.

**Products → Removed Products** (`/admin/products/trash`) is separate on
purpose: removing a product is a decision about which *markets* sell it, and
that screen distinguishes a product this market withdrew from one no market
offers any more. Restoring one is the same distinction, so it stays where the
market context is.

## What restore does

It brings the row back **as a draft**, never published. Somebody who deleted
something by mistake gets it back to look at, not back in front of visitors
before they have checked it.

It also asks for the original URL back. Where that URL has since been taken by
something else it settles for the next free spelling (`name-2`) and says so —
it never restores something under the parked `name-deleted-…` spelling, which
is not a URL anybody typed.

A category or brand is retired only when **no market** offers it any more, so
restoring one would otherwise bring back a row no screen can see. The market
doing the restoring takes it back on.

## What delete-for-good refuses

A page or an article credited with a **lead** is kept. That lead names the page
that produced it, and destroying the row would leave the lead unable to say
where it came from. The bin says so rather than offering a button that always
fails.

Categories and brands can always be destroyed: the products that used one keep
existing and simply lose it (`SET NULL` in the schema).

## What is not in the bin

**Page categories, blog categories and blog tags.** Deleting one of those
rearranges the tree — sub-categories are promoted to the deleted one's parent,
and pages or posts are recategorised — so putting the row back would not put
the structure back. A bin that restored the row and quietly lost the hierarchy
would be worse than none, so those deletes stay immediate, and the confirmation
on each already says what it will do.

## Where the code is

| File | What it holds |
| --- | --- |
| `src/lib/services/trash.ts` | Reading the bin: what is in it, what restoring brings back, what cannot be purged. |
| `src/lib/actions/trash.ts` | `restoreFromTrash` and `purgeFromTrash`, driven by one table of the four kinds. |
| `src/components/admin/trash/trash-table.tsx` | The list, its filter and the confirmation. |
| `src/lib/actions/products.ts` | Where a category or brand is retired into the bin rather than destroyed. |
