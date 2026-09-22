import { z } from 'zod';
import type { BlockDefinition } from './block-types';

/**
 * Footer blocks.
 *
 * The footer used to be one component with a fixed arrangement: the brand
 * block, then the menus, then a bottom row. Everything an administrator could
 * change about it was a switch on a settings screen, and anything the
 * arrangement did not already do was not possible at all.
 *
 * It is now built the way a page is. These are its own parts — the brand
 * block, the menu columns, the bottom row, the newsletter — as ordinary CMS
 * blocks, merged into the same registry, so the footer reuses the page
 * builder's editor, design panel, drag-and-drop outline and renderer rather
 * than growing a fourth one beside them.
 *
 * **Rows are sections and columns are inside them.** A row is a section in the
 * list; `footerColumns` is the block that divides one into columns of whatever
 * an administrator puts in them. Every page block is offered here too, so a
 * row can just as easily be a rich text block, an image or a call to action.
 *
 * Nothing here hardcodes content. Each block reads the market being rendered —
 * its contact details, its menus, its copyright line — and the fields decide
 * what of that is shown and what it is called.
 */

const bool = (fallback: boolean) => z.coerce.boolean().catch(fallback).default(fallback);
const text = (max: number) => z.string().max(max).catch('').default('');

// --- footerBrand -----------------------------------------------------------
const footerBrandSchema = z.object({
  showLogo: bool(true),
  showSiteName: bool(true),
  logoHeight: text(16),
  description: text(600),
  showDescription: bool(true),
  showEmail: bool(true),
  showPhone: bool(true),
  showAddress: bool(true),
  /** Blank uses the market's own details, which is almost always what is wanted. */
  emailOverride: text(200),
  phoneOverride: text(40),
  addressOverride: text(300),
});

// --- footerMenus -----------------------------------------------------------
const footerMenusSchema = z.object({
  /** 0 means "as many columns as there are menus", which is what it did. */
  columns: z.coerce.number().int().min(0).max(6).catch(0).default(0),
  showHeadings: bool(true),
  /**
   * Blank shows every menu with a footer location, in the order they were
   * created — the behaviour this block replaces. Naming slugs picks and orders
   * them instead.
   */
  menuSlugs: z.array(z.string().max(120)).catch([]).default([]),
});

// --- footerColumns ---------------------------------------------------------
/**
 * What a column holds.
 *
 * `content` is the ordinary one — a heading over some text, a menu, or a few
 * hand-typed links. The other two put the blocks a footer's top row usually
 * carries *into* that row: a footer whose brand, its menus and its sign-up
 * form sit side by side is the common arrangement, and stacking them as three
 * rows is not it.
 */
const FOOTER_COLUMN_KINDS = ['content', 'brand', 'newsletter'] as const;

const footerColumnSchema = z.object({
  kind: z.enum(FOOTER_COLUMN_KINDS).catch('content').default('content'),
  /**
   * This column's share of the row, as one grid track: `1.4fr` for a column
   * half again as wide as the others, or a length like `20rem` to pin it.
   * Blank shares the row equally, which is what most columns want.
   */
  width: text(24),
  heading: text(120),
  body: text(1200),
  /** A footer menu to list under the heading, by slug. */
  menuSlug: text(120),
  /** Plain links, for a column that is not worth a menu of its own. */
  links: z
    .array(z.object({ label: text(120), url: text(500) }))
    .catch([])
    .default([]),

  // --- a brand column ---
  showLogo: bool(true),
  showDescription: bool(true),
  showSocials: bool(true),
  showContact: bool(false),

  // --- a newsletter column ---
  /** Blank uses the form chosen in Settings → Footer. */
  formSlug: text(120),
  /**
   * The form on its own light panel.
   *
   * On a dark footer it needs one: a form carries the colours chosen for it in
   * Forms → Design, and those were chosen against a page background. On a
   * light footer the panel is the thing that looks wrong, so it comes off.
   */
  formPanel: bool(true),
});

const footerColumnsSchema = z.object({
  columns: z.coerce.number().int().min(1).max(6).catch(4).default(4),
  showHeadings: bool(true),
  items: z.array(footerColumnSchema).max(12).catch([]).default([]),
});

// --- footerBottom ----------------------------------------------------------
const footerBottomSchema = z.object({
  showDivider: bool(true),
  showCopyright: bool(true),
  /** Blank uses the market's copyright line. `{year}` is replaced. */
  copyrightOverride: text(300),
  showLegal: bool(true),
  showSocials: bool(true),
  align: z.enum(['between', 'center', 'left']).catch('between').default('between'),
});

