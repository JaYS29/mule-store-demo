package store

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

type Service struct {
	DB    *PostgresStore
	Redis *redis.Client
	Cart  *CartStore
}

func NewService(db *PostgresStore, redisClient *redis.Client) *Service {
	return &Service{
		DB:    db,
		Redis: redisClient,
		Cart:  NewCartStore(redisClient),
	}
}

func (s *Service) CachedProducts(ctx context.Context, limit, offset int) ([]Product, error) {
	cacheKey := fmt.Sprintf("products:list:%d:%d", limit, offset)
	if s.Redis != nil {
		cached, err := s.Redis.Get(ctx, cacheKey).Result()
		if err == nil {
			var products []Product
			if err := json.Unmarshal([]byte(cached), &products); err == nil {
				return products, nil
			}
		}
	}
	products, err := s.DB.ListProducts(ctx, limit, offset)
	if err != nil {
		return nil, err
	}
	if s.Redis != nil {
		payload, err := json.Marshal(products)
		if err == nil {
			_ = s.Redis.Set(ctx, cacheKey, payload, 45*time.Second).Err()
		}
	}
	return products, nil
}

func (s *Service) BuildCart(ctx context.Context, record CartRecord) (Cart, error) {
	if len(record.Items) == 0 {
		return Cart{
			ID:       record.ID,
			Items:    []CartItem{},
			Subtotal: Money{Amount: 0, Currency: "USD"},
			Total:    Money{Amount: 0, Currency: "USD"},
		}, nil
	}

	productIDs := make([]int, 0, len(record.Items))
	variantIDs := make([]int, 0, len(record.Items))
	for _, item := range record.Items {
		productIDs = append(productIDs, item.ProductID)
		variantIDs = append(variantIDs, item.VariantID)
	}

	products, err := s.DB.GetProductsByIDs(ctx, uniqueInts(productIDs))
	if err != nil {
		return Cart{}, err
	}
	variants, err := s.DB.GetVariantsByIDs(ctx, uniqueInts(variantIDs))
	if err != nil {
		return Cart{}, err
	}

	productMap := map[int]Product{}
	for _, product := range products {
		productMap[product.ID] = product
	}
	variantMap := map[int]Variant{}
	for _, variant := range variants {
		variantMap[variant.ID] = variant
	}

	cart := Cart{
		ID:       record.ID,
		Items:    []CartItem{},
		Subtotal: Money{Amount: 0, Currency: "USD"},
		Total:    Money{Amount: 0, Currency: "USD"},
	}

	for _, item := range record.Items {
		product, ok := productMap[item.ProductID]
		if !ok {
			continue
		}
		variant, ok := variantMap[item.VariantID]
		if !ok {
			continue
		}
		lineTotal := variant.Price.Amount * item.Quantity
		cartItem := CartItem{
			ID:       item.ID,
			Product:  product,
			Variant:  variant,
			Quantity: item.Quantity,
			LineTotal: Money{
				Amount:   lineTotal,
				Currency: variant.Price.Currency,
			},
		}
		cart.Items = append(cart.Items, cartItem)
		cart.Subtotal.Amount += lineTotal
	}
	cart.Total = cart.Subtotal
	return cart, nil
}

func (s *Service) CreateOrderFromCart(ctx context.Context, userID int, cartID string) (Order, error) {
	record, exists, err := s.Cart.Load(ctx, cartID)
	if err != nil || !exists {
		return Order{}, fmt.Errorf("cart not found")
	}
	cart, err := s.BuildCart(ctx, record)
	if err != nil {
		return Order{}, err
	}
	if len(cart.Items) == 0 {
		return Order{}, fmt.Errorf("cart empty")
	}
	return s.DB.CreateOrder(ctx, userID, cart)
}

func uniqueInts(input []int) []int {
	seen := map[int]struct{}{}
	result := make([]int, 0, len(input))
	for _, value := range input {
		if _, ok := seen[value]; ok {
			continue
		}
		seen[value] = struct{}{}
		result = append(result, value)
	}
	return result
}
