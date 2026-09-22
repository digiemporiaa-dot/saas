/**
 * What the description editor's toolbar actually does.
 *
 * The editor is an HTML surface rather than a WYSIWYG — everything written
 * there is sanitised server-side before it reaches the public site, and a
 * visible HTML contract is why. That does not mean the toolbar has to be
 * dumb: these are the edits it performs on the text and the selection, as
 * plain functions, so the rules can be read and tested without a DOM.
 *
 * Two things every command respects:
 *
 * - **It works on the block the caret is in.** Choosing "Heading 2" inside a
 *   paragraph retags that paragraph; it does not bury an `<h2>` inside it.
 * - **It only ever produces tags and classes the sanitiser keeps.** Alignment
 *   and size are classes, never inline `style`, because `style` is stripped on
 *   the way in and a control that silently does nothing is worse than none.
 */

export type Doc = {
  value: string;
  /** Selection start, as a textarea reports it. */
  start: number;
  /** Selection end. Equal to `start` when nothing is selected. */
  end: number;
};

export type Edit = {
  value: string;
  /** Where the caret should land once React has re-rendered. */
  caret: number;
};

/** The tags a block command may produce. */
export const BLOCK_TAGS = [
  'p',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'blockquote',
  'pre',
] as const;
export type BlockTag = (typeof BLOCK_TAGS)[number];

/** Alignment classes, styled under `.prose-cms` rather than by Tailwind. */
export const ALIGN_CLASSES = ['align-left', 'align-center', 'align-right', 'align-justify'] as const;
/** Size classes, ditto. */
export const SIZE_CLASSES = ['size-sm', 'size-md', 'size-lg', 'size-xl'] as const;

type Block = {
  tag: string;
  /** Index of `<`. */
  openStart: number;
  /** Index just past `>`. */
  openEnd: number;
  /** Index of `<` in the closing tag. */
  closeStart: number;
  /** Index just past `>` in the closing tag. */
  closeEnd: number;
  /** Everything between the tag name and `>`, e.g. ` class="align-center"`. */
  attrs: string;
};

const BLOCK_SET = new Set<string>([...BLOCK_TAGS, 'li', 'div', 'figcaption', 'td', 'th']);
const TAG_RE = /<(\/?)([a-z][a-z0-9]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/gi;

/**
 * The innermost block element containing `pos`, if there is one.
 *
 * Found by walking the tags rather than parsing: the content is a flat run of
 * block elements in practice, and a stack is enough to know which one the
 * caret sits inside. Anything unbalanced simply yields no block, and the
 * command falls back to wrapping the selection.
 */
export function enclosingBlock(value: string, pos: number): Block | null {
  const stack: Array<{ tag: string; openStart: number; openEnd: number; attrs: string }> = [];
  let found: Block | null = null;

  TAG_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = TAG_RE.exec(value)) !== null) {
    const [full, slash, rawTag, attrs] = match;
    const tag = rawTag.toLowerCase();
    if (!BLOCK_SET.has(tag)) continue;
    // A self-closing or void spelling opens nothing.
    if (attrs.trimEnd().endsWith('/')) continue;

    if (!slash) {
      stack.push({ tag, openStart: match.index, openEnd: match.index + full.length, attrs });
      continue;
    }

    // Unwind to the matching opener, tolerating stray closers.
    let opener = stack.pop();
    while (opener && opener.tag !== tag) opener = stack.pop();
    if (!opener) continue;

    const closeStart = match.index;
    const closeEnd = match.index + full.length;
    if (pos >= opener.openEnd && pos <= closeStart) {
      // Innermost wins: a later, tighter match replaces an earlier one.
      if (!found || opener.openStart > found.openStart) {
        found = { ...opener, closeStart, closeEnd };
      }
    }
  }

  return found;
}

/** Parses a `class="..."` value out of an attribute string. */
function readClasses(attrs: string): string[] {
  const match = /\sclass\s*=\s*"([^"]*)"/i.exec(attrs) ?? /\sclass\s*=\s*'([^']*)'/i.exec(attrs);
  return match ? match[1].split(/\s+/).filter(Boolean) : [];
}