// --- footerNewsletter ------------------------------------------------------
const footerNewsletterSchema = z.object({
  heading: text(160),
  description: text(600),
  /** Blank uses the form chosen in Settings → Footer. */
  formSlug: text(120),
  layout: z.enum(['split', 'stacked']).catch('split').default('split'),
});

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export const FOOTER_BLOCKS: Record<string, BlockDefinition> = {
  footerBrand: {
    type: 'footerBrand',
    label: 'Footer brand block',
    description: 'Logo, the line under it, and the market’s contact details.',
    group: 'Footer',
    icon: 'building',
    surfaces: ['footer'],
    schema: footerBrandSchema,
    fields: [
      { kind: 'boolean', name: 'showLogo', label: 'Show the logo', width: 'half' },
      {
        kind: 'boolean',
        name: 'showSiteName',
        label: 'Show the site name',
        width: 'half',
        help: 'Used when there is no logo, or the logo is switched off.',
      },
      {
        kind: 'text',
        name: 'logoHeight',
        label: 'Logo height',
        width: 'half',
        placeholder: '2rem',
      },
      { kind: 'boolean', name: 'showDescription', label: 'Show a description', width: 'half' },
      {
        kind: 'textarea',
        name: 'description',
        label: 'Description',
        rows: 3,
        help: 'Leave empty to use the one from this market’s settings.',
      },
      { kind: 'boolean', name: 'showEmail', label: 'Show the email address', width: 'half' },
      { kind: 'boolean', name: 'showPhone', label: 'Show the phone number', width: 'half' },
      { kind: 'boolean', name: 'showAddress', label: 'Show the address', width: 'half' },
      {
        kind: 'text',
        name: 'emailOverride',
        label: 'Email',
        width: 'half',
        placeholder: 'This market’s own',
      },
      {
        kind: 'text',
        name: 'phoneOverride',
        label: 'Phone',
        width: 'half',
        placeholder: 'This market’s own',
      },
      {
        kind: 'text',
        name: 'addressOverride',
        label: 'Address',
        placeholder: 'This market’s own',
      },
    ],
  },

  footerMenus: {
    type: 'footerMenus',
    label: 'Footer menus',
    description: 'Every menu with a footer location, one per column.',
    group: 'Footer',
    icon: 'list',
    surfaces: ['footer'],
    schema: footerMenusSchema,
    fields: [
      {
        kind: 'number',
        name: 'columns',
        label: 'Columns',
        width: 'half',
        min: 0,
        max: 6,
        help: '0 gives one column per menu.',
      },
      { kind: 'boolean', name: 'showHeadings', label: 'Show menu names', width: 'half' },
      {
        kind: 'repeater',
        name: 'menuSlugs',
        label: 'Menus',
        itemLabel: 'Menu',
        titleField: 'value',
        help: 'Leave empty for every footer menu, in the order they were created.',
        fields: [{ kind: 'text', name: 'value', label: 'Menu slug' }],
      },
    ],
  },

  footerColumns: {
    type: 'footerColumns',
    label: 'Footer columns',
    description: 'Divide a row into columns of text, links or a menu.',
    group: 'Footer',
    icon: 'grid',
    surfaces: ['footer'],
    schema: footerColumnsSchema,
    fields: [
      { kind: 'number', name: 'columns', label: 'Columns', width: 'half', min: 1, max: 6 },
      { kind: 'boolean', name: 'showHeadings', label: 'Show headings', width: 'half' },
      {
        kind: 'repeater',
        name: 'items',
        label: 'Columns',
        itemLabel: 'Column',
        titleField: 'heading',
        fields: [
          {
            kind: 'select',
            name: 'kind',
            label: 'This column holds',
            width: 'half',
            defaultValue: 'content',
            options: [
              { label: 'Text, links or a menu', value: 'content' },
              { label: 'The brand block', value: 'brand' },
              { label: 'The sign-up form', value: 'newsletter' },
            ],
          },
          {
            kind: 'text',
            name: 'width',
            label: 'Width',
            width: 'half',
            placeholder: 'Equal share',
            help: 'One grid track — 1.4fr for half again as wide, or 20rem to pin it.',
          },
          {
            kind: 'text',
            name: 'heading',
            label: 'Heading',
            showWhen: { field: 'kind', equals: ['content', 'newsletter'] },
          },
          {
            kind: 'textarea',
            name: 'body',
            label: 'Text',
            rows: 3,
            showWhen: { field: 'kind', equals: ['content', 'newsletter', 'brand'] },
            help: 'On a brand column this replaces the market’s own description.',
          },
          {
            kind: 'text',
            name: 'menuSlug',
            label: 'Menu slug',
            help: 'Lists that menu under the heading.',
            showWhen: { field: 'kind', equals: ['content'] },
          },
          {
            kind: 'repeater',
            name: 'links',
            label: 'Links',
            itemLabel: 'Link',
            titleField: 'label',
            showWhen: { field: 'kind', equals: ['content'] },
            fields: [
              { kind: 'text', name: 'label', label: 'Label', width: 'half' },
              { kind: 'url', name: 'url', label: 'Link', width: 'half' },
            ],
          },

          {
            kind: 'boolean',
            name: 'showLogo',
            label: 'Show the logo',
            width: 'half',
            defaultValue: true,
            showWhen: { field: 'kind', equals: ['brand'] },
          },
          {
            kind: 'boolean',
            name: 'showDescription',
            label: 'Show the description',
            width: 'half',
            defaultValue: true,
            showWhen: { field: 'kind', equals: ['brand'] },
          },
          {
            kind: 'boolean',
            name: 'showSocials',
            label: 'Show the social icons',
            width: 'half',
            defaultValue: true,
            showWhen: { field: 'kind', equals: ['brand'] },
          },
          {
            kind: 'boolean',
            name: 'showContact',
            label: 'Show the contact details',
            width: 'half',
            defaultValue: false,
            help: 'Email, phone and address, from this market.',
            showWhen: { field: 'kind', equals: ['brand'] },
          },

          {
            kind: 'form',
            name: 'formSlug',
            label: 'Form',
            width: 'half',
            showWhen: { field: 'kind', equals: ['newsletter'] },
          },
          {
            kind: 'boolean',
            name: 'formPanel',
            label: 'Form on a light panel',
            width: 'half',
            defaultValue: true,
            help: 'Needed on a dark footer; switch it off on a light one.',
            showWhen: { field: 'kind', equals: ['newsletter'] },
          },
        ],
      },
    ],
  },

  footerNewsletter: {
    type: 'footerNewsletter',
    label: 'Footer newsletter',
    description: 'A sign-up form, from Forms.',
    group: 'Footer',
    icon: 'mail',
    surfaces: ['footer'],
    schema: footerNewsletterSchema,
    fields: [
      { kind: 'text', name: 'heading', label: 'Heading' },
      { kind: 'textarea', name: 'description', label: 'Description', rows: 2 },
      { kind: 'form', name: 'formSlug', label: 'Form', width: 'half' },
      {
        kind: 'select',
        name: 'layout',
        label: 'Layout',
        width: 'half',
        options: [
          { label: 'Copy beside the form', value: 'split' },
          { label: 'Copy above the form', value: 'stacked' },
        ],
      },
    ],
  },

  footerBottom: {
    type: 'footerBottom',
    label: 'Footer bottom row',
    description: 'Copyright, the legal menu and the social icons.',
    group: 'Footer',
    icon: 'layout',
    surfaces: ['footer'],
    singleton: true,
    schema: footerBottomSchema,
    fields: [
      { kind: 'boolean', name: 'showDivider', label: 'Line above the row', width: 'half' },
      { kind: 'boolean', name: 'showCopyright', label: 'Copyright line', width: 'half' },
      {
        kind: 'text',
        name: 'copyrightOverride',
        label: 'Copyright',
        placeholder: 'This market’s own',
        help: '{year} is replaced with the current year.',
      },
      { kind: 'boolean', name: 'showLegal', label: 'Legal menu', width: 'half' },
      { kind: 'boolean', name: 'showSocials', label: 'Social icons', width: 'half' },
      {
        kind: 'select',
        name: 'align',
        label: 'Arrangement',
        width: 'half',
        options: [
          { label: 'Ends apart', value: 'between' },
          { label: 'Centred', value: 'center' },
          { label: 'All to the left', value: 'left' },
        ],
      },
    ],
  },
};

export type FooterBrandContent = z.infer<typeof footerBrandSchema>;
export type FooterMenusContent = z.infer<typeof footerMenusSchema>;
export type FooterColumnsContent = z.infer<typeof footerColumnsSchema>;
export type FooterBottomContent = z.infer<typeof footerBottomSchema>;
export type FooterNewsletterContent = z.infer<typeof footerNewsletterSchema>;
