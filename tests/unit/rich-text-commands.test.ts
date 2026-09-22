import { describe, it, expect } from 'vitest';
import {
  enclosingBlock,
  applyBlock,
  applyBlockClass,
  applyList,
  clearFormatting,
  insertBlock,
  wrapSelection,
  ALIGN_CLASSES,
  SIZE_CLASSES,
  type Doc,
} from '@/lib/cms/rich-text-commands';
import { sanitizeHtml } from '@/lib/utils/sanitize';

/**
 * What the description toolbar does to the text.
 *
 * Two rules decide everything here: a command works on the block the caret is
 * in rather than burying a tag inside it, and it only ever produces markup the
 * sanitiser keeps — a control whose output is stripped on save is worse than
 * no control at all.
 */

const at = (value: string, needle: string): Doc => {
  const index = value.indexOf(needle);
  return { value, start: index, end: index + needle.length };
};

describe('finding the block the caret is in', () => {
  it('finds the paragraph around the caret', () => {
    const html = '<p>First</p>\n<p>Second</p>';
    expect(enclosingBlock(html, html.indexOf('Second'))?.tag).toBe('p');
    expect(enclosingBlock(html, html.indexOf('First'))?.tag).toBe('p');
  });

  it('finds the innermost one when they are nested', () => {
    const html = '<blockquote><p>Inside</p></blockquote>';
    expect(enclosingBlock(html, html.indexOf('Inside'))?.tag).toBe('p');
  });

  it('finds nothing in bare text, rather than guessing', () => {
    expect(enclosingBlock('just some words', 4)).toBeNull();
    // Unbalanced markup yields no block; the command falls back to wrapping.
    expect(enclosingBlock('<p>open forever', 6)).toBeNull();
  });
});

describe('choosing a block type', () => {
  it('retags the paragraph instead of nesting a heading inside it', () => {
    const { value } = applyBlock(at('<p>A title</p>', 'A title'), 'h2');
    expect(value).toBe('<h2>A title</h2>');
    expect(value).not.toContain('<p>');
  });

  it('keeps the classes the block already had', () => {
    // Somebody who centred a paragraph and then made it a heading means for it
    // to stay centred.
    const { value } = applyBlock(
      at('<p class="align-center">A title</p>', 'A title'),
      'h3',
    );
    expect(value).toBe('<h3 class="align-center">A title</h3>');
  });

  it('wraps the selection where there is no block to retag', () => {
    expect(applyBlock(at('A title', 'A title'), 'h2').value).toBe('<h2>A title</h2>');
  });

  it('leaves the caret inside the block it just made', () => {
    const edit = applyBlock(at('<p>A title</p>', 'A title'), 'h2');
    expect(edit.value.slice(0, edit.caret)).toBe('<h2>A title');
  });
});

describe('alignment and size', () => {
  it('puts the class on the block, never an inline style', () => {
    const { value } = applyBlockClass(at('<p>Body</p>', 'Body'), ALIGN_CLASSES, 'align-center');
    expect(value).toBe('<p class="align-center">Body</p>');
    expect(value).not.toContain('style=');
  });

  it('replaces the previous choice from the same group', () => {
    const once = applyBlockClass(at('<p>Body</p>', 'Body'), ALIGN_CLASSES, 'align-center').value;
    const twice = applyBlockClass(at(once, 'Body'), ALIGN_CLASSES, 'align-right').value;
    expect(twice).toBe('<p class="align-right">Body</p>');
  });

  it('leaves classes from other groups alone', () => {
    const sized = applyBlockClass(at('<p>Body</p>', 'Body'), SIZE_CLASSES, 'size-lg').value;
    const aligned = applyBlockClass(at(sized, 'Body'), ALIGN_CLASSES, 'align-center').value;
    expect(aligned).toContain('size-lg');
    expect(aligned).toContain('align-center');
  });

  it('turns the same choice off again', () => {
    const on = applyBlockClass(at('<p>Body</p>', 'Body'), ALIGN_CLASSES, 'align-center').value;
    const off = applyBlockClass(at(on, 'Body'), ALIGN_CLASSES, 'align-center').value;
    expect(off).toBe('<p>Body</p>');
  });

  it('wraps unwrapped text in a div rather than doing nothing', () => {
    expect(applyBlockClass(at('Body', 'Body'), ALIGN_CLASSES, 'align-center').value).toBe(
      '<div class="align-center">Body</div>',
    );
  });
});

describe('lists, rules and clearing', () => {
  it('makes one item per selected line', () => {
    const { value } = applyList(at('One\nTwo\nThree', 'One\nTwo\nThree'), 'ul');
    expect(value).toBe('<ul>\n  <li>One</li>\n  <li>Two</li>\n  <li>Three</li>\n</ul>');
  });

  it('makes an empty item when nothing is selected', () => {
    expect(applyList({ value: '', start: 0, end: 0 }, 'ol').value).toBe(
      '<ol>\n  <li></li>\n</ol>',
    );
  });

  it('drops a rule in at the caret', () => {
    expect(insertBlock({ value: '<p>A</p>', start: 8, end: 8 }, '\n<hr />\n').value).toBe(
      '<p>A</p>\n<hr />\n',
    );
  });

  it('strips the markup out of a pasted selection', () => {
    const html = '<p><span class="x"><b>Pasted</b> from a document</span></p>';
    const { value } = clearFormatting(at(html, '<span class="x"><b>Pasted</b> from a document</span>'));
    expect(value).toBe('<p>Pasted from a document</p>');
  });

  it('wraps the selection for the inline tools', () => {
    expect(wrapSelection(at('<p>Body</p>', 'Body'), '<strong>', '</strong>').value).toBe(
      '<p><strong>Body</strong></p>',
    );
  });
});

describe('everything the toolbar produces survives the sanitiser', () => {
  it('keeps every block type, class and inline tag', () => {
    const produced = [
      '<h1>H1</h1>',
      '<h2>H2</h2>',
      '<h3>H3</h3>',
      '<h4>H4</h4>',
      '<h5>H5</h5>',
      '<h6>H6</h6>',
      '<blockquote>Quote</blockquote>',
      '<pre>Code block</pre>',
      '<p class="align-center size-lg">Aligned and sized</p>',
      '<div class="align-justify">Wrapped</div>',
      '<ul>\n  <li>One</li>\n</ul>',
      '<ol>\n  <li>One</li>\n</ol>',
      '<hr />',
      '<p><strong>b</strong><em>i</em><u>u</u><s>s</s><code>c</code></p>',
      '<p><a href="https://example.com">link</a></p>',
    ];

    for (const html of produced) {
      const clean = sanitizeHtml(html);
      // Tag names and class values survive verbatim; only the self-closing
      // spelling of <hr> is normalised.
      expect(clean.replace(/\s*\/>/g, '>'), html).toBe(html.replace(/\s*\/>/g, '>'));
    }
  });

  it('is the reason alignment is a class and not a style', () => {
    // The control would look like it worked and then lose the value on save.
    expect(sanitizeHtml('<p style="text-align:center">Body</p>')).toBe('<p>Body</p>');
    expect(sanitizeHtml('<p class="align-center">Body</p>')).toContain('align-center');
  });
});
