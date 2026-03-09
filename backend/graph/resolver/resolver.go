package resolver

import (
	"context"
	"database/sql"
	"fmt"
	"regexp"
	"strconv"
	"strings"

	"store-demo-backend/internal/store"

	"github.com/graph-gophers/graphql-go"
)

type Resolver struct {
	Service *store.Service
}

type userContextKey struct{}

func ContextWithUser(ctx context.Context, user store.User) context.Context {
	return context.WithValue(ctx, userContextKey{}, user)
}

func UserFromContext(ctx context.Context) (*store.User, bool) {
	user, ok := ctx.Value(userContextKey{}).(store.User)
	if !ok {
		return nil, false
	}
	return &user, true
}

type createStoreInput struct {
	Name         string
	HeroTitle    string
	HeroSubtitle string
	HeroImage    string
}

type updateStoreInput struct {
	Name         *string
	HeroTitle    *string
	HeroSubtitle *string
	HeroImage    *string
}

type createProductInput struct {
	StoreID     graphql.ID
	Name        string
	Slug        string
	Description string
	ImageURL    string
}

type createVariantInput struct {
	ProductID  graphql.ID
	Name       string
	SKU        string
	PriceCents int32
}

type createStoreProductInput struct {
	StoreID           graphql.ID
	TemplateProductID graphql.ID
	Name              string
	Slug              string
	ImageURL          string
}

func (r *Resolver) Store(ctx context.Context) (*storeResolver, error) {
	storeData, err := r.Service.DB.GetStore(ctx)
	if err != nil {
		return nil, err
	}
	return &storeResolver{store: storeData, service: r.Service}, nil
}

func (r *Resolver) MyStore(ctx context.Context) (*storeResolver, error) {
	user, ok := UserFromContext(ctx)
	if !ok {
		return nil, nil
	}
	storeData, err := r.Service.DB.GetStoreByUserID(ctx, user.ID)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &storeResolver{store: storeData, service: r.Service}, nil
}

func (r *Resolver) StoreByID(ctx context.Context, args struct {
	ID graphql.ID
}) (*storeResolver, error) {
	id, err := strconv.Atoi(string(args.ID))
	if err != nil {
		return nil, fmt.Errorf("invalid id")
	}
	storeData, err := r.Service.DB.GetStoreByID(ctx, id)
	if err != nil {
		return nil, err
	}
	return &storeResolver{store: storeData, service: r.Service}, nil
}

func (r *Resolver) StoreBySlug(ctx context.Context, args struct {
	Slug string
}) (*storeResolver, error) {
	storeData, err := r.Service.DB.GetStoreBySlug(ctx, args.Slug)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &storeResolver{store: storeData, service: r.Service}, nil
}

func (r *Resolver) Stores(ctx context.Context) ([]*storeResolver, error) {
	stores, err := r.Service.DB.ListStores(ctx)
	if err != nil {
		return nil, err
	}
	resolvers := make([]*storeResolver, 0, len(stores))
	for _, storeData := range stores {
		resolvers = append(resolvers, &storeResolver{store: storeData, service: r.Service})
	}
	return resolvers, nil
}

func (r *Resolver) Products(ctx context.Context, args struct {
	Limit  *int32
	Offset *int32
}) ([]*productResolver, error) {
	limit := 12
	offset := 0
	if args.Limit != nil {
		limit = int(*args.Limit)
	}
	if args.Offset != nil {
		offset = int(*args.Offset)
	}
	products, err := r.Service.CachedProducts(ctx, limit, offset)
	if err != nil {
		return nil, err
	}
	return wrapProducts(products), nil
}

func (r *Resolver) ProductTemplates(ctx context.Context) ([]*productResolver, error) {
	templateStore, err := r.Service.DB.GetStoreBySlug(ctx, "sticker-demo-store")
	if err != nil {
		if err == sql.ErrNoRows {
			templateStore, err = r.Service.DB.GetUnownedStore(ctx)
			if err != nil {
				if err == sql.ErrNoRows {
					return []*productResolver{}, nil
				}
				return nil, err
			}
		} else {
			return nil, err
		}
	}
	products, err := r.Service.DB.ListProductsByStoreID(ctx, templateStore.ID)
	if err != nil {
		return nil, err
	}
	return wrapProducts(products), nil
}

