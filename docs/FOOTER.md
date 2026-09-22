# The footer

**Settings → Website design**, the *Footer* form under the tabs. That is the
only place it lives: one row in the database, one component that reads it, one
form that writes it.

It is deliberately not a builder. The footer before this one was a list of CMS
blocks with a drag-and-drop screen, a registry of its own and a second set of
switches on the settings form, and the three disagreed often enough that the
usual result was changing the one that did nothing.

## What you fill in

| Section | What it holds |
| --- | --- |
| **Brand** | Logo, name, the line under them and the social icons. Logo and name, either alone, or neither. A blank name uses the site name; a blank logo uses the one from Branding. |
| **Link columns** | Up to four, each a heading and its links. `/pricing` is resolved inside the market being browsed; a full URL is left alone. |
| **Contact column** | A heading and the phone, email and address, each switchable. Leave one blank and it uses the market's own value. |
| **Bottom bar** | The line under the rule. `{year}` becomes this year and `{site}` the site name. |
| **Appearance** | Colours, padding, width, gaps, logo height, social icon size and style, the brand column's width, and the column count per screen size. |

The social links themselves are on **Settings → Branding**; the footer only
decides whether to show them and what shape to draw them in.

## One footer, every market

The contact column falls back to whichever storefront is being browsed, so a
site with several markets needs one footer rather than one per market. Typing a
value into the phone, email or address field pins it for all of them instead.

## Blank means "leave it alone"

Every colour and size may be left empty, and empty is not zero and not
transparent — it means the footer keeps exactly what it looks like now. A value
reaches the page as a CSS custom property only when somebody sets one, and each
rule in `globals.css` carries the built-in value as that property's fallback.

So opening the form on a live site changes nothing until a field is filled in,
and clearing a field puts it back.

## On a phone

The row narrows on its own — four columns, then two, then one — unless
*Columns on tablet* or *Columns on mobile* says otherwise. Zero means "narrow
it for me".

## Where the code is

| File | What it holds |
| --- | --- |
| `src/lib/cms/footer.ts` | The two schemas, the defaults and the CSS custom properties. Pure, and where the validation lives. |
| `src/lib/services/footer.ts` | Reading the row, with the built-in footer as the fallback. |
| `src/lib/actions/footer.ts` | Saving it. |
| `src/components/public/site-footer.tsx` | The footer itself. |
| `src/components/admin/settings/footer-form.tsx` | The form. |
| `src/app/globals.css` | The rules, each with its built-in value as the fallback. |
