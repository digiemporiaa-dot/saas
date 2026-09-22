# Header

Everything the site header looks like is set in **Settings → Website design**
(also on **Settings**), on the **Header** tab.

> The footer has been removed and will be rebuilt from scratch. Nothing about
> it is documented here any more, and nothing in the code renders one.

## Blank means "leave it alone"

Every size and colour on that tab may be left empty, and empty is not zero and
not transparent — it means the header keeps exactly what it looks like now. A value only reaches the page as a CSS custom property when
somebody actually sets it, and each component carries its original value as
that property's fallback.

So opening that tab on a live site changes nothing until a field is filled
in, and clearing a field puts it back.

## Header

| Group | What it holds |
| --- | --- |
| Bar | Height (and a separate height for phones), content width, shadow, background, text, link-on-hover, current-page link, border colour, whether the line under it is drawn, whether it sticks while scrolling |
| Glass | Blur (up to 40px), saturation, and a hairline of light along the top edge |
| What the header shows | Logo, site name, menu, country switcher — each on or off |
| Logo | Height, height on phones, maximum width |
| Menu | Alignment, space between items, text size, weight, capitalisation |
| Announcement bar | Text, link, background, text colour |
| Header buttons | Label, link, **icon**, which side the icon sits on, and the button style, for each of the two buttons |

The drawer on a phone measures itself from the header's own height, so a taller
header does not leave the drawer overlapping it.

### Glass

Blur is how far the header softens what scrolls under it; saturation is what
stops a blurred backdrop looking washed out, and is most of the difference
between glass and frosted plastic. 16–24px of blur at around 140% saturation is
the usual look.

**Glass only shows through a background that is partly transparent.** Set the
background colour with an opacity below 100% — the opacity slider under every
colour — or there is nothing for the blur to work on. Leaving both blur and
saturation blank keeps the slight fixed blur the header has always had.

The **edge** is the hairline of light along the top that makes glass read as
glass rather than as a translucent rectangle. It only makes sense over content,
so it is off unless asked for.

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

### Sizing a mega menu

Per item: **columns** (1–6), **panel width** (any CSS length; blank keeps the
built-in 64rem) and **panel position** — centred under the item, from the
item's own left edge (what a menu near the left of the header wants, since a
centred panel there would run off the page), or the full width of the window.

### The mark beside a menu item

Every menu item can carry an **icon** from the shipped set, or an **uploaded
image** — a vendor logo has no equivalent in the icon set, and a mega menu of
products is mostly logos. The image wins where both are set, because it is the
more specific choice. **Mark size** sizes whichever one is showing.

Only a name this app ships is stored for the icon, and the image is a Media
record, so a menu can never pull its own markup into the header. The size and
the width go through the same length validator as everything else on the design
screen: anything that is not a length is ignored and the built-in value stands.

## Where the code is

| File | What it holds |
| --- | --- |
| `src/lib/cms/chrome.ts` | Settings in, CSS custom properties out. Pure, and where the validation lives. |
| `src/components/public/brand-style.tsx` | Writes those properties into the page. |
| `src/components/public/site-header.tsx` | The header, the mega panel and the header buttons. |
| `src/app/globals.css` | The colour rules, each with its original value as the fallback. |
