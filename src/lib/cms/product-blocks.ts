import { z } from 'zod';
import type { BlockDefinition } from './block-types';

/**
 * Product blocks.
 *
 * The parts a product page is made of — its header, its images, its
 * description, its feature lists, its specification table, the rail of other
 * plans, and the price box in the sidebar. Each is an ordinary CMS block, a
 * Zod schema plus a field list, merged into the same registry pages and the
 * blog use. That is what lets a product page reuse the page builder's editor,
 * design panel, drag-and-drop outline and renderer dispatch instead of growing
 * a third builder beside them.
 *
 * Every one of these is a `singleton`: a product has one title and one price,
 * so they can be reordered, hidden and styled but never stacked twice. Anything
 * an administrator *does* want twice — a CTA, a FAQ, a testimonial rail — is an
 * ordinary page block, and the product surfaces offer all of those too.
 *
 * Nothing here hardcodes content. Each block reads the product being rendered;
 * the fields decide what of it is shown and what it is called.
 */

const bool = (fallback: boolean) => z.coerce.boolean().catch(fallback).default(fallback);
const heading = (fallback: string) => z.string().max(160).catch(fallback).default(fallback);

// ---------------------------------------------------------------------------
// Detail surface
// ---------------------------------------------------------------------------

const productHeaderSchema = z.object({
  showBreadcrumb: bool(true),
  homeLabel: z.string().max(60).catch('Home').default('Home'),
  productsLabel: z.string().max(60).catch('Products').default('Products'),
  showCategory: bool(true),
  showBrand: bool(true),
  showSku: bool(false),
  showShortDescription: bool(true),
  align: z.enum(['left', 'center']).catch('left').default('left'),

  /**
   * The product's image, beside the name rather than under it.
   *
   * Off by default, because the page already has a "Product images" section
   * and two copies of one image is not a layout anyone asked for. Turning it
   * on is the pairing a catalogue page usually wants — the mark on one side,
   * the name and summary on the other — and the images section is then hidden
   * or left to the gallery alone.
   */
  showImage: bool(false),
  imagePosition: z.enum(['left', 'right']).catch('left').default('left'),
  /** The side the image occupies. Square by default, so 250px is 250 × 250. */
  imageWidth: z.string().max(16).catch('250px').default('250px'),
  imageRatio: z.enum(['1/1', '4/3', '3/2', '16/9', 'auto']).catch('1/1').default('1/1'),
  /**
   * `contain` by default: a product mark is usually a logo, and cropping a
   * logo to fill a square is how a brand ends up with its corners cut off.
   */
  imageFit: z.enum(['cover', 'contain', 'fill', 'none']).catch('contain').default('contain'),
  imageBorder: bool(true),
});

const productMediaSchema = z.object({
  showMainImage: bool(true),
  showGallery: bool(true),
  /** 0 keeps every gallery image an administrator attached. */
  galleryLimit: z.coerce.number().int().min(0).max(24).catch(0).default(0),
  /**
   * Sizes come from Products → Design so every product page matches. A single
   * product can still override them here when it genuinely differs.
   */
  overrideSize: bool(false),
  mainMaxWidth: z.string().max(16).catch('').default(''),
  mainRatio: z.enum(['16/9', '4/3', '3/2', '1/1', '21/9', 'auto']).catch('auto').default('auto'),
  mainFit: z.enum(['cover', 'contain', 'fill', 'none']).catch('cover').default('cover'),
  galleryColumns: z.coerce.number().int().min(1).max(6).catch(3).default(3),
});

const productDescriptionSchema = z.object({
  heading: heading(''),
  /** Off falls back to the market's short description when there is no body. */
  fallbackToShort: bool(true),
});

const productFeaturesSchema = z.object({
  showFeatures: bool(true),
  featuresHeading: heading('What is included'),
  showBenefits: bool(true),
  benefitsHeading: heading('Why teams choose it'),
  columns: z.coerce.number().int().min(1).max(3).catch(2).default(2),
  /** 0 lists every feature and benefit the product carries. */
  limit: z.coerce.number().int().min(0).max(40).catch(0).default(0),
  showIcons: bool(true),
});

