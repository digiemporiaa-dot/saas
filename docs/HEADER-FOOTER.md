# Header and footer

Everything the site's chrome looks like is set in **Settings → Website design**
(also on **Settings**), on the **Header** and **Footer** tabs.

## Blank means "leave it alone"

Every size and colour on those two tabs may be left empty, and empty is not
zero and not transparent — it means the header or footer keeps exactly what it
looks like now. A value only reaches the page as a CSS custom property when
somebody actually sets it, and each component carries its original value as
that property's fallback.

So opening these tabs on a live site changes nothing until a field is filled
in, and clearing a field puts it back.

## Header

| Group | What it holds |
| --- | --- |
| Bar | Height (and a separate height for phones), content width, shadow, background, text, link-on-hover, current-page link, border colour, whether the line under it is drawn, whether it sticks while scrolling |
| Logo | Height, height on phones, maximum width |
| Menu | Alignment, space between items, text size, weight, capitalisation |
| Announcement bar | Text, link, background, text colour |
| Header buttons | Label, link, **icon**, which side the icon sits on, and the button style, for each of the two buttons |

The drawer on a phone measures itself from the header's own height, so a taller
header does not leave the drawer overlapping it.

## Footer

Background, text, headings, links, links on hover, divider line, vertical
padding, content width, space between columns, logo height and social icon
size. The columns themselves are still whichever menus have a footer location
in Navigation.

## Mega menus

A mega menu is switched on **per menu item**, in Navigation: open a top-level
item and turn on *Open as a mega menu*, then choose how many columns.

It reads the item's own tree, and works either way it is built:

- **Grouped** — where a sub-item has sub-items of its own, each sub-item
  becomes a column heading with its links beneath it.
- **Flat** — where none does, the sub-items are simply dealt across the
  columns as links.

That second shape is why the switch is worth having on a menu that is only two
levels deep: turning it on widens the list into columns rather than producing a
panel of headings with nothing under them.

Every menu item can also carry an **icon** from the shipped set, shown beside
its label in dropdowns and mega menus. Only a name this app ships is stored, so
a menu can never pull its own markup into the header.

## Where the code is

| File | What it holds |
| --- | --- |
| `src/lib/cms/chrome.ts` | Settings in, CSS custom properties out. Pure, and where the validation lives. |
| `src/components/public/brand-style.tsx` | Writes those properties into the page. |
| `src/components/public/site-header.tsx` | The header, the mega panel and the header buttons. |
| `src/components/public/site-footer.tsx` | The footer. |
| `src/app/globals.css` | The colour rules, each with its original value as the fallback. |
