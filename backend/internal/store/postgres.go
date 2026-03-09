package store

import (
	"context"
	"database/sql"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/stdlib"
)

type PostgresStore struct {
	db *sql.DB
}

func NewPostgresStore(connString string) (*PostgresStore, error) {
	cfg, err := pgx.ParseConfig(connString)
	if err != nil {
		return nil, err
	}
	db := stdlib.OpenDB(*cfg)
	if err := db.Ping(); err != nil {
		return nil, err
	}
	return &PostgresStore{db: db}, nil
}

func (p *PostgresStore) Close() error {
	return p.db.Close()
}

func (p *PostgresStore) GetStore(ctx context.Context) (Store, error) {
	row := p.db.QueryRowContext(ctx, `
    SELECT id, user_id, slug, name, hero_title, hero_subtitle, hero_image,
      (SELECT COUNT(*) FROM store_follower sf WHERE sf.store_id = store.id) AS followers_count
    FROM store
    LIMIT 1
  `)
	var store Store
	var userID sql.NullInt64
	if err := row.Scan(
		&store.ID,
		&userID,
		&store.Slug,
		&store.Name,
		&store.HeroTitle,
		&store.HeroSubtitle,
		&store.HeroImage,
		&store.FollowersCount,
	); err != nil {
		return Store{}, err
	}
	if userID.Valid {
		value := int(userID.Int64)
		store.UserID = &value
	}
	return store, nil
}

func (p *PostgresStore) GetStoreByID(ctx context.Context, id int) (Store, error) {
	row := p.db.QueryRowContext(ctx, `
    SELECT id, user_id, slug, name, hero_title, hero_subtitle, hero_image,
      (SELECT COUNT(*) FROM store_follower sf WHERE sf.store_id = store.id) AS followers_count
    FROM store
    WHERE id = $1
  `, id)
	var store Store
	var userID sql.NullInt64
	if err := row.Scan(
		&store.ID,
		&userID,
		&store.Slug,
		&store.Name,
		&store.HeroTitle,
		&store.HeroSubtitle,
		&store.HeroImage,
		&store.FollowersCount,
	); err != nil {
		return Store{}, err
	}
	if userID.Valid {
		value := int(userID.Int64)
		store.UserID = &value
	}
	return store, nil
}

func (p *PostgresStore) ListStores(ctx context.Context) ([]Store, error) {
	rows, err := p.db.QueryContext(ctx, `
    SELECT id, user_id, slug, name, hero_title, hero_subtitle, hero_image,
      (SELECT COUNT(*) FROM store_follower sf WHERE sf.store_id = store.id) AS followers_count
    FROM store
    ORDER BY id
  `)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var stores []Store
	for rows.Next() {
		var store Store
		var userID sql.NullInt64
		if err := rows.Scan(
			&store.ID,
			&userID,
			&store.Slug,
			&store.Name,
			&store.HeroTitle,
			&store.HeroSubtitle,
			&store.HeroImage,
			&store.FollowersCount,
		); err != nil {
			return nil, err
		}
		if userID.Valid {
			value := int(userID.Int64)
			store.UserID = &value
		}
		stores = append(stores, store)
	}
	return stores, nil
}

func (p *PostgresStore) CreateStore(ctx context.Context, userID int, store Store) (Store, error) {
	row := p.db.QueryRowContext(ctx, `
    INSERT INTO store (user_id, slug, name, hero_title, hero_subtitle, hero_image)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id
  `, userID, store.Slug, store.Name, store.HeroTitle, store.HeroSubtitle, store.HeroImage)
	if err := row.Scan(&store.ID); err != nil {
		return Store{}, err
	}
	created, err := p.GetStoreByID(ctx, store.ID)
	if err != nil {
		return Store{}, err
	}
	return created, nil
}

func (p *PostgresStore) UpdateStore(ctx context.Context, store Store) (Store, error) {
	row := p.db.QueryRowContext(ctx, `
    UPDATE store
    SET slug = $1,
      name = $2,
      hero_title = $3,
      hero_subtitle = $4,
      hero_image = $5
    WHERE id = $6
    RETURNING id, user_id, slug, name, hero_title, hero_subtitle, hero_image,
      (SELECT COUNT(*) FROM store_follower sf WHERE sf.store_id = store.id) AS followers_count
  `, store.Slug, store.Name, store.HeroTitle, store.HeroSubtitle, store.HeroImage, store.ID)
	var updated Store
	var userID sql.NullInt64
	if err := row.Scan(
		&updated.ID,
		&userID,
		&updated.Slug,
		&updated.Name,
		&updated.HeroTitle,
		&updated.HeroSubtitle,
		&updated.HeroImage,
		&updated.FollowersCount,
	); err != nil {
		return Store{}, err
	}
	if userID.Valid {
		value := int(userID.Int64)
		updated.UserID = &value
	}
	return updated, nil
}

