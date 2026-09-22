'use client';

import * as React from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Link2,
  Code,
  Minus,
  Quote,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Eraser,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { inputClasses, Select } from '@/components/ui/field';
import {
  applyBlock,
  applyBlockClass,
  applyList,
  clearFormatting,
  insertBlock,
  wrapSelection,
  enclosingBlock,
  ALIGN_CLASSES,
  SIZE_CLASSES,
  type BlockTag,
  type Doc,
  type Edit,
} from '@/lib/cms/rich-text-commands';
import { cn } from '@/lib/utils/cn';

/** Tools that wrap whatever is selected. */
const INLINE_TOOLS = [
  { label: 'Bold', Icon: Bold, before: '<strong>', after: '</strong>' },
  { label: 'Italic', Icon: Italic, before: '<em>', after: '</em>' },
  { label: 'Underline', Icon: Underline, before: '<u>', after: '</u>' },
  { label: 'Strikethrough', Icon: Strikethrough, before: '<s>', after: '</s>' },
  { label: 'Code', Icon: Code, before: '<code>', after: '</code>' },
  { label: 'Link', Icon: Link2, before: '<a href="https://">', after: '</a>' },
] as const;

const ALIGN_TOOLS = [
  { label: 'Align left', Icon: AlignLeft, className: 'align-left' },
  { label: 'Centre', Icon: AlignCenter, className: 'align-center' },
  { label: 'Align right', Icon: AlignRight, className: 'align-right' },
  { label: 'Justify', Icon: AlignJustify, className: 'align-justify' },
] as const;

const BLOCK_OPTIONS: Array<{ value: BlockTag; label: string }> = [
  { value: 'p', label: 'Paragraph' },
  { value: 'h1', label: 'Heading 1' },
  { value: 'h2', label: 'Heading 2' },
  { value: 'h3', label: 'Heading 3' },
  { value: 'h4', label: 'Heading 4' },
  { value: 'h5', label: 'Heading 5' },
  { value: 'h6', label: 'Heading 6' },
  { value: 'blockquote', label: 'Quote' },
  { value: 'pre', label: 'Code block' },
];

const SIZE_OPTIONS = [
  { value: '', label: 'Default size' },
  { value: 'size-sm', label: 'Small' },
  { value: 'size-md', label: 'Medium' },
  { value: 'size-lg', label: 'Large' },
  { value: 'size-xl', label: 'Extra large' },
];

/**
 * HTML editor with formatting controls.
 *
 * Deliberately not a WYSIWYG: everything written here is sanitised
 * server-side before it reaches the public site, and a plain HTML surface
 * keeps that contract obvious rather than hiding it behind a rich editor's
 * output. The toolbar does the typing instead — every control produces tags
 * and classes the sanitiser keeps, so nothing offered here can be silently
 * stripped on save. That is also why alignment and size are classes rather
 * than inline `style`, which is removed on the way in.
 *
 * The commands themselves live in `lib/cms/rich-text-commands`, away from the
 * markup, because what they do to the text is worth reading on its own.
 */
