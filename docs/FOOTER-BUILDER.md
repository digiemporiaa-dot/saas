# The footer builder

The footer is built the way a page is: a list of sections the market owns, each
an ordinary CMS block with the same editor, design panel and drag-and-drop
outline as everything else.

**Settings → Footer** (`/admin/settings/footer`).

## Rows and columns

- **A row is a section** in the list. Rows stack down the footer, in the order
  you drag them into. The gap between them is *Space between rows* on Website
  design → Footer.
- **Columns live inside a row.** The **Footer columns** block divides one row
  into up to six columns, each with a heading and any of: some text, a footer
  menu by slug, or hand-typed links. **Footer menus** does the same thing for
  the menus themselves, one per column or a fixed count.

Every **page** section works here too, so a row can just as easily be a rich
text block, an image, a logo wall or a call to action.

## Its own blocks

| Block | What it is |
| --- | --- |
| Footer brand block | Logo or site name, the line under it, and the market's email, phone and address — each switchable, each overridable |
| Footer menus | Every menu with a footer location, one per column, or the ones you name in the order you name them |
| Footer columns | A row divided into columns of text, links or a menu |
| Footer newsletter | A sign-up form from Forms, with copy beside it or above it |
| Footer bottom row | Copyright, the legal menu and the social icons. One per footer |

Nothing in them is hardcoded content: each reads the market being rendered, and
the fields decide what of it is shown and what it is called. Leaving a field
blank uses the market's own value, which is almost always what is wanted.

## Per market

A footer already differs by market — the contact details, the menus and the
copyright line are each a market's own — so the whole arrangement is per
market. The screen follows the market switcher, and rearranging one market's
footer leaves every other market exactly as it was.

## Nothing changed until you change it

A market that has never opened the builder has **no rows**, and renders the
built-in arrangement: the newsletter, the brand block, the menus and the bottom
row — the footer exactly as it was. Opening the builder offers to *take control
of it*, which writes that same arrangement out as real rows, so the first edit
starts from what is already live rather than from an empty screen.

**Reset to the built-in footer** throws the rows away and puts it back.

## Where the code is

| File | What it holds |
| --- | --- |
| `src/lib/cms/footer-blocks.ts` | The blocks: schemas and editor fields. |
| `src/lib/cms/footer-defaults.ts` | The built-in arrangement. |
| `src/lib/cms/footer-render.ts` | What a footer block is handed. |
| `src/lib/services/footer-cms.ts` | Reading the rows, and materialising them. |
| `src/lib/actions/footer-layout.ts` | Add, edit, duplicate, reorder, hide, reset. |
| `src/components/cms/blocks/footer-blocks.tsx` | The renderers. |
| `src/components/public/site-footer.tsx` | The footer itself, which is now a section list. |
