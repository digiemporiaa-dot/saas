/**
 * Carrying a built page across when the thing that owns it is duplicated.
 *
 * Duplicating a page, a product or an article is only useful if the copy is
 * the same page — the sections somebody arranged are the work, and a copy
 * without them is a blank document with the original's title. Pages, products
 * and blog posts each store their sections in their own table, but the columns
 * are deliberately identical, so the mapping lives here once rather than being
 * written out at each duplicate action and drifting between them.
 *
 * Two details this normalises:
 *
 * - `content` and `settings` are `Json` columns that cannot be null on the way
 *   in. A row whose payload is a JSON `null` — or anything that is not an
 *   object — would otherwise make the whole duplicate fail; the copy gets an
 *   empty payload and the block falls back to its own defaults, which is what
 *   the renderer already does for that row.
 * - The anchor is kept. Unlike duplicating a section inside the same page, a
 *   duplicate lives in its own document, so its `#links` still resolve and
 *   clearing them would break the copy rather than fix it.
 */

/** The shape every section table shares. */
export type CopyableSection = {
  blockType: string;
  name: string | null;
  sortOrder: number;
  isVisible: boolean;
  content: unknown;
  settings: unknown;
};

export type SectionCopy = {
  blockType: string;
  name: string | null;
  sortOrder: number;
  isVisible: boolean;
  content: object;
  settings: object;
};

function payload(value: unknown): object {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value : {};
}

/** One section as create input, without whatever identifies its new owner. */
export function sectionCopy(section: CopyableSection): SectionCopy {
  return {
    blockType: section.blockType,
    name: section.name,
    sortOrder: section.sortOrder,
    isVisible: section.isVisible,
    content: payload(section.content),
    settings: payload(section.settings),
  };
}

/** Every section as create input, in the order they were read. */
export function sectionCopies(sections: readonly CopyableSection[]): SectionCopy[] {
  return sections.map(sectionCopy);
}