func (p *PostgresStore) GetStoreByUserID(ctx context.Context, userID int) (Store, error) {
	row := p.db.QueryRowContext(ctx, `
    SELECT id, user_id, slug, name, hero_title, hero_subtitle, hero_image,
      (SELECT COUNT(*) FROM store_follower sf WHERE sf.store_id = store.id) AS followers_count
    FROM store
    WHERE user_id = $1
    LIMIT 1
  `, userID)
	var store Store
	var ownerID sql.NullInt64
	if err := row.Scan(
		&store.ID,
		&ownerID,
		&store.Slug,
		&store.Name,
		&store.HeroTitle,
		&store.HeroSubtitle,
		&store.HeroImage,
		&store.FollowersCount,
	); err != nil {
		return Store{}, err
	}
	if ownerID.Valid {
		value := int(ownerID.Int64)
		store.UserID = &value
	}
	return store, nil
}

func (p *PostgresStore) GetStoreBySlug(ctx context.Context, slug string) (Store, error) {
	row := p.db.QueryRowContext(ctx, `
    SELECT id, user_id, slug, name, hero_title, hero_subtitle, hero_image,
      (SELECT COUNT(*) FROM store_follower sf WHERE sf.store_id = store.id) AS followers_count
    FROM store
    WHERE slug = $1
  `, slug)
	var store Store
	var ownerID sql.NullInt64
	if err := row.Scan(
		&store.ID,
		&ownerID,
		&store.Slug,
		&store.Name,
		&store.HeroTitle,
		&store.HeroSubtitle,
		&store.HeroImage,
		&store.FollowersCount,
	); err != nil {
		return Store{}, err
	}
	if ownerID.Valid {
		value := int(ownerID.Int64)
		store.UserID = &value
	}
	return store, nil
}

func (p *PostgresStore) GetUnownedStore(ctx context.Context) (Store, error) {
	row := p.db.QueryRowContext(ctx, `
    SELECT id, user_id, slug, name, hero_title, hero_subtitle, hero_image,
      (SELECT COUNT(*) FROM store_follower sf WHERE sf.store_id = store.id) AS followers_count
    FROM store
    WHERE user_id IS NULL
    ORDER BY id
    LIMIT 1
  `)
	var store Store
	var ownerID sql.NullInt64
	if err := row.Scan(
		&store.ID,
		&ownerID,
		&store.Slug,
		&store.Name,
		&store.HeroTitle,
		&store.HeroSubtitle,
		&store.HeroImage,
		&store.FollowersCount,
	); err != nil {
		return Store{}, err
	}
	return store, nil
}

func (p *PostgresStore) IsStoreFollower(ctx context.Context, storeID, userID int) (bool, error) {
	row := p.db.QueryRowContext(ctx, `
    SELECT COUNT(*)
    FROM store_follower
    WHERE store_id = $1 AND user_id = $2
  `, storeID, userID)
	var count int
	if err := row.Scan(&count); err != nil {
		return false, err
	}
	return count > 0, nil
}

func (p *PostgresStore) AddStoreFollower(ctx context.Context, storeID, userID int) error {
	_, err := p.db.ExecContext(ctx, `
    INSERT INTO store_follower (store_id, user_id)
    VALUES ($1, $2)
    ON CONFLICT DO NOTHING
  `, storeID, userID)
	return err
}

func (p *PostgresStore) RemoveStoreFollower(ctx context.Context, storeID, userID int) error {
	_, err := p.db.ExecContext(ctx, `
    DELETE FROM store_follower
    WHERE store_id = $1 AND user_id = $2
  `, storeID, userID)
	return err
}

func (p *PostgresStore) EnsureStoreOwner(ctx context.Context, userID, storeID int) error {
	row := p.db.QueryRowContext(ctx, `
    SELECT user_id
    FROM store
    WHERE id = $1
  `, storeID)
	var ownerID sql.NullInt64
	if err := row.Scan(&ownerID); err != nil {
		return err
	}
	if !ownerID.Valid || int(ownerID.Int64) != userID {
		return fmt.Errorf("forbidden")
	}
	return nil
}

