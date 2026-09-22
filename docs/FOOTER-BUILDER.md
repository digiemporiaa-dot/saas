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
  into up to six columns. Each column says what it holds:

  | This column holds | What goes in it |
  | --- | --- |
  | Text, links or a menu | A heading over some text, a footer menu by slug, hand-typed links, or any mix |
  | The brand block | Logo or site name, the line under it, the social icons, optionally the contact details |
  | The sign-up form | A heading, some copy and a form from Forms |

  Each column can also name its own **width** as one grid track — `1.4fr` for a
  column half again as wide as the rest, `20rem` to pin it. Blank shares the
  row equally. That is what puts a wide brand column beside three narrow ones.

  **Footer menus** does the simpler thing for the menus themselves, one per
  column or a fixed count.

- **Columns per screen size.** Both blocks take a column count for tablet and
  for mobile beside the one for desktop. Leave them at 0 and the row narrows
  on its own — to two, then one — because four columns on a phone is a column
  of single words.

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
row — the footer exactly as it was.

Opening the builder offers two starting points, and writes whichever you pick
out as real rows, so the first edit starts from something rather than from an
empty screen:

| Starting point | What it writes |
| --- | --- |
| **The footer you have now** | The four rows above, exactly as the website already renders them |
| **Brand, menus and sign-up in one row** | One `footerColumns` row — a wide brand column, two menu columns and the sign-up form — over a bottom row with the rule and the legal links |

Both are ordinary rows the moment they are written: nothing about either is
fixed, and everything in them is a field.

The one-row arrangement points its two menu columns at the slugs `products`
and `support`. A slug that matches no menu renders an empty column — point it
at a real one in **Settings → Navigation**, or type the links into the column
by hand.

**Start again from an arrangement** rebuilds a footer you have already taken
control of from either starting point. It replaces every row, so it asks first.

**Reset to the built-in footer** throws the rows away and puts the choice back.

## Colours and spacing

Structure is arranged here; how it looks is **Settings → Website design →
Footer**: background, text, headings, links, the divider line, vertical
padding, content width, the gap between rows and between columns, logo height
and social icon size. A pale footer is that screen's *Background* and *Text*
— the rows follow whatever it is set to.

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