func (r *Resolver) Product(ctx context.Context, args struct {
	ID   *graphql.ID
	Slug *string
}) (*productResolver, error) {
	if args.ID == nil && args.Slug == nil {
		return nil, nil
	}
	if args.ID != nil {
		id, err := strconv.Atoi(string(*args.ID))
		if err != nil {
			return nil, fmt.Errorf("invalid id")
		}
		product, err := r.Service.DB.GetProductByID(ctx, id)
		if err != nil {
			return nil, err
		}
		return &productResolver{product: product, service: r.Service}, nil
	}
	product, err := r.Service.DB.GetProductBySlug(ctx, *args.Slug)
	if err != nil {
		return nil, err
	}
	return &productResolver{product: product, service: r.Service}, nil
}

func (r *Resolver) ProductByStoreSlug(ctx context.Context, args struct {
	StoreSlug   string
	ProductSlug string
}) (*productResolver, error) {
	product, err := r.Service.DB.GetProductByStoreSlugAndSlug(ctx, args.StoreSlug, args.ProductSlug)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &productResolver{product: product, service: r.Service}, nil
}

func (r *Resolver) AddToCart(ctx context.Context, args struct {
	CartID    *graphql.ID
	ProductID graphql.ID
	VariantID graphql.ID
	Quantity  int32
}) (*cartResolver, error) {
	productID, err := strconv.Atoi(string(args.ProductID))
	if err != nil {
		return nil, fmt.Errorf("invalid product id")
	}
	variantID, err := strconv.Atoi(string(args.VariantID))
	if err != nil {
		return nil, fmt.Errorf("invalid variant id")
	}
	if args.Quantity <= 0 {
		return nil, fmt.Errorf("quantity must be greater than zero")
	}
	if err := r.Service.DB.EnsureProductVariant(ctx, productID, variantID); err != nil {
		return nil, err
	}
	cartID := ""
	if args.CartID != nil {
		cartID = string(*args.CartID)
	}
	record, err := r.Service.Cart.AddItem(ctx, cartID, productID, variantID, int(args.Quantity))
	if err != nil {
		return nil, err
	}
	cart, err := r.Service.BuildCart(ctx, record)
	if err != nil {
		return nil, err
	}
	return &cartResolver{cart: cart, service: r.Service}, nil
}

func (r *Resolver) UpdateCartItem(ctx context.Context, args struct {
	CartID   graphql.ID
	ItemID   graphql.ID
	Quantity int32
}) (*cartResolver, error) {
	if args.Quantity <= 0 {
		return nil, fmt.Errorf("quantity must be greater than zero")
	}
	record, err := r.Service.Cart.UpdateItem(ctx, string(args.CartID), string(args.ItemID), int(args.Quantity))
	if err != nil {
		return nil, err
	}
	cart, err := r.Service.BuildCart(ctx, record)
	if err != nil {
		return nil, err
	}
	return &cartResolver{cart: cart, service: r.Service}, nil
}

func (r *Resolver) RemoveCartItem(ctx context.Context, args struct {
	CartID graphql.ID
	ItemID graphql.ID
}) (*cartResolver, error) {
	record, err := r.Service.Cart.RemoveItem(ctx, string(args.CartID), string(args.ItemID))
	if err != nil {
		return nil, err
	}
	cart, err := r.Service.BuildCart(ctx, record)
	if err != nil {
		return nil, err
	}
	return &cartResolver{cart: cart, service: r.Service}, nil
}