export function RichTextEditor({
  value,
  onChange,
  id,
  rows = 12,
  placeholder,
}: {
  value: string;
  onChange: (next: string) => void;
  id?: string;
  rows?: number;
  placeholder?: string;
}) {
  const ref = React.useRef<HTMLTextAreaElement>(null);
  const [preview, setPreview] = React.useState(false);
  /*
   * Which block the caret is in, so the selects show what is actually there
   * rather than resetting to "Paragraph" after every edit.
   */
  const [caret, setCaret] = React.useState(0);

  const doc = (): Doc => {
    const el = ref.current;
    if (!el) return { value, start: value.length, end: value.length };
    return { value, start: el.selectionStart, end: el.selectionEnd };
  };

  function run(command: (doc: Doc) => Edit) {
    const el = ref.current;
    if (!el) return;
    const edit = command(doc());
    onChange(edit.value);
    setCaret(edit.caret);
    // Restore a sensible caret position after React re-renders.
    window.requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(edit.caret, edit.caret);
    });
  }

  const block = React.useMemo(() => enclosingBlock(value, caret), [value, caret]);
  const currentTag = (block?.tag ?? 'p') as BlockTag;
  const currentClasses = block ? (block.attrs.match(/class="([^"]*)"/)?.[1] ?? '').split(/\s+/) : [];
  const currentSize = SIZE_CLASSES.find((name) => currentClasses.includes(name)) ?? '';

  const toolButton =
    'rounded p-1.5 text-muted transition-colors hover:bg-muted/10 hover:text-content aria-pressed:bg-brand/10 aria-pressed:text-brand';

  return (
    <div className="rounded-lg border border-hairline">
      <div className="flex flex-wrap items-center gap-1 border-b border-hairline bg-muted/[0.03] p-1.5">
        <Select
          aria-label="Block type"
          value={BLOCK_OPTIONS.some((o) => o.value === currentTag) ? currentTag : 'p'}
          onChange={(e) => run((d) => applyBlock(d, e.target.value as BlockTag))}
          className="h-8 w-[8.5rem] text-xs"
        >
          {BLOCK_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>

        <Select
          aria-label="Text size"
          value={currentSize}
          onChange={(e) =>
            run((d) =>
              e.target.value
                ? applyBlockClass(d, SIZE_CLASSES, e.target.value)
                : // "Default" means clear whichever size class is on it.
                  applyBlockClass(d, SIZE_CLASSES, currentSize || 'size-md'),
            )
          }
          className="h-8 w-[8rem] text-xs"
        >
          {SIZE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>

        <span className="mx-0.5 h-5 w-px bg-hairline" aria-hidden="true" />

        {ALIGN_TOOLS.map(({ label, Icon, className }) => (
          <button
            key={label}
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={currentClasses.includes(className)}
            onClick={() => run((d) => applyBlockClass(d, ALIGN_CLASSES, className))}
            className={toolButton}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </button>
        ))}

        <span className="mx-0.5 h-5 w-px bg-hairline" aria-hidden="true" />

        {INLINE_TOOLS.map(({ label, Icon, before, after }) => (
          <button
            key={label}
            type="button"
            title={label}
            aria-label={label}
            onClick={() => run((d) => wrapSelection(d, before, after))}
            className={toolButton}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </button>
        ))}

        <span className="mx-0.5 h-5 w-px bg-hairline" aria-hidden="true" />

        <button
          type="button"
          title="Bullet list"
          aria-label="Bullet list"
          onClick={() => run((d) => applyList(d, 'ul'))}
          className={toolButton}
        >
          <List className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          title="Numbered list"
          aria-label="Numbered list"
          onClick={() => run((d) => applyList(d, 'ol'))}
          className={toolButton}
        >
          <ListOrdered className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          title="Quote"
          aria-label="Quote"
          onClick={() => run((d) => applyBlock(d, 'blockquote'))}
          className={toolButton}
        >
          <Quote className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          title="Divider"
          aria-label="Divider"
          onClick={() => run((d) => insertBlock(d, '\n<hr />\n'))}
          className={toolButton}
        >
          <Minus className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          title="Clear formatting"
          aria-label="Clear formatting"
          onClick={() => run(clearFormatting)}
          className={toolButton}
        >
          <Eraser className="h-4 w-4" aria-hidden="true" />
        </button>

        <Button
          variant="ghost"
          size="sm"
          className="ml-auto"
          onClick={() => setPreview((v) => !v)}
          aria-pressed={preview}
        >
          {preview ? 'Edit' : 'Preview'}
        </Button>
      </div>

      {preview ? (
        <div
          className="prose-cms max-h-96 min-h-[8rem] overflow-y-auto p-4"
          // Preview only — the server sanitises before anything is stored or published.
          dangerouslySetInnerHTML={{ __html: value }}
        />
      ) : (
        <textarea
          id={id}
          ref={ref}
          value={value}
          rows={rows}
          onChange={(e) => {
            onChange(e.target.value);
            setCaret(e.target.selectionStart);
          }}
          onSelect={(e) => setCaret(e.currentTarget.selectionStart)}
          onKeyUp={(e) => setCaret(e.currentTarget.selectionStart)}
          onClick={(e) => setCaret(e.currentTarget.selectionStart)}
          placeholder={placeholder ?? '<p>Write your content…</p>'}
          spellCheck
          className={cn(
            inputClasses,
            'rounded-none border-0 font-mono text-[0.8125rem] shadow-none focus:ring-0',
          )}
        />
      )}
    </div>
  );
}
