import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { BLOCKS, parseBlockContent } from '@/lib/cms/blocks';
import { rowLabel, sharedRowLabel, withProductName } from '@/lib/cms/product-labels';
import { productInputSchema } from '@/lib/validation/product';

/**
 * What a product's page calls things.
 *
 * A product can give its storage and users rows headings of its own, blank
 * keeping "Storage" and "Users"; and the features section has one heading,
 * "Top benefits of" the product, over both of its lists.
 */

const read = (path: string) => readFileSync(path, 'utf8');

describe('storage and users headings', () => {
  it('keep the built-in heading when a product gives none', () => {
    expect(rowLabel(null, 'Storage')).toBe('Storage');
    expect(rowLabel('', 'Storage')).toBe('Storage');
    expect(rowLabel('   ', 'Users')).toBe('Users');
    expect(rowLabel('Cloud storage', 'Storage')).toBe('Cloud storage');
  });

  it('name a row several products share only as all of them do', () => {
    expect(sharedRowLabel(['Seats', 'Seats'], 'Users')).toBe('Seats');
    expect(sharedRowLabel(['Seats', null], 'Users')).toBe('Users');
    expect(sharedRowLabel(['Seats', 'Licences'], 'Users')).toBe('Users');
    expect(sharedRowLabel([null, ''], 'Users')).toBe('Users');
    expect(sharedRowLabel([], 'Users')).toBe('Users');
  });

  it('are saved with the product, and blank saves nothing', () => {
    const product = { name: 'Plan', slug: '' };
    const parsed = productInputSchema.parse({
      ...product,
      storageLabel: '  Cloud storage ',
      usersLabel: '',
    });
    expect(parsed.storageLabel).toBe('Cloud storage');
    expect(parsed.usersLabel).toBeNull();
    const tooLong = productInputSchema.safeParse({ ...product, storageLabel: 'x'.repeat(61) });
    expect(tooLong.success).toBe(false);
  });

  it('sit on the product form, the built-in heading as placeholder', () => {
    const form = read('src/components/admin/products/product-form.tsx');
    expect(form).toMatch(/id="storageLabel"[\s\S]{0,120}placeholder="Storage"/);
    expect(form).toMatch(/id="usersLabel"[\s\S]{0,120}placeholder="Users"/);
    expect(form).toContain("'storageLabel',");
    expect(form).toContain("'usersLabel',");

    const loader = read('src/app/admin/products/[id]/page.tsx');
    expect(loader).toContain("storageLabel: product.storageLabel ?? ''");
    expect(loader).toContain("usersLabel: product.usersLabel ?? ''");
  });

  it('are stored and reach the public product', () => {
    const action = read('src/lib/actions/products.ts');
    expect(action).toContain("storageLabel: formData.get('storageLabel')");
    expect(action).toContain("usersLabel: formData.get('usersLabel')");
    expect(action).toContain('storageLabel: input.storageLabel ?');
    expect(action).toContain('usersLabel: input.usersLabel ?');

    const service = read('src/lib/services/products.ts');
    expect(service).toContain('storageLabel: product.storageLabel');
    expect(service).toContain('usersLabel: product.usersLabel');

    const migration = read('prisma/migrations/20260925120000_product_spec_labels/migration.sql');
    expect(migration).toContain('ADD COLUMN "storageLabel" TEXT');
    expect(migration).toContain('ADD COLUMN "usersLabel" TEXT');
  });

  it('name the rows wherever one product shows them', () => {
    const detail = read('src/components/cms/blocks/product-detail-blocks.tsx');
    expect(detail).toContain("rowLabel(product.storageLabel, 'Storage')");
    expect(detail).toContain("rowLabel(product.usersLabel, 'Users')");

    const table = read('src/components/cms/blocks/product-blocks.tsx');
    expect(table).toContain("sharedRowLabel(products.map((p) => p.storageLabel), 'Storage')");
    expect(table).toContain("sharedRowLabel(products.map((p) => p.usersLabel), 'Users')");
    // A stacked card shows one product, so it takes that product's heading.
    expect(table).toContain('row.labelFor?.(product) ?? row.label');
  });
});

describe('the features section heading', () => {
  it('is "Top benefits of" the product, over both lists', () => {
    const content = parseBlockContent<Record<string, unknown>>('productFeatures', {});
    expect(content.heading).toBe('Top benefits of {product}');
    expect(content.featuresHeading).toBe('');
    expect(content.benefitsHeading).toBe('');
    expect(withProductName(String(content.heading), 'Dropbox Business')).toBe(
      'Top benefits of Dropbox Business',
    );
  });

  it('reaches sections saved before it existed', () => {
    // A stored section carries every value it was saved with, and no heading.
    const stored = parseBlockContent<Record<string, unknown>>('productFeatures', {
      showFeatures: true,
      featuresHeading: 'Key features',
      showBenefits: true,
      benefitsHeading: '',
      columns: 2,
      limit: 0,
      showIcons: true,
    });
    expect(stored.heading).toBe('Top benefits of {product}');
    expect(stored.featuresHeading).toBe('Key features');
  });

  it('puts the product name in literally, wherever it is asked for', () => {
    expect(withProductName('Top benefits of {product}', 'A $& B')).toBe('Top benefits of A $& B');
    expect(withProductName('{product}: why {product}', 'X')).toBe('X: why X');
    expect(withProductName('Why teams choose it', 'X')).toBe('Why teams choose it');
  });

  it('is edited on the section, which says what {product} does', () => {
    const field = BLOCKS.productFeatures?.fields.find((f) => f.name === 'heading') as
      | { help?: string }
      | undefined;
    expect(field?.help).toContain('{product}');

    const detail = read('src/components/cms/blocks/product-detail-blocks.tsx');
    expect(detail).toContain('withProductName(text, product.name)');
  });

  it('clears only the old built-in sub-headings from stored sections', () => {
    const sql = read('prisma/migrations/20260925130000_product_benefits_heading/migration.sql');
    expect(sql).toContain(`"content"->>'featuresHeading' = 'What is included'`);
    expect(sql).toContain(`"content"->>'benefitsHeading' = 'Why teams choose it'`);
    expect(sql).toContain(`"blockType" = 'productFeatures'`);
    expect(sql).not.toMatch(/\b(DELETE|DROP|TRUNCATE)\b/i);
  });
});