func (r *Resolver) CreateStore(ctx context.Context, args struct {
	Input createStoreInput
}) (*storeResolver, error) {
	user, ok := UserFromContext(ctx)
	if !ok {
		return nil, fmt.Errorf("unauthorized")
	}
	if args.Input.Name == "" || args.Input.HeroTitle == "" || args.Input.HeroSubtitle == "" || args.Input.HeroImage == "" {
		return nil, fmt.Errorf("missing required store fields")
	}
	if _, err := r.Service.DB.GetStoreByUserID(ctx, user.ID); err == nil {
		return nil, fmt.Errorf("store already exists")
	} else if err != sql.ErrNoRows {
		return nil, err
	}
	slugBase := slugify(args.Input.Name)
	if slugBase == "" {
		return nil, fmt.Errorf("invalid store name")
	}
	slug := slugBase
	for i := 0; i < 50; i++ {
		_, err := r.Service.DB.GetStoreBySlug(ctx, slug)
		if err == sql.ErrNoRows {
			break
		}
		if err != nil {
			return nil, err
		}
		slug = fmt.Sprintf("%s-%d", slugBase, i+2)
	}
	storeData, err := r.Service.DB.CreateStore(ctx, user.ID, store.Store{
		Slug:         slug,
		Name:         args.Input.Name,
		HeroTitle:    args.Input.HeroTitle,
		HeroSubtitle: args.Input.HeroSubtitle,
		HeroImage:    args.Input.HeroImage,
	})
	if err != nil {
		return nil, err
	}
	return &storeResolver{store: storeData, service: r.Service}, nil
}

func (r *Resolver) UpdateStore(ctx context.Context, args struct {
	ID    graphql.ID
	Input updateStoreInput
}) (*storeResolver, error) {
	user, ok := UserFromContext(ctx)
	if !ok {
		return nil, fmt.Errorf("unauthorized")
	}
	id, err := strconv.Atoi(string(args.ID))
	if err != nil {
		return nil, fmt.Errorf("invalid id")
	}
	if err := r.Service.DB.EnsureStoreOwner(ctx, user.ID, id); err != nil {
		return nil, err
	}
	storeData, err := r.Service.DB.GetStoreByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if args.Input.Name != nil {
		storeData.Name = *args.Input.Name
	}
	if args.Input.HeroTitle != nil {
		storeData.HeroTitle = *args.Input.HeroTitle
	}
	if args.Input.HeroSubtitle != nil {
		storeData.HeroSubtitle = *args.Input.HeroSubtitle
	}
	if args.Input.HeroImage != nil {
		storeData.HeroImage = *args.Input.HeroImage
	}
	updated, err := r.Service.DB.UpdateStore(ctx, storeData)
	if err != nil {
		return nil, err
	}
	return &storeResolver{store: updated, service: r.Service}, nil
}

func (r *Resolver) CreateProduct(ctx context.Context, args struct {
	Input createProductInput
}) (*productResolver, error) {
	user, ok := UserFromContext(ctx)
	if !ok {
		return nil, fmt.Errorf("unauthorized")
	}
	storeID, err := strconv.Atoi(string(args.Input.StoreID))
	if err != nil {
		return nil, fmt.Errorf("invalid store id")
	}
	if err := r.Service.DB.EnsureStoreOwner(ctx, user.ID, storeID); err != nil {
		return nil, err
	}
	if args.Input.Name == "" || args.Input.Slug == "" || args.Input.Description == "" || args.Input.ImageURL == "" {
		return nil, fmt.Errorf("missing required product fields")
	}
	product, err := r.Service.DB.CreateProduct(ctx, storeID, store.Product{
		Name:        args.Input.Name,
		Slug:        args.Input.Slug,
		Description: args.Input.Description,
		ImageURL:    args.Input.ImageURL,
	})
	if err != nil {
		return nil, err
	}
	return &productResolver{product: product, service: r.Service}, nil
}

func (r *Resolver) CreateStoreProduct(ctx context.Context, args struct {
	Input createStoreProductInput
}) (*productResolver, error) {
	user, ok := UserFromContext(ctx)
	if !ok {
		return nil, fmt.Errorf("unauthorized")
	}
	storeID, err := strconv.Atoi(string(args.Input.StoreID))
	if err != nil {
		return nil, fmt.Errorf("invalid store id")
	}
	if err := r.Service.DB.EnsureStoreOwner(ctx, user.ID, storeID); err != nil {
		return nil, err
	}
	templateID, err := strconv.Atoi(string(args.Input.TemplateProductID))
	if err != nil {
		return nil, fmt.Errorf("invalid template product id")
	}
	if args.Input.Name == "" || args.Input.Slug == "" || args.Input.ImageURL == "" {
		return nil, fmt.Errorf("missing required product fields")
	}
	product, err := r.Service.DB.CreateProductFromTemplate(
		ctx,
		storeID,
		templateID,
		args.Input.Name,
		args.Input.Slug,
		args.Input.ImageURL,
	)
	if err != nil {
		return nil, err
	}
	return &productResolver{product: product, service: r.Service}, nil
}

