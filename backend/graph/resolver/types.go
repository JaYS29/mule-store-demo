package resolver

import (
	"context"
	"strconv"

	"store-demo-backend/internal/store"

	"github.com/graph-gophers/graphql-go"
)

type storeResolver struct {
	store   store.Store
	service *store.Service
}

func (s *storeResolver) ID() graphql.ID {
	return graphql.ID(strconv.Itoa(s.store.ID))
}

func (s *storeResolver) Slug() string {
	return s.store.Slug
}

func (s *storeResolver) Name() string {
	return s.store.Name
}

func (s *storeResolver) HeroTitle() string {
	return s.store.HeroTitle
}

func (s *storeResolver) HeroSubtitle() string {
	return s.store.HeroSubtitle
}

func (s *storeResolver) HeroImage() string {
	return s.store.HeroImage
}

func (s *storeResolver) FollowersCount() int32 {
	return int32(s.store.FollowersCount)
}

func (s *storeResolver) IsFollowing(ctx context.Context) bool {
	user, ok := UserFromContext(ctx)
	if !ok {
		return false
	}
	isFollowing, err := s.service.DB.IsStoreFollower(ctx, s.store.ID, user.ID)
	if err != nil {
		return false
	}
	return isFollowing
}

func (s *storeResolver) Products() []*productResolver {
	products, err := s.service.DB.ListProductsByStoreID(context.Background(), s.store.ID)
	if err != nil {
		return []*productResolver{}
	}
	return wrapProducts(products)
}

func (s *storeResolver) Sections() []*sectionResolver {
	resolvers := make([]*sectionResolver, 0, len(s.store.Sections))
	for _, section := range s.store.Sections {
		resolvers = append(resolvers, &sectionResolver{section: section, service: s.service})
	}
	return resolvers
}

type sectionResolver struct {
	section store.Section
	service *store.Service
}

func (s *sectionResolver) ID() graphql.ID {
	return graphql.ID(strconv.Itoa(s.section.ID))
}

func (s *sectionResolver) Title() string {
	return s.section.Title
}

func (s *sectionResolver) Products() []*productResolver {
	return wrapProducts(s.section.Products)
}

type productResolver struct {
	product store.Product
	service *store.Service
}

func wrapProducts(products []store.Product) []*productResolver {
	resolvers := make([]*productResolver, 0, len(products))
	for _, product := range products {
		resolvers = append(resolvers, &productResolver{product: product})
	}
	return resolvers
}

func (p *productResolver) ID() graphql.ID {
	return graphql.ID(strconv.Itoa(p.product.ID))
}

func (p *productResolver) StoreName() string {
	return p.product.StoreName
}

func (p *productResolver) StoreSlug() string {
	return p.product.StoreSlug
}

func (p *productResolver) Name() string {
	return p.product.Name
}

func (p *productResolver) Slug() string {
	return p.product.Slug
}

func (p *productResolver) Description() string {
	return p.product.Description
}

func (p *productResolver) ImageUrl() string {
	return p.product.ImageURL
}

func (p *productResolver) Price() *moneyResolver {
	return &moneyResolver{money: p.product.Price}
}

func (p *productResolver) Variants() []*variantResolver {
	resolvers := make([]*variantResolver, 0, len(p.product.Variants))
	for _, variant := range p.product.Variants {
		resolvers = append(resolvers, &variantResolver{variant: variant})
	}
	return resolvers
}

type variantResolver struct {
	variant store.Variant
}

func (v *variantResolver) ID() graphql.ID {
	return graphql.ID(strconv.Itoa(v.variant.ID))
}

func (v *variantResolver) Name() string {
	return v.variant.Name
}

func (v *variantResolver) SKU() string {
	return v.variant.SKU
}

func (v *variantResolver) Price() *moneyResolver {
	return &moneyResolver{money: v.variant.Price}
}

type moneyResolver struct {
	money store.Money
}

func (m *moneyResolver) Amount() int32 {
	return int32(m.money.Amount)
}

func (m *moneyResolver) Currency() string {
	return m.money.Currency
}

type cartResolver struct {
	cart    store.Cart
	service *store.Service
}

func (c *cartResolver) ID() graphql.ID {
	return graphql.ID(c.cart.ID)
}

func (c *cartResolver) Items() []*cartItemResolver {
	resolvers := make([]*cartItemResolver, 0, len(c.cart.Items))
	for _, item := range c.cart.Items {
		resolvers = append(resolvers, &cartItemResolver{item: item})
	}
	return resolvers
}

func (c *cartResolver) Subtotal() *moneyResolver {
	return &moneyResolver{money: c.cart.Subtotal}
}

func (c *cartResolver) Total() *moneyResolver {
	return &moneyResolver{money: c.cart.Total}
}

type cartItemResolver struct {
	item store.CartItem
}

func (c *cartItemResolver) ID() graphql.ID {
	return graphql.ID(c.item.ID)
}

func (c *cartItemResolver) Product() *productResolver {
	return &productResolver{product: c.item.Product}
}

func (c *cartItemResolver) Variant() *variantResolver {
	return &variantResolver{variant: c.item.Variant}
}

func (c *cartItemResolver) Quantity() int32 {
	return int32(c.item.Quantity)
}

func (c *cartItemResolver) LineTotal() *moneyResolver {
	return &moneyResolver{money: c.item.LineTotal}
}
