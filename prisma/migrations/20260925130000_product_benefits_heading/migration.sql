-- The features section of a product page now has one heading over both of its
-- lists, "Top benefits of {product}", which the section's schema supplies to
-- every row that has not set one.
--
-- The two lists' own headings are optional sub-headings from here on. Rows
-- still carrying the old built-in ones lose them, so a page does not stack
-- three headings where it had two. A heading somebody wrote themselves is
-- kept.
UPDATE "ProductSection"
SET "content" = "content" || '{"featuresHeading": ""}'::jsonb
WHERE "blockType" = 'productFeatures'
  AND "content"->>'featuresHeading' = 'What is included';

UPDATE "ProductSection"
SET "content" = "content" || '{"benefitsHeading": ""}'::jsonb
WHERE "blockType" = 'productFeatures'
  AND "content"->>'benefitsHeading' = 'Why teams choose it';
