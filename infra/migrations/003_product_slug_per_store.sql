ALTER TABLE product
DROP CONSTRAINT IF EXISTS product_slug_key;

CREATE UNIQUE INDEX IF NOT EXISTS product_store_slug_unique ON product (store_id, slug);