const productSpecsSchema = z.object({
  heading: heading('Specifications'),
  layout: z.enum(['table', 'list']).catch('table').default('table'),
  showStorage: bool(true),
  showUsers: bool(true),
  showSku: bool(false),
});

const productRelatedSchema = z.object({
  heading: heading('Other plans'),
  source: z.enum(['category', 'brand', 'featured', 'latest']).catch('category').default('category'),
  limit: z.coerce.number().int().min(1).max(12).catch(3).default(3),
  columns: z.coerce.number().int().min(1).max(4).catch(3).default(3),
  showPrice: bool(true),
  showFeatures: bool(false),
});

// ---------------------------------------------------------------------------
// Sidebar surface
// ---------------------------------------------------------------------------

const productPriceBoxSchema = z.object({
  showMonthly: bool(true),
  showAnnual: bool(true),
  showCompareAt: bool(true),
  showCta: bool(true),
  ctaLabel: z.string().max(60).catch('').default(''),
  showSpecs: bool(true),
  specsHeading: heading(''),
  note: z
    .string()
    .max(600)
    .catch('')
    .default(
      'Prices exclude applicable taxes. You receive the same product with local billing and support.',
    ),
  sticky: bool(true),
});

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export const PRODUCT_BLOCKS: Record<string, BlockDefinition> = {
  productHeader: {
    type: 'productHeader',
    label: 'Product header',
    description: 'Breadcrumb, category, brand, the product name and its short description.',
    group: 'Products',
    icon: 'text',
    surfaces: ['productDetail'],
    singleton: true,
    schema: productHeaderSchema,
    fields: [
      {
        kind: 'select',
        name: 'align',
        label: 'Alignment',
        width: 'half',
        options: [
          { label: 'Left', value: 'left' },
          { label: 'Centre', value: 'center' },
        ],
      },
      { kind: 'boolean', name: 'showBreadcrumb', label: 'Show breadcrumb', width: 'half' },
      { kind: 'text', name: 'homeLabel', label: 'Home label', width: 'half' },
      { kind: 'text', name: 'productsLabel', label: 'Products label', width: 'half' },
      { kind: 'boolean', name: 'showCategory', label: 'Show category', width: 'half' },
      { kind: 'boolean', name: 'showBrand', label: 'Show brand', width: 'half' },
      { kind: 'boolean', name: 'showSku', label: 'Show SKU', width: 'half' },
      {
        kind: 'boolean',
        name: 'showShortDescription',
        label: 'Show short description',
        width: 'half',
      },
      {
        kind: 'boolean',
        name: 'showImage',
        label: 'Show the product image beside the text',
        width: 'half',
        help: 'Hide the separate “Product images” section when you turn this on, or it appears twice.',
      },
      {
        kind: 'select',
        name: 'imagePosition',
        label: 'Image side',
        width: 'half',
        options: [
          { label: 'Left', value: 'left' },
          { label: 'Right', value: 'right' },
        ],
      },
      {
        kind: 'text',
        name: 'imageWidth',
        label: 'Image size',
        width: 'half',
        placeholder: '250px',
        help: 'The width. With a square ratio, 250px means 250 × 250.',
      },
      {
        kind: 'select',
        name: 'imageRatio',
        label: 'Image ratio',
        width: 'half',
        options: [
          { label: 'Square (1:1)', value: '1/1' },
          { label: 'Landscape (4:3)', value: '4/3' },
          { label: 'Landscape (3:2)', value: '3/2' },
          { label: 'Widescreen (16:9)', value: '16/9' },
          { label: 'Original', value: 'auto' },
        ],
      },
      {
        kind: 'select',
        name: 'imageFit',
        label: 'Image fit',
        width: 'half',
        options: [
          { label: 'Contain — the whole image, letterboxed', value: 'contain' },
          { label: 'Cover — fills the box, crops the edges', value: 'cover' },
          { label: 'Fill — stretches to the box', value: 'fill' },
          { label: 'None', value: 'none' },
        ],
      },
      { kind: 'boolean', name: 'imageBorder', label: 'Draw a border round it', width: 'half' },
    ],
  },

  productMedia: {
    type: 'productMedia',
    label: 'Product images',
    description: 'The main image and the gallery beneath it.',
    group: 'Products',
    icon: 'image',
    surfaces: ['productDetail'],
    singleton: true,
    schema: productMediaSchema,
    fields: [
      { kind: 'boolean', name: 'showMainImage', label: 'Show the main image', width: 'half' },
      { kind: 'boolean', name: 'showGallery', label: 'Show the gallery', width: 'half' },
      {
        kind: 'number',
        name: 'galleryLimit',
        label: 'Maximum gallery images',
        width: 'half',
        min: 0,
        max: 24,
        help: '0 shows every image attached to the product.',
      },
      {
        kind: 'boolean',
        name: 'overrideSize',
        label: 'Use custom sizes for this product',
        width: 'half',
        help: 'Off follows Products → Design, so every product page matches.',
      },
      {
        kind: 'text',
        name: 'mainMaxWidth',
        label: 'Main image width',
        width: 'half',
        placeholder: 'e.g. 720px or 100%',
      },
      {
        kind: 'select',
        name: 'mainRatio',
        label: 'Main image ratio',
        width: 'half',
        options: [
          { label: 'Original', value: 'auto' },
          { label: 'Widescreen (16:9)', value: '16/9' },
          { label: 'Landscape (4:3)', value: '4/3' },
          { label: 'Landscape (3:2)', value: '3/2' },
          { label: 'Square (1:1)', value: '1/1' },
          { label: 'Ultrawide (21:9)', value: '21/9' },
        ],
      },
      {
        kind: 'select',
        name: 'mainFit',
        label: 'Main image fit',
        width: 'half',
        options: [
          { label: 'Cover', value: 'cover' },
          { label: 'Contain', value: 'contain' },
          { label: 'Fill', value: 'fill' },
          { label: 'None', value: 'none' },
        ],
      },
      {
        kind: 'number',
        name: 'galleryColumns',
        label: 'Gallery columns',
        width: 'half',
        min: 1,
        max: 6,
      },
    ],
  },

  productDescription: {
    type: 'productDescription',
    label: 'Product description',
    description: "The product's long description, as written on the product.",
    group: 'Products',
    icon: 'file',
    surfaces: ['productDetail'],
    singleton: true,
    schema: productDescriptionSchema,
    fields: [
      { kind: 'text', name: 'heading', label: 'Heading', placeholder: 'No heading' },
      {
        kind: 'boolean',
        name: 'fallbackToShort',
        label: 'Use the short description when there is no body',
        width: 'half',
      },
    ],
  },

  productFeatures: {
    type: 'productFeatures',
    label: 'Features & benefits',
    description: "Everything the product includes, and why teams choose it.",
    group: 'Products',
    icon: 'check',
    surfaces: ['productDetail'],
    singleton: true,
    schema: productFeaturesSchema,
    fields: [
      { kind: 'boolean', name: 'showFeatures', label: 'Show features', width: 'half' },
      { kind: 'text', name: 'featuresHeading', label: 'Features heading', width: 'half' },
      { kind: 'boolean', name: 'showBenefits', label: 'Show benefits', width: 'half' },
      { kind: 'text', name: 'benefitsHeading', label: 'Benefits heading', width: 'half' },
      { kind: 'number', name: 'columns', label: 'Columns', width: 'half', min: 1, max: 3 },
      {
        kind: 'number',
        name: 'limit',
        label: 'Maximum items',
        width: 'half',
        min: 0,
        max: 40,
        help: '0 lists every feature and benefit.',
      },
      { kind: 'boolean', name: 'showIcons', label: 'Show tick icons', width: 'half' },
    ],
  },

  productSpecs: {
    type: 'productSpecs',
    label: 'Specifications',
    description: "The product's specification table, plus storage and seat counts.",
    group: 'Products',
    icon: 'table',
    surfaces: ['productDetail', 'productSidebar'],
    singleton: true,
    schema: productSpecsSchema,
    fields: [
      { kind: 'text', name: 'heading', label: 'Heading', width: 'half' },
      {
        kind: 'select',
        name: 'layout',
        label: 'Layout',
        width: 'half',
        options: [
          { label: 'Table', value: 'table' },
          { label: 'List', value: 'list' },
        ],
      },
      { kind: 'boolean', name: 'showStorage', label: 'Show storage row', width: 'half' },
      { kind: 'boolean', name: 'showUsers', label: 'Show users row', width: 'half' },
      { kind: 'boolean', name: 'showSku', label: 'Show SKU row', width: 'half' },
    ],
  },

  productRelated: {
    type: 'productRelated',
    label: 'Other plans',
    description: 'A rail of related products, as cards.',
    group: 'Products',
    icon: 'package',
    surfaces: ['productDetail'],
    singleton: true,
    schema: productRelatedSchema,
    fields: [
      { kind: 'text', name: 'heading', label: 'Heading' },
      {
        kind: 'select',
        name: 'source',
        label: 'Which products',
        width: 'half',
        options: [
          { label: 'Same category', value: 'category' },
          { label: 'Same brand', value: 'brand' },
          { label: 'Featured', value: 'featured' },
          { label: 'Latest', value: 'latest' },
        ],
      },
      { kind: 'number', name: 'limit', label: 'How many', width: 'half', min: 1, max: 12 },
      { kind: 'number', name: 'columns', label: 'Columns', width: 'half', min: 1, max: 4 },
      { kind: 'boolean', name: 'showPrice', label: 'Show pricing', width: 'half' },
      { kind: 'boolean', name: 'showFeatures', label: 'Show feature list', width: 'half' },
    ],
  },

  productPriceBox: {
    type: 'productPriceBox',
    label: 'Price box',
    description: 'Price, call to action, specifications and the small print.',
    group: 'Products',
    icon: 'tag',
    surfaces: ['productSidebar'],
    singleton: true,
    schema: productPriceBoxSchema,
    fields: [
      { kind: 'boolean', name: 'showMonthly', label: 'Show the monthly price', width: 'half' },
      { kind: 'boolean', name: 'showAnnual', label: 'Show the annual price', width: 'half' },
      { kind: 'boolean', name: 'showCompareAt', label: 'Show the was-price', width: 'half' },
      { kind: 'boolean', name: 'showCta', label: 'Show the button', width: 'half' },
      {
        kind: 'text',
        name: 'ctaLabel',
        label: 'Button label',
        width: 'half',
        placeholder: "The product's own label",
      },
      { kind: 'boolean', name: 'showSpecs', label: 'Show specifications', width: 'half' },
      { kind: 'text', name: 'specsHeading', label: 'Specifications heading', width: 'half' },
      {
        kind: 'boolean',
        name: 'sticky',
        label: 'Stick to the top while scrolling',
        width: 'half',
        help: 'Follows Products → Design when that is switched off.',
      },
      { kind: 'textarea', name: 'note', label: 'Small print', rows: 3 },
    ],
  },
};

export type ProductHeaderContent = z.infer<typeof productHeaderSchema>;
export type ProductMediaContent = z.infer<typeof productMediaSchema>;
export type ProductDescriptionContent = z.infer<typeof productDescriptionSchema>;
export type ProductFeaturesContent = z.infer<typeof productFeaturesSchema>;
export type ProductSpecsContent = z.infer<typeof productSpecsSchema>;
export type ProductRelatedContent = z.infer<typeof productRelatedSchema>;
export type ProductPriceBoxContent = z.infer<typeof productPriceBoxSchema>;
