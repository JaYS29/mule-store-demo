ALTER TABLE store
ADD COLUMN IF NOT EXISTS slug TEXT;

UPDATE store
SET slug = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'))
WHERE slug IS NULL;

UPDATE store
SET slug = trim(both '-' from slug)
WHERE slug IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS store_slug_unique ON store (slug);

ALTER TABLE store
ALTER COLUMN slug SET NOT NULL;