func (r *Resolver) FollowStore(ctx context.Context, args struct {
	StoreID graphql.ID
}) (*storeResolver, error) {
	user, ok := UserFromContext(ctx)
	if !ok {
		return nil, fmt.Errorf("unauthorized")
	}
	storeID, err := strconv.Atoi(string(args.StoreID))
	if err != nil {
		return nil, fmt.Errorf("invalid store id")
	}
	if err := r.Service.DB.AddStoreFollower(ctx, storeID, user.ID); err != nil {
		return nil, err
	}
	storeData, err := r.Service.DB.GetStoreByID(ctx, storeID)
	if err != nil {
		return nil, err
	}
	return &storeResolver{store: storeData, service: r.Service}, nil
}

func (r *Resolver) UnfollowStore(ctx context.Context, args struct {
	StoreID graphql.ID
}) (*storeResolver, error) {
	user, ok := UserFromContext(ctx)
	if !ok {
		return nil, fmt.Errorf("unauthorized")
	}
	storeID, err := strconv.Atoi(string(args.StoreID))
	if err != nil {
		return nil, fmt.Errorf("invalid store id")
	}
	if err := r.Service.DB.RemoveStoreFollower(ctx, storeID, user.ID); err != nil {
		return nil, err
	}
	storeData, err := r.Service.DB.GetStoreByID(ctx, storeID)
	if err != nil {
		return nil, err
	}
	return &storeResolver{store: storeData, service: r.Service}, nil
}

func (r *Resolver) DeleteStoreProduct(ctx context.Context, args struct {
	ProductID graphql.ID
}) (bool, error) {
	user, ok := UserFromContext(ctx)
	if !ok {
		return false, fmt.Errorf("unauthorized")
	}
	productID, err := strconv.Atoi(string(args.ProductID))
	if err != nil {
		return false, fmt.Errorf("invalid product id")
	}
	storeID, err := r.Service.DB.GetStoreIDByProductID(ctx, productID)
	if err != nil {
		return false, err
	}
	if err := r.Service.DB.EnsureStoreOwner(ctx, user.ID, storeID); err != nil {
		return false, err
	}
	if err := r.Service.DB.DeleteProduct(ctx, productID); err != nil {
		return false, err
	}
	return true, nil
}

func (r *Resolver) CreateVariant(ctx context.Context, args struct {
	Input createVariantInput
}) (*variantResolver, error) {
	user, ok := UserFromContext(ctx)
	if !ok {
		return nil, fmt.Errorf("unauthorized")
	}
	productID, err := strconv.Atoi(string(args.Input.ProductID))
	if err != nil {
		return nil, fmt.Errorf("invalid product id")
	}
	storeID, err := r.Service.DB.GetStoreIDByProductID(ctx, productID)
	if err != nil {
		return nil, err
	}
	if err := r.Service.DB.EnsureStoreOwner(ctx, user.ID, storeID); err != nil {
		return nil, err
	}
	if args.Input.Name == "" || args.Input.SKU == "" || args.Input.PriceCents <= 0 {
		return nil, fmt.Errorf("missing required variant fields")
	}
	variant, err := r.Service.DB.CreateVariant(ctx, productID, store.Variant{
		Name:  args.Input.Name,
		SKU:   args.Input.SKU,
		Price: store.Money{Amount: int(args.Input.PriceCents), Currency: "USD"},
	})
	if err != nil {
		return nil, err
	}
	return &variantResolver{variant: variant}, nil
}

func slugify(value string) string {
	lower := strings.ToLower(strings.TrimSpace(value))
	if lower == "" {
		return ""
	}
	re := regexp.MustCompile(`[^a-z0-9]+`)
	slug := re.ReplaceAllString(lower, "-")
	return strings.Trim(slug, "-")
}