func (p *PostgresStore) GetStoreIDByProductID(ctx context.Context, productID int) (int, error) {
	row := p.db.QueryRowContext(ctx, `
    SELECT store_id
    FROM product
    WHERE id = $1
  `, productID)
	var storeID int
	if err := row.Scan(&storeID); err != nil {
		return 0, err
	}
	return storeID, nil
}

func (p *PostgresStore) EnsureProductsBelongToStore(ctx context.Context, storeID int, productIDs []int) error {
	if len(productIDs) == 0 {
		return nil
	}
	placeholders := make([]string, len(productIDs))
	args := make([]any, 0, len(productIDs)+1)
	args = append(args, storeID)
	for i, productID := range productIDs {
		placeholders[i] = fmt.Sprintf("$%d", i+2)
		args = append(args, productID)
	}
	query := fmt.Sprintf(`
    SELECT COUNT(*)
    FROM product
    WHERE store_id = $1 AND id IN (%s)
  `, strings.Join(placeholders, ","))
	row := p.db.QueryRowContext(ctx, query, args...)
	var count int
	if err := row.Scan(&count); err != nil {
		return err
	}
	if count != len(productIDs) {
		return fmt.Errorf("products do not belong to store")
	}
	return nil
}

func (p *PostgresStore) CreateProduct(ctx context.Context, storeID int, product Product) (Product, error) {
	row := p.db.QueryRowContext(ctx, `
    INSERT INTO product (store_id, name, slug, description, image_url)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id
  `, storeID, product.Name, product.Slug, product.Description, product.ImageURL)
	if err := row.Scan(&product.ID); err != nil {
		return Product{}, err
	}
	return p.GetProductByID(ctx, product.ID)
}

func (p *PostgresStore) CreateProductFromTemplate(ctx context.Context, storeID, templateProductID int, name, slug, imageURL string) (Product, error) {
	template, err := p.GetProductByID(ctx, templateProductID)
	if err != nil {
		return Product{}, err
	}
	if len(template.Variants) == 0 {
		return Product{}, fmt.Errorf("template has no variants")
	}
	tx, err := p.db.BeginTx(ctx, nil)
	if err != nil {
		return Product{}, err
	}
	defer func() {
		if err != nil {
			_ = tx.Rollback()
		}
	}()
	var newID int
	row := tx.QueryRowContext(ctx, `
    INSERT INTO product (store_id, name, slug, description, image_url)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id
  `, storeID, name, slug, template.Description, imageURL)
	if err = row.Scan(&newID); err != nil {
		return Product{}, err
	}
	for _, variant := range template.Variants {
		if _, execErr := tx.ExecContext(ctx, `
      INSERT INTO variant (product_id, name, sku, price_cents)
      VALUES ($1, $2, $3, $4)
    `, newID, variant.Name, variant.SKU, variant.Price.Amount); execErr != nil {
			err = execErr
			return Product{}, err
		}
	}
	if err = tx.Commit(); err != nil {
		return Product{}, err
	}
	return p.GetProductByID(ctx, newID)
}

func (p *PostgresStore) DeleteProduct(ctx context.Context, productID int) error {
	_, err := p.db.ExecContext(ctx, `
    DELETE FROM product
    WHERE id = $1
  `, productID)
	return err
}

func (p *PostgresStore) CreateVariant(ctx context.Context, productID int, variant Variant) (Variant, error) {
	row := p.db.QueryRowContext(ctx, `
    INSERT INTO variant (product_id, name, sku, price_cents)
    VALUES ($1, $2, $3, $4)
    RETURNING id
  `, productID, variant.Name, variant.SKU, variant.Price.Amount)
	if err := row.Scan(&variant.ID); err != nil {
		return Variant{}, err
	}
	variant.ProductID = productID
	return variant, nil
}

func (p *PostgresStore) CreateSection(ctx context.Context, title string) (Section, error) {
	row := p.db.QueryRowContext(ctx, `
    INSERT INTO section (title)
    VALUES ($1)
    RETURNING id
  `, title)
	var section Section
	if err := row.Scan(&section.ID); err != nil {
		return Section{}, err
	}
	section.Title = title
	return section, nil
}

