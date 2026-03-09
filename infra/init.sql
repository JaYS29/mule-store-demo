CREATE TABLE IF NOT EXISTS app_user (
  id SERIAL PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  encrypted_email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  phone TEXT NULL,
  email_verified_at TIMESTAMP NULL,
  city TEXT NOT NULL,
  country TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS store (
  id SERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  hero_title TEXT NOT NULL,
  hero_subtitle TEXT NOT NULL,
  hero_image TEXT NOT NULL
);

ALTER TABLE store
  ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES app_user(id) ON DELETE SET NULL;

ALTER TABLE store
  ADD COLUMN IF NOT EXISTS slug TEXT;

CREATE TABLE IF NOT EXISTS product (
  id SERIAL PRIMARY KEY,
  store_id INTEGER NOT NULL REFERENCES store(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS product_store_slug_unique ON product (store_id, slug);

CREATE TABLE IF NOT EXISTS variant (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES product(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT NOT NULL,
  price_cents INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS section (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS section_product (
  section_id INTEGER NOT NULL REFERENCES section(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES product(id) ON DELETE CASCADE,
  PRIMARY KEY (section_id, product_id)
);

CREATE TABLE IF NOT EXISTS store_follower (
  store_id INTEGER NOT NULL REFERENCES store(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  followed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (store_id, user_id)
);

CREATE TABLE IF NOT EXISTS password_reset (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_verification (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  verified_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "order" (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  total_amount INTEGER NOT NULL,
  currency TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_item (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES "order"(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES product(id) ON DELETE CASCADE,
  variant_id INTEGER NOT NULL REFERENCES variant(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  unit_price INTEGER NOT NULL,
  line_total INTEGER NOT NULL,
  product_name TEXT NOT NULL,
  variant_name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO store (slug, name, hero_title, hero_subtitle, hero_image)
VALUES
  ('sticker-demo-store', 'Sticker Demo Store', 'Easily sell online', 'A demo storefront inspired by Sticker Mule.', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1600&q=80');

INSERT INTO app_user (id, first_name, last_name, email, encrypted_email, password_hash, phone, city, country)
VALUES
  (1, 'Ava', 'Stone', 'ava.stone@example.com', 'defdf28864b067ad29dc91fc93d836ec0bed6c415b71b0e4901561887f83618b', '3f8bd072c36ba06850b92a1b12d7ee6c11be50583484f953273f074bc7c735a3', NULL, 'New York', 'USA'),
  (2, 'Liam', 'Carter', 'liam.carter@example.com', '0f35a2b9d19f4906048687c144835fd9fcb209b6c3d19dab56fb1df58485aeb5', '3f8bd072c36ba06850b92a1b12d7ee6c11be50583484f953273f074bc7c735a3', NULL, 'Austin', 'USA'),
  (3, 'Mia', 'Brooks', 'mia.brooks@example.com', 'bb96334a324ae403d455903ef5a09f236f4bc599d1f77ce6d202343249c1c570', '3f8bd072c36ba06850b92a1b12d7ee6c11be50583484f953273f074bc7c735a3', NULL, 'Toronto', 'Canada'),
  (4, 'Noah', 'Reed', 'noah.reed@example.com', '4ef45279efcabe53483569c50bac706813b44bd8383da0aa8b982c5de35a87e8', '3f8bd072c36ba06850b92a1b12d7ee6c11be50583484f953273f074bc7c735a3', NULL, 'London', 'UK'),
  (5, 'Emma', 'Hayes', 'emma.hayes@example.com', 'd1e2333e450df89e0aa307fdec918c166921fd35c72795e52075721d9ed9746d', '3f8bd072c36ba06850b92a1b12d7ee6c11be50583484f953273f074bc7c735a3', NULL, 'Sydney', 'Australia'),
  (6, 'Lucas', 'Nguyen', 'lucas.nguyen@example.com', '895aacb80d2276268638b7ba70e76df2cb94932c4147d5fb9de4da8c32f358a0', '3f8bd072c36ba06850b92a1b12d7ee6c11be50583484f953273f074bc7c735a3', NULL, 'Seattle', 'USA'),
  (7, 'Sofia', 'Patel', 'sofia.patel@example.com', 'a1d176db2ec70f13cc9e19b00c9b0691650641ea3b290e56e1370a9342e15e77', '3f8bd072c36ba06850b92a1b12d7ee6c11be50583484f953273f074bc7c735a3', NULL, 'San Diego', 'USA'),
  (8, 'Ethan', 'Kim', 'ethan.kim@example.com', '2ae136ab7480a19091b4ac077bbb3cfe4b813f1373e72bd9e5d277f447cd5c6a', '3f8bd072c36ba06850b92a1b12d7ee6c11be50583484f953273f074bc7c735a3', NULL, 'Chicago', 'USA'),
  (9, 'Isabella', 'Rossi', 'isabella.rossi@example.com', '4ca44e5e68d4592545af441b8a3e405407c83686010fe2b8ddf6a89cd957af83', '3f8bd072c36ba06850b92a1b12d7ee6c11be50583484f953273f074bc7c735a3', NULL, 'Milan', 'Italy'),
  (10, 'Mason', 'Wright', 'mason.wright@example.com', 'fc9b4cf8d094f98c169879a27fc65dc1ab5b564d35998a200d467bd1acbae074', '3f8bd072c36ba06850b92a1b12d7ee6c11be50583484f953273f074bc7c735a3', NULL, 'Denver', 'USA'),
  (11, 'Charlotte', 'King', 'charlotte.king@example.com', '6bbc74d055c05bb51c7f766cc8b72d26d383a49f4e5a9f25a484c9fd73163e15', '3f8bd072c36ba06850b92a1b12d7ee6c11be50583484f953273f074bc7c735a3', NULL, 'Madrid', 'Spain'),
  (12, 'Benjamin', 'Lee', 'benjamin.lee@example.com', 'aa4d8a6013fb0d3088691a7cbd441fa5afcbe09a8333baebe6aab5dff7fe3ae2', '3f8bd072c36ba06850b92a1b12d7ee6c11be50583484f953273f074bc7c735a3', NULL, 'San Jose', 'USA'),
  (13, 'Amelia', 'Torres', 'amelia.torres@example.com', '5e6f2008673443ce1157417a311325600574834a015db3d1cf86151e71557e9f', '3f8bd072c36ba06850b92a1b12d7ee6c11be50583484f953273f074bc7c735a3', NULL, 'Lisbon', 'Portugal'),
  (14, 'James', 'Campbell', 'james.campbell@example.com', 'db6c65b304eba139a48750a1aaadf82de97d26bed3057dc213936b95ac1c2f54', '3f8bd072c36ba06850b92a1b12d7ee6c11be50583484f953273f074bc7c735a3', NULL, 'Dublin', 'Ireland'),
  (15, 'Harper', 'Scott', 'harper.scott@example.com', '957fcfb9fecc5bd1fea878c68afb775edb8b884a22aca5a0fe5ecb3d9402d6d1', '3f8bd072c36ba06850b92a1b12d7ee6c11be50583484f953273f074bc7c735a3', NULL, 'Boston', 'USA'),
  (16, 'Henry', 'Lopez', 'henry.lopez@example.com', 'a72c3a4f2898c91c8215b871c7439e7e07abe56e856912cf891ed0d857de51fb', '3f8bd072c36ba06850b92a1b12d7ee6c11be50583484f953273f074bc7c735a3', NULL, 'Miami', 'USA'),
  (17, 'Evelyn', 'Green', 'evelyn.green@example.com', '2c2a6348fe2a08ab3a4a8e4de00b911bd69d3d446033dba1c41a0b37278b5938', '3f8bd072c36ba06850b92a1b12d7ee6c11be50583484f953273f074bc7c735a3', NULL, 'Vancouver', 'Canada'),
  (18, 'Daniel', 'Murphy', 'daniel.murphy@example.com', '9a319990a7298b094992a75c76754d10482e7dee22bece3a811106ec2c3269b5', '3f8bd072c36ba06850b92a1b12d7ee6c11be50583484f953273f074bc7c735a3', NULL, 'Glasgow', 'UK'),
  (19, 'Abigail', 'Ward', 'abigail.ward@example.com', 'b355fdee09e98e5f4d276a71dcafda72992628e5f3d57203e408b2bd3327f6c3', '3f8bd072c36ba06850b92a1b12d7ee6c11be50583484f953273f074bc7c735a3', NULL, 'Phoenix', 'USA'),
  (20, 'Michael', 'Foster', 'michael.foster@example.com', '2956df4e3df2426526e9f347206567a5982a93150b29d166fbeaf88088029695', '3f8bd072c36ba06850b92a1b12d7ee6c11be50583484f953273f074bc7c735a3', NULL, 'Portland', 'USA');

INSERT INTO product (store_id, name, slug, description, image_url)
VALUES
  (1, 'Custom Stickers', 'custom-stickers', 'High-quality custom stickers for any brand or event.', 'https://images.unsplash.com/photo-1589384267710-7a170981ca78?auto=format&fit=crop&w=1200&q=80'),
  (1, 'Custom Labels', 'custom-labels', 'Durable labels that look sharp on any surface.', 'https://images.unsplash.com/photo-1593747176945-ef77e62547eb?auto=format&fit=crop&w=1200&q=80'),
  (1, 'Custom Magnets', 'custom-magnets', 'Strong magnets for promotions or gifts.', 'https://images.unsplash.com/photo-1767002537565-d2b539c992c8?auto=format&fit=crop&w=1200&q=80'),
  (1, 'Custom Buttons', 'custom-buttons', 'Pin-back buttons for teams, events, and brands.', 'https://images.unsplash.com/photo-1572546590745-87c30605415e?auto=format&fit=crop&w=1200&q=80'),
  (1, 'Custom Packaging', 'custom-packaging', 'Premium packaging that elevates your unboxing.', 'https://images.unsplash.com/photo-1617825295690-28ae56c56135?auto=format&fit=crop&w=1200&q=80'),
  (1, 'Apparel', 'apparel', 'Soft, comfy apparel ready for your design.', 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=1200&q=80');

INSERT INTO variant (product_id, name, sku, price_cents)
VALUES
  (1, 'Standard', 'STICKER-STD', 1200),
  (1, 'Premium', 'STICKER-PRM', 1800),
  (2, 'Matte', 'LABEL-MAT', 900),
  (2, 'Gloss', 'LABEL-GLS', 1100),
  (3, 'Round', 'MAG-ROUND', 1400),
  (3, 'Rectangle', 'MAG-RECT', 1500),
  (4, 'Small', 'BTN-SM', 700),
  (4, 'Large', 'BTN-LG', 900),
  (5, 'Mailer', 'PACK-MAIL', 2200),
  (5, 'Box', 'PACK-BOX', 2800),
  (6, 'T-Shirt', 'APP-TS', 2500),
  (6, 'Hoodie', 'APP-HD', 4200);

INSERT INTO section (title)
VALUES
  ('Popular products'),
  ('New arrivals');
INSERT INTO section_product (section_id, product_id)
VALUES
  (1, 1),
  (1, 2),
  (1, 3),
  (2, 4),
  (2, 5);

INSERT INTO store (id, slug, name, hero_title, hero_subtitle, hero_image)
VALUES
  (2, 'glowprint-studio', 'GlowPrint Studio', 'Bright ideas, bold prints', 'Limited-run merch and polished branding pieces.', 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=1600&q=80'),
  (3, 'northwind-labels', 'Northwind Labels', 'Label everything with confidence', 'Industrial-strength labels made simple.', 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1600&q=80'),
  (4, 'copperline-merch', 'Copperline Merch', 'Merch that travels', 'Campaign-ready goods for teams on the move.', 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1600&q=80'),
  (5, 'pixelforge-goods', 'PixelForge Goods', 'Designs that click', 'Modern prints for digital-first brands.', 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&w=1600&q=80'),
  (6, 'riverstone-print-co', 'Riverstone Print Co', 'Handmade feel, pro results', 'Prints, packs, and promos crafted with care.', 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1600&q=80');

INSERT INTO store_follower (store_id, user_id)
VALUES
  (1, 1),
  (1, 2),
  (1, 3),
  (1, 4),
  (1, 5),
  (1, 6),
  (1, 7),
  (1, 8),
  (2, 2),
  (2, 5),
  (2, 9),
  (2, 10),
  (2, 11),
  (3, 3),
  (3, 6),
  (3, 12),
  (3, 13),
  (3, 14),
  (3, 15),
  (3, 16),
  (4, 1),
  (4, 4),
  (4, 8),
  (4, 9),
  (4, 13),
  (4, 17),
  (4, 18),
  (4, 19),
  (5, 7),
  (5, 10),
  (5, 11),
  (5, 14),
  (5, 15),
  (5, 20),
  (6, 2),
  (6, 3),
  (6, 5),
  (6, 6),
  (6, 8),
  (6, 12),
  (6, 16),
  (6, 18),
  (6, 19),
  (6, 20);

INSERT INTO product (id, store_id, name, slug, description, image_url)
VALUES
  (7, 2, 'Vinyl Stickers', 'vinyl-stickers', 'Weatherproof vinyl stickers for outdoor use.', 'https://images.unsplash.com/photo-1761276297637-4418549ead2d?auto=format&fit=crop&w=1200&q=80'),
  (8, 2, 'Holographic Stickers', 'holographic-stickers', 'Shimmering holographic stickers with sharp detail.', 'https://images.unsplash.com/photo-1669720974831-47816c252ff1?auto=format&fit=crop&w=1200&q=80'),
  (9, 2, 'Glass Labels', 'glass-labels', 'Crystal-clear labels for glass and smooth surfaces.', 'https://images.unsplash.com/photo-1669384536597-99ae8c881e65?auto=format&fit=crop&w=1200&q=80'),
  (10, 2, 'Kraft Labels', 'kraft-labels', 'Rustic kraft labels for a natural look.', 'https://images.unsplash.com/photo-1655892825670-cb78297c3f11?auto=format&fit=crop&w=1200&q=80'),
  (11, 2, 'Mailing Tubes', 'mailing-tubes', 'Branded mailing tubes for safe shipping.', 'https://images.unsplash.com/photo-1513004132127-ade5a645d3e0?auto=format&fit=crop&w=1200&q=80'),
  (12, 3, 'Square Labels', 'square-labels', 'Clean square labels for every size of packaging.', 'https://images.unsplash.com/photo-1695048401357-b15d664bea59?auto=format&fit=crop&w=1200&q=80'),
  (13, 3, 'Foil Labels', 'foil-labels', 'Premium foil labels with metallic shine.', 'https://images.unsplash.com/photo-1628503069300-77b48e72d3aa?auto=format&fit=crop&w=1200&q=80'),
  (14, 3, 'Round Magnets', 'round-magnets', 'Round promo magnets with glossy finish.', 'https://images.unsplash.com/photo-1684741940768-c40eca4ac4ab?auto=format&fit=crop&w=1200&q=80'),
  (15, 3, 'Rectangular Magnets', 'rectangular-magnets', 'Rectangular magnets for menus and coupons.', 'https://images.unsplash.com/photo-1686644823210-c9daf5003d57?auto=format&fit=crop&w=1200&q=80'),
  (16, 3, 'Pin Buttons', 'pin-buttons', 'Classic pin buttons for campaigns and events.', 'https://images.unsplash.com/photo-1566806127671-e092f419a77e?auto=format&fit=crop&w=1200&q=80'),
  (17, 4, 'Die-Cut Buttons', 'die-cut-buttons', 'Custom-shaped buttons for standout promos.', 'https://images.unsplash.com/photo-1707914704085-8c4a12d96889?auto=format&fit=crop&w=1200&q=80'),
  (18, 4, 'Mailer Boxes', 'mailer-boxes', 'Sturdy mailer boxes with full-bleed print.', 'https://images.unsplash.com/photo-1677847310286-ca83f80c3b5c?auto=format&fit=crop&w=1200&q=80'),
  (19, 4, 'Product Sleeves', 'product-sleeves', 'Printed sleeves to elevate retail packaging.', 'https://images.unsplash.com/photo-1623577411094-b22a7607cbb9?auto=format&fit=crop&w=1200&q=80'),
  (20, 4, 'Crewneck Sweatshirts', 'crewneck-sweatshirts', 'Soft crewneck sweatshirts with clean embroidery.', 'https://images.unsplash.com/photo-1523914088562-e94af834794e?auto=format&fit=crop&w=1200&q=80'),
  (21, 4, 'Embroidered Hats', 'embroidered-hats', 'Classic hats with stitched logos.', 'https://images.unsplash.com/photo-1684941062179-c5e9ee14f885?auto=format&fit=crop&w=1200&q=80'),
  (22, 5, 'Glossy Stickers', 'glossy-stickers', 'High-gloss stickers with vivid color.', 'https://images.unsplash.com/photo-1762047623703-58f0b28260f3?auto=format&fit=crop&w=1200&q=80'),
  (23, 5, 'Matte Stickers', 'matte-stickers', 'Matte stickers with a soft-touch feel.', 'https://images.unsplash.com/photo-1619646081160-033d1d793388?auto=format&fit=crop&w=1200&q=80'),
  (24, 5, 'Shipping Labels', 'shipping-labels', 'Durable labels built for logistics.', 'https://images.unsplash.com/photo-1617909517054-64d4958be1c9?auto=format&fit=crop&w=1200&q=80'),
  (25, 5, 'Bottle Labels', 'bottle-labels', 'Waterproof labels for bottles and jars.', 'https://images.unsplash.com/photo-1655713036168-4f1ca87845c8?auto=format&fit=crop&w=1200&q=80'),
  (26, 5, 'Branded Pouches', 'branded-pouches', 'Flexible pouches for retail and sample kits.', 'https://images.unsplash.com/photo-1640941978130-bd19c18c5949?auto=format&fit=crop&w=1200&q=80'),
  (27, 6, 'Sticker Sheets', 'sticker-sheets', 'Sheeted stickers for bundles and packs.', 'https://images.unsplash.com/photo-1669720974831-47816c252ff1?auto=format&fit=crop&w=1200&q=80'),
  (28, 6, 'Wall Decals', 'wall-decals', 'Large format wall decals for interiors.', 'https://images.unsplash.com/photo-1696654149736-ea63fa296531?auto=format&fit=crop&w=1200&q=80'),
  (29, 6, 'Ceramic Mugs', 'ceramic-mugs', 'Printed mugs for office and retail.', 'https://images.unsplash.com/photo-1723021178142-369f81614c97?auto=format&fit=crop&w=1200&q=80'),
  (30, 6, 'Zip Hoodies', 'zip-hoodies', 'Zip hoodies with relaxed fit.', 'https://images.unsplash.com/photo-1727517016634-6fdfc18525c1?auto=format&fit=crop&w=1200&q=80'),
  (31, 6, 'Product Tags', 'product-tags', 'Hang tags for apparel and gift items.', 'https://images.unsplash.com/photo-1524638088-758d9961fc6f?auto=format&fit=crop&w=1200&q=80');

INSERT INTO variant (product_id, name, sku, price_cents)
VALUES
  (7, 'Standard', 'VINYL-STD', 1400),
  (7, 'Premium', 'VINYL-PRM', 2000),
  (8, 'Standard', 'HOLO-STD', 1600),
  (8, 'Premium', 'HOLO-PRM', 2200),
  (9, 'Matte', 'GLASS-MAT', 1100),
  (9, 'Gloss', 'GLASS-GLS', 1300),
  (10, 'Matte', 'KRAFT-MAT', 900),
  (10, 'Gloss', 'KRAFT-GLS', 1100),
  (11, 'Small', 'TUBE-SM', 2100),
  (11, 'Large', 'TUBE-LG', 2800),
  (12, 'Matte', 'SQUARE-MAT', 950),
  (12, 'Gloss', 'SQUARE-GLS', 1150),
  (13, 'Gold', 'FOIL-GLD', 1500),
  (13, 'Silver', 'FOIL-SLV', 1500),
  (14, 'Standard', 'MAG-RND-STD', 1300),
  (14, 'Premium', 'MAG-RND-PRM', 1600),
  (15, 'Standard', 'MAG-REC-STD', 1350),
  (15, 'Premium', 'MAG-REC-PRM', 1650),
  (16, 'Small', 'PIN-SM', 800),
  (16, 'Large', 'PIN-LG', 1000),
  (17, 'Small', 'DCBTN-SM', 900),
  (17, 'Large', 'DCBTN-LG', 1100),
  (18, 'Mailer', 'BOX-MAIL', 2400),
  (18, 'Box', 'BOX-LRG', 3000),
  (19, 'Slim', 'SLEEVE-SM', 1900),
  (19, 'Wide', 'SLEEVE-LG', 2300),
  (20, 'Small', 'CREW-SM', 3200),
  (20, 'Large', 'CREW-LG', 3800),
  (21, 'Classic', 'HAT-CLS', 2200),
  (21, 'Premium', 'HAT-PRM', 2800),
  (22, 'Standard', 'GLS-STD', 1200),
  (22, 'Premium', 'GLS-PRM', 1700),
  (23, 'Standard', 'MAT-STD', 1200),
  (23, 'Premium', 'MAT-PRM', 1700),
  (24, 'Standard', 'SHIP-STD', 1000),
  (24, 'Heavy Duty', 'SHIP-HD', 1400),
  (25, 'Matte', 'BOTTLE-MAT', 1200),
  (25, 'Gloss', 'BOTTLE-GLS', 1400),
  (26, 'Small', 'POUCH-SM', 2000),
  (26, 'Large', 'POUCH-LG', 2600),
  (27, 'Standard', 'SHEET-STD', 1500),
  (27, 'Premium', 'SHEET-PRM', 2100),
  (28, 'Standard', 'DECAL-STD', 1800),
  (28, 'Premium', 'DECAL-PRM', 2400),
  (29, 'Standard', 'MUG-STD', 1600),
  (29, 'Premium', 'MUG-PRM', 2200),
  (30, 'Standard', 'ZIP-STD', 3600),
  (30, 'Premium', 'ZIP-PRM', 4300),
  (31, 'Standard', 'TAG-STD', 800),
  (31, 'Premium', 'TAG-PRM', 1100);

SELECT setval(pg_get_serial_sequence('store', 'id'), (SELECT MAX(id) FROM store));
SELECT setval(pg_get_serial_sequence('app_user', 'id'), (SELECT MAX(id) FROM app_user));
SELECT setval(pg_get_serial_sequence('password_reset', 'id'), COALESCE((SELECT MAX(id) FROM password_reset), 1));
SELECT setval(pg_get_serial_sequence('email_verification', 'id'), COALESCE((SELECT MAX(id) FROM email_verification), 1));
SELECT setval(pg_get_serial_sequence('order', 'id'), COALESCE((SELECT MAX(id) FROM "order"), 1));
SELECT setval(pg_get_serial_sequence('order_item', 'id'), COALESCE((SELECT MAX(id) FROM order_item), 1));
SELECT setval(pg_get_serial_sequence('product', 'id'), (SELECT MAX(id) FROM product));
SELECT setval(pg_get_serial_sequence('variant', 'id'), (SELECT MAX(id) FROM variant));
