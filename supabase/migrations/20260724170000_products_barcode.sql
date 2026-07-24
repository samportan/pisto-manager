-- Barcode support for business products (unique per org among active rows)

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS barcode text;

COMMENT ON COLUMN products.barcode IS 'Product barcode (EAN/UPC/custom). Distinct from internal sku.';

CREATE UNIQUE INDEX IF NOT EXISTS products_org_barcode_unique
  ON products (organization_id, barcode)
  WHERE barcode IS NOT NULL AND deleted_at IS NULL;