func (p *PostgresStore) AddProductsToSection(ctx context.Context, sectionID int, productIDs []int) error {
	tx, err := p.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() {
		if err != nil {
			_ = tx.Rollback()
		}
	}()
	for _, productID := range productIDs {
		if _, execErr := tx.ExecContext(ctx, `
      INSERT INTO section_product (section_id, product_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
    `, sectionID, productID); execErr != nil {
			err = execErr
			return err
		}
	}
	if err = tx.Commit(); err != nil {
		return err
	}
	return nil
}

func (p *PostgresStore) GetSectionByID(ctx context.Context, sectionID int) (Section, error) {
	row := p.db.QueryRowContext(ctx, `SELECT id, title FROM section WHERE id = $1`, sectionID)
	var section Section
	if err := row.Scan(&section.ID, &section.Title); err != nil {
		return Section{}, err
	}
	products, err := p.listProductsBySection(ctx, sectionID)
	if err != nil {
		return Section{}, err
	}
	section.Products = products
	return section, nil
}

func (p *PostgresStore) GetUserByEmail(ctx context.Context, email string) (User, error) {
	row := p.db.QueryRowContext(ctx, `
    SELECT id, first_name, last_name, email, encrypted_email, password_hash, phone, email_verified_at, city, country
    FROM app_user
    WHERE email = $1
  `, email)
	var user User
	if err := row.Scan(
		&user.ID,
		&user.FirstName,
		&user.LastName,
		&user.Email,
		&user.EncryptedEmail,
		&user.PasswordHash,
		&user.Phone,
		&user.EmailVerifiedAt,
		&user.City,
		&user.Country,
	); err != nil {
		return User{}, err
	}
	return user, nil
}

func (p *PostgresStore) CreateUser(ctx context.Context, user User) (int, error) {
	row := p.db.QueryRowContext(ctx, `
    INSERT INTO app_user (first_name, last_name, email, encrypted_email, password_hash, phone, city, country)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id
  `, user.FirstName, user.LastName, user.Email, user.EncryptedEmail, user.PasswordHash, user.Phone, user.City, user.Country)
	var id int
	if err := row.Scan(&id); err != nil {
		return 0, err
	}
	return id, nil
}

func (p *PostgresStore) UpdateUserProfile(ctx context.Context, user User) error {
	_, err := p.db.ExecContext(ctx, `
    UPDATE app_user
    SET first_name = $1,
        last_name = $2,
        phone = $3
    WHERE id = $4
  `, user.FirstName, user.LastName, user.Phone, user.ID)
	return err
}

func (p *PostgresStore) GetUserByID(ctx context.Context, id int) (User, error) {
	row := p.db.QueryRowContext(ctx, `
    SELECT id, first_name, last_name, email, encrypted_email, password_hash, phone, email_verified_at, city, country
    FROM app_user
    WHERE id = $1
  `, id)
	var user User
	if err := row.Scan(
		&user.ID,
		&user.FirstName,
		&user.LastName,
		&user.Email,
		&user.EncryptedEmail,
		&user.PasswordHash,
		&user.Phone,
		&user.EmailVerifiedAt,
		&user.City,
		&user.Country,
	); err != nil {
		return User{}, err
	}
	return user, nil
}

func (p *PostgresStore) CreateEmailVerification(ctx context.Context, userID int, tokenHash string) error {
	_, err := p.db.ExecContext(ctx, `
    INSERT INTO email_verification (user_id, token_hash, expires_at)
    VALUES ($1, $2, NOW() + INTERVAL '24 hours')
  `, userID, tokenHash)
	return err
}

func (p *PostgresStore) GetEmailVerificationByTokenHash(ctx context.Context, tokenHash string) (EmailVerification, error) {
	row := p.db.QueryRowContext(ctx, `
    SELECT id, user_id, token_hash, expires_at, verified_at
    FROM email_verification
    WHERE token_hash = $1
      AND verified_at IS NULL
      AND expires_at > NOW()
  `, tokenHash)
	var verification EmailVerification
	if err := row.Scan(&verification.ID, &verification.UserID, &verification.TokenHash, &verification.ExpiresAt, &verification.VerifiedAt); err != nil {
		return EmailVerification{}, err
	}
	return verification, nil
}

func (p *PostgresStore) MarkEmailVerified(ctx context.Context, userID int, verificationID int) error {
	_, err := p.db.ExecContext(ctx, `
    UPDATE app_user
    SET email_verified_at = NOW()
    WHERE id = $1
  `, userID)
	if err != nil {
		return err
	}
	_, err = p.db.ExecContext(ctx, `
    UPDATE email_verification
    SET verified_at = NOW()
    WHERE id = $1
  `, verificationID)
	return err
}