function writeClasses(attrs: string, classes: string[]): string {
  const without = attrs.replace(/\sclass\s*=\s*("[^"]*"|'[^']*')/i, '');
  const trimmed = without.trimEnd();
  return classes.length > 0 ? `${trimmed} class="${classes.join(' ')}"` : trimmed;
}

/** Wraps the selection, which is what the inline tools have always done. */
export function wrapSelection(doc: Doc, before: string, after: string): Edit {
  const selected = doc.value.slice(doc.start, doc.end);
  return {
    value: `${doc.value.slice(0, doc.start)}${before}${selected}${after}${doc.value.slice(doc.end)}`,
    caret: doc.start + before.length + selected.length,
  };
}

/**
 * Retags the block the caret is in, or wraps the selection where there is no
 * block to retag.
 *
 * Its classes come across: changing a centred paragraph into a heading leaves
 * it centred, which is what somebody who set both would expect.
 */
export function applyBlock(doc: Doc, tag: BlockTag): Edit {
  const block = enclosingBlock(doc.value, doc.start);
  if (!block || !BLOCK_SET.has(block.tag)) {
    return wrapSelection(doc, `<${tag}>`, `</${tag}>`);
  }

  const open = `<${tag}${block.attrs.trimEnd()}>`;
  const close = `</${tag}>`;
  const inner = doc.value.slice(block.openEnd, block.closeStart);
  const value = `${doc.value.slice(0, block.openStart)}${open}${inner}${close}${doc.value.slice(block.closeEnd)}`;

  return { value, caret: block.openStart + open.length + inner.length };
}

/**
 * Sets one class from a group on the block the caret is in, replacing whatever
 * the block already had from that group.
 *
 * Passing the class the block already carries removes it, so the same button
 * turns alignment off again. With no block to act on the selection is wrapped
 * in a `<div>`, which is a tag the sanitiser keeps.
 */
export function applyBlockClass(
  doc: Doc,
  group: readonly string[],
  className: string,
): Edit {
  const block = enclosingBlock(doc.value, doc.start);
  if (!block) {
    return wrapSelection(doc, `<div class="${className}">`, '</div>');
  }

  const existing = readClasses(block.attrs);
  const kept = existing.filter((name) => !group.includes(name));
  const next = existing.includes(className) ? kept : [...kept, className];

  const open = `<${block.tag}${writeClasses(block.attrs, next)}>`;
  const inner = doc.value.slice(block.openEnd, block.closeStart);
  const value = `${doc.value.slice(0, block.openStart)}${open}${inner}${doc.value.slice(block.closeStart)}`;

  return { value, caret: block.openStart + open.length + inner.length };
}

/** A list built from the selection, one item per line. */
export function applyList(doc: Doc, tag: 'ul' | 'ol'): Edit {
  const selected = doc.value.slice(doc.start, doc.end);
  const lines = selected
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const items = (lines.length > 0 ? lines : ['']).map((line) => `  <li>${line}</li>`).join('\n');
  const html = `<${tag}>\n${items}\n</${tag}>`;

  return {
    value: `${doc.value.slice(0, doc.start)}${html}${doc.value.slice(doc.end)}`,
    caret: doc.start + html.length,
  };
}

/** Drops in a block that has no content of its own, such as a rule. */
export function insertBlock(doc: Doc, html: string): Edit {
  return {
    value: `${doc.value.slice(0, doc.start)}${html}${doc.value.slice(doc.end)}`,
    caret: doc.start + html.length,
  };
}

/**
 * Strips the tags from the selection, leaving its text.
 *
 * The one command that takes something away, and the reason it is here: a
 * paragraph pasted from a document arrives wrapped in markup nobody chose, and
 * hunting it down by hand in the source is the worst part of this editor.
 */
export function clearFormatting(doc: Doc): Edit {
  const selected = doc.value.slice(doc.start, doc.end);
  const text = selected.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  return {
    value: `${doc.value.slice(0, doc.start)}${text}${doc.value.slice(doc.end)}`,
    caret: doc.start + text.length,
  };
}