func (p *PostgresStore) CreateOrder(ctx context.Context, userID int, cart Cart) (Order, error) {
	tx, err := p.db.BeginTx(ctx, nil)
	if err != nil {
		return Order{}, err
	}
	defer func() {
		if err != nil {
			_ = tx.Rollback()
		}
	}()

	row := tx.QueryRowContext(ctx, `
    INSERT INTO "order" (user_id, total_amount, currency)
    VALUES ($1, $2, $3)
    RETURNING id, created_at
  `, userID, cart.Total.Amount, cart.Total.Currency)

	var orderID int
	var createdAt time.Time
	if err = row.Scan(&orderID, &createdAt); err != nil {
		return Order{}, err
	}

	items := make([]OrderItem, 0, len(cart.Items))
	for _, item := range cart.Items {
		lineTotal := item.Variant.Price.Amount * item.Quantity
		_, execErr := tx.ExecContext(ctx, `
      INSERT INTO order_item (order_id, product_id, variant_id, quantity, unit_price, line_total, product_name, variant_name, image_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, orderID, item.Product.ID, item.Variant.ID, item.Quantity, item.Variant.Price.Amount, lineTotal, item.Product.Name, item.Variant.Name, item.Product.ImageURL)
		if execErr != nil {
			err = execErr
			return Order{}, err
		}
		items = append(items, OrderItem{
			OrderID:     orderID,
			ProductID:   item.Product.ID,
			VariantID:   item.Variant.ID,
			Quantity:    item.Quantity,
			UnitPrice:   item.Variant.Price.Amount,
			LineTotal:   lineTotal,
			ProductName: item.Product.Name,
			VariantName: item.Variant.Name,
			ImageURL:    item.Product.ImageURL,
		})
	}

	if err = tx.Commit(); err != nil {
		return Order{}, err
	}

	return Order{
		ID:        orderID,
		UserID:    userID,
		Total:     cart.Total,
		CreatedAt: createdAt,
		Items:     items,
	}, nil
}

func (p *PostgresStore) ListOrdersByUserID(ctx context.Context, userID int) ([]Order, error) {
	rows, err := p.db.QueryContext(ctx, `
    SELECT id, total_amount, currency, created_at
    FROM "order"
    WHERE user_id = $1
    ORDER BY created_at DESC
  `, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	orders := []Order{}
	orderIDs := []int{}
	for rows.Next() {
		var order Order
		if err := rows.Scan(&order.ID, &order.Total.Amount, &order.Total.Currency, &order.CreatedAt); err != nil {
			return nil, err
		}
		order.UserID = userID
		orders = append(orders, order)
		orderIDs = append(orderIDs, order.ID)
	}
	if len(orderIDs) == 0 {
		return orders, nil
	}

	query, args := buildInQuery(`
    SELECT id, order_id, product_id, variant_id, quantity, unit_price, line_total, product_name, variant_name, image_url
    FROM order_item
    WHERE order_id IN (%s)
    ORDER BY id
  `, orderIDs)
	itemRows, err := p.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer itemRows.Close()

	itemsByOrder := map[int][]OrderItem{}
	for itemRows.Next() {
		var item OrderItem
		if err := itemRows.Scan(
			&item.ID,
			&item.OrderID,
			&item.ProductID,
			&item.VariantID,
			&item.Quantity,
			&item.UnitPrice,
			&item.LineTotal,
			&item.ProductName,
			&item.VariantName,
			&item.ImageURL,
		); err != nil {
			return nil, err
		}
		itemsByOrder[item.OrderID] = append(itemsByOrder[item.OrderID], item)
	}

	for i := range orders {
		orders[i].Items = itemsByOrder[orders[i].ID]
	}
	return orders, nil
}

func (p *PostgresStore) GetOrderByID(ctx context.Context, orderID int) (Order, error) {
	row := p.db.QueryRowContext(ctx, `
    SELECT id, user_id, total_amount, currency, created_at
    FROM "order"
    WHERE id = $1
  `, orderID)
	var order Order
	if err := row.Scan(&order.ID, &order.UserID, &order.Total.Amount, &order.Total.Currency, &order.CreatedAt); err != nil {
		return Order{}, err
	}
	itemRows, err := p.db.QueryContext(ctx, `
    SELECT id, order_id, product_id, variant_id, quantity, unit_price, line_total, product_name, variant_name, image_url
    FROM order_item
    WHERE order_id = $1
    ORDER BY id
  `, orderID)
	if err != nil {
		return Order{}, err
	}
	defer itemRows.Close()
	for itemRows.Next() {
		var item OrderItem
		if err := itemRows.Scan(
			&item.ID,
			&item.OrderID,
			&item.ProductID,
			&item.VariantID,
			&item.Quantity,
			&item.UnitPrice,
			&item.LineTotal,
			&item.ProductName,
			&item.VariantName,
			&item.ImageURL,
		); err != nil {
			return Order{}, err
		}
		order.Items = append(order.Items, item)
	}
	return order, nil
}

func (p *PostgresStore) CreatePasswordReset(ctx context.Context, userID int, tokenHash string) error {
	_, err := p.db.ExecContext(ctx, `
    INSERT INTO password_reset (user_id, token_hash, expires_at)
    VALUES ($1, $2, NOW() + INTERVAL '30 minutes')
  `, userID, tokenHash)
	return err
}

func (p *PostgresStore) GetPasswordResetByTokenHash(ctx context.Context, tokenHash string) (PasswordReset, error) {
	row := p.db.QueryRowContext(ctx, `
    SELECT id, user_id, token_hash, expires_at, used_at
    FROM password_reset
    WHERE token_hash = $1
      AND used_at IS NULL
      AND expires_at > NOW()
  `, tokenHash)
	var reset PasswordReset
	if err := row.Scan(&reset.ID, &reset.UserID, &reset.TokenHash, &reset.ExpiresAt, &reset.UsedAt); err != nil {
		return PasswordReset{}, err
	}
	return reset, nil
}

func (p *PostgresStore) MarkPasswordResetUsed(ctx context.Context, id int) error {
	_, err := p.db.ExecContext(ctx, `
    UPDATE password_reset
    SET used_at = NOW()
    WHERE id = $1
  `, id)
	return err
}

func (p *PostgresStore) UpdateUserPassword(ctx context.Context, userID int, passwordHash string) error {
	_, err := p.db.ExecContext(ctx, `
    UPDATE app_user
    SET password_hash = $1
    WHERE id = $2
  `, passwordHash, userID)
	return err
}

func (p *PostgresStore) ListSections(ctx context.Context) ([]Section, error) {
	rows, err := p.db.QueryContext(ctx, `SELECT id, title FROM section ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var sections []Section
	for rows.Next() {
		var section Section
		if err := rows.Scan(&section.ID, &section.Title); err != nil {
			return nil, err
		}
		sections = append(sections, section)
	}

	for i := range sections {
		products, err := p.listProductsBySection(ctx, sections[i].ID)
		if err != nil {
			return nil, err
		}
		sections[i].Products = products
	}
	return sections, nil
}

func (p *PostgresStore) listProductsBySection(ctx context.Context, sectionID int) ([]Product, error) {
	rows, err := p.db.QueryContext(ctx, `
    SELECT p.id, p.store_id, s.slug, s.name, p.name, p.slug, p.description, p.image_url
    FROM product p
    JOIN section_product sp ON sp.product_id = p.id
    JOIN store s ON s.id = p.store_id
    WHERE sp.section_id = $1
    ORDER BY p.id
  `, sectionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	products, ids, err := scanProducts(rows)
	if err != nil {
		return nil, err
	}
	if len(ids) == 0 {
		return products, nil
	}
	variants, err := p.listVariantsByProductIDs(ctx, ids)
	if err != nil {
		return nil, err
	}
	attachVariants(products, variants)
	return products, nil
}

func (p *PostgresStore) ListProductsByStoreID(ctx context.Context, storeID int) ([]Product, error) {
	rows, err := p.db.QueryContext(ctx, `
    SELECT p.id, p.store_id, s.slug, s.name, p.name, p.slug, p.description, p.image_url
    FROM product p
    JOIN store s ON s.id = p.store_id
    WHERE p.store_id = $1
    ORDER BY p.id
  `, storeID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	products, ids, err := scanProducts(rows)
	if err != nil {
		return nil, err
	}
	if len(ids) == 0 {
		return products, nil
	}
	variants, err := p.listVariantsByProductIDs(ctx, ids)
	if err != nil {
		return nil, err
	}
	attachVariants(products, variants)
	return products, nil
}

func (p *PostgresStore) ListProducts(ctx context.Context, limit, offset int) ([]Product, error) {
	if limit <= 0 {
		limit = 12
	}
	rows, err := p.db.QueryContext(ctx, `
    SELECT p.id, p.store_id, s.slug, s.name, p.name, p.slug, p.description, p.image_url
    FROM product p
    JOIN store s ON s.id = p.store_id
    ORDER BY p.id
    LIMIT $1 OFFSET $2
  `, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	products, ids, err := scanProducts(rows)
	if err != nil {
		return nil, err
	}
	if len(ids) == 0 {
		return products, nil
	}
	variants, err := p.listVariantsByProductIDs(ctx, ids)
	if err != nil {
		return nil, err
	}
	attachVariants(products, variants)
	return products, nil
}

func (p *PostgresStore) GetProductByID(ctx context.Context, id int) (Product, error) {
	row := p.db.QueryRowContext(ctx, `
    SELECT p.id, p.store_id, s.slug, s.name, p.name, p.slug, p.description, p.image_url
    FROM product p
    JOIN store s ON s.id = p.store_id
    WHERE p.id = $1
  `, id)
	var product Product
	if err := row.Scan(
		&product.ID,
		&product.StoreID,
		&product.StoreSlug,
		&product.StoreName,
		&product.Name,
		&product.Slug,
		&product.Description,
		&product.ImageURL,
	); err != nil {
		return Product{}, err
	}
	variants, err := p.listVariantsByProductIDs(ctx, []int{id})
	if err != nil {
		return Product{}, err
	}
	products := []Product{product}
	attachVariants(products, variants)
	return products[0], nil
}

func (p *PostgresStore) GetProductBySlug(ctx context.Context, slug string) (Product, error) {
	row := p.db.QueryRowContext(ctx, `
    SELECT p.id, p.store_id, s.slug, s.name, p.name, p.slug, p.description, p.image_url
    FROM product p
    JOIN store s ON s.id = p.store_id
    WHERE p.slug = $1
  `, slug)
	var product Product
	if err := row.Scan(
		&product.ID,
		&product.StoreID,
		&product.StoreSlug,
		&product.StoreName,
		&product.Name,
		&product.Slug,
		&product.Description,
		&product.ImageURL,
	); err != nil {
		return Product{}, err
	}
	variants, err := p.listVariantsByProductIDs(ctx, []int{product.ID})
	if err != nil {
		return Product{}, err
	}
	products := []Product{product}
	attachVariants(products, variants)
	return products[0], nil
}

func (p *PostgresStore) GetProductByStoreSlugAndSlug(ctx context.Context, storeSlug, productSlug string) (Product, error) {
	row := p.db.QueryRowContext(ctx, `
    SELECT p.id, p.store_id, s.slug, s.name, p.name, p.slug, p.description, p.image_url
    FROM product p
    JOIN store s ON s.id = p.store_id
    WHERE s.slug = $1 AND p.slug = $2
  `, storeSlug, productSlug)
	var product Product
	if err := row.Scan(
		&product.ID,
		&product.StoreID,
		&product.StoreSlug,
		&product.StoreName,
		&product.Name,
		&product.Slug,
		&product.Description,
		&product.ImageURL,
	); err != nil {
		return Product{}, err
	}
	variants, err := p.listVariantsByProductIDs(ctx, []int{product.ID})
	if err != nil {
		return Product{}, err
	}
	products := []Product{product}
	attachVariants(products, variants)
	return products[0], nil
}

func (p *PostgresStore) GetProductsByIDs(ctx context.Context, ids []int) ([]Product, error) {
	if len(ids) == 0 {
		return nil, nil
	}
	query, args := buildInQuery(`
    SELECT p.id, p.store_id, s.slug, s.name, p.name, p.slug, p.description, p.image_url
    FROM product p
    JOIN store s ON s.id = p.store_id
    WHERE p.id IN (%s)
  `, ids)
	rows, err := p.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	products, productIDs, err := scanProducts(rows)
	if err != nil {
		return nil, err
	}
	if len(productIDs) == 0 {
		return products, nil
	}
	variants, err := p.listVariantsByProductIDs(ctx, productIDs)
	if err != nil {
		return nil, err
	}
	attachVariants(products, variants)
	return products, nil
}

func (p *PostgresStore) GetVariantsByIDs(ctx context.Context, ids []int) ([]Variant, error) {
	if len(ids) == 0 {
		return nil, nil
	}
	query, args := buildInQuery(`
    SELECT id, product_id, name, sku, price_cents
    FROM variant
    WHERE id IN (%s)
  `, ids)
	rows, err := p.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var variants []Variant
	for rows.Next() {
		var variant Variant
		var price int
		if err := rows.Scan(&variant.ID, &variant.ProductID, &variant.Name, &variant.SKU, &price); err != nil {
			return nil, err
		}
		variant.Price = Money{Amount: price, Currency: "USD"}
		variants = append(variants, variant)
	}
	return variants, nil
}

func (p *PostgresStore) listVariantsByProductIDs(ctx context.Context, ids []int) ([]Variant, error) {
	query, args := buildInQuery(`
    SELECT id, product_id, name, sku, price_cents
    FROM variant
    WHERE product_id IN (%s)
    ORDER BY id
  `, ids)
	rows, err := p.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var variants []Variant
	for rows.Next() {
		var variant Variant
		var price int
		if err := rows.Scan(&variant.ID, &variant.ProductID, &variant.Name, &variant.SKU, &price); err != nil {
			return nil, err
		}
		variant.Price = Money{Amount: price, Currency: "USD"}
		variants = append(variants, variant)
	}
	return variants, nil
}

func scanProducts(rows *sql.Rows) ([]Product, []int, error) {
	var products []Product
	var ids []int
	for rows.Next() {
		var product Product
		if err := rows.Scan(
			&product.ID,
			&product.StoreID,
			&product.StoreSlug,
			&product.StoreName,
			&product.Name,
			&product.Slug,
			&product.Description,
			&product.ImageURL,
		); err != nil {
			return nil, nil, err
		}
		products = append(products, product)
		ids = append(ids, product.ID)
	}
	return products, ids, nil
}

func attachVariants(products []Product, variants []Variant) {
	variantMap := map[int][]Variant{}
	for _, variant := range variants {
		variantMap[variant.ProductID] = append(variantMap[variant.ProductID], variant)
	}

	for i := range products {
		productVariants := variantMap[products[i].ID]
		sort.Slice(productVariants, func(a, b int) bool {
			return productVariants[a].Price.Amount < productVariants[b].Price.Amount
		})
		products[i].Variants = productVariants
		if len(productVariants) > 0 {
			products[i].Price = productVariants[0].Price
		}
	}
}

func buildInQuery(base string, ids []int) (string, []any) {
	placeholders := make([]string, len(ids))
	args := make([]any, len(ids))
	for i, id := range ids {
		placeholders[i] = fmt.Sprintf("$%d", i+1)
		args[i] = id
	}
	return fmt.Sprintf(base, strings.Join(placeholders, ",")), args
}

func (p *PostgresStore) GetVariantByID(ctx context.Context, id int) (Variant, error) {
	row := p.db.QueryRowContext(ctx, `
    SELECT id, product_id, name, sku, price_cents
    FROM variant
    WHERE id = $1
  `, id)
	var variant Variant
	var price int
	if err := row.Scan(&variant.ID, &variant.ProductID, &variant.Name, &variant.SKU, &price); err != nil {
		return Variant{}, err
	}
	variant.Price = Money{Amount: price, Currency: "USD"}
	return variant, nil
}

func (p *PostgresStore) GetProductByVariantID(ctx context.Context, variantID int) (Product, error) {
	row := p.db.QueryRowContext(ctx, `
    SELECT p.id, p.store_id, s.slug, s.name, p.name, p.slug, p.description, p.image_url
    FROM product p
    JOIN store s ON s.id = p.store_id
    JOIN variant v ON v.product_id = p.id
    WHERE v.id = $1
  `, variantID)
	var product Product
	if err := row.Scan(
		&product.ID,
		&product.StoreID,
		&product.StoreSlug,
		&product.StoreName,
		&product.Name,
		&product.Slug,
		&product.Description,
		&product.ImageURL,
	); err != nil {
		return Product{}, err
	}
	variants, err := p.listVariantsByProductIDs(ctx, []int{product.ID})
	if err != nil {
		return Product{}, err
	}
	products := []Product{product}
	attachVariants(products, variants)
	return products[0], nil
}

func (p *PostgresStore) EnsureProductVariant(ctx context.Context, productID, variantID int) error {
	row := p.db.QueryRowContext(ctx, `
    SELECT COUNT(*)
    FROM variant
    WHERE id = $1 AND product_id = $2
  `, variantID, productID)
	var count int
	if err := row.Scan(&count); err != nil {
		return err
	}
	if count == 0 {
		return fmt.Errorf("variant %d does not belong to product %d", variantID, productID)
	}
	return nil
}
