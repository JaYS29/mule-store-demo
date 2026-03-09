package store

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

type CartStore struct {
	client *redis.Client
	ttl    time.Duration
}

func NewCartStore(client *redis.Client) *CartStore {
	return &CartStore{client: client, ttl: 24 * time.Hour}
}

func (c *CartStore) Load(ctx context.Context, id string) (CartRecord, bool, error) {
	if id == "" {
		return CartRecord{}, false, nil
	}
	value, err := c.client.Get(ctx, c.key(id)).Result()
	if errors.Is(err, redis.Nil) {
		return CartRecord{}, false, nil
	}
	if err != nil {
		return CartRecord{}, false, err
	}
	var record CartRecord
	if err := json.Unmarshal([]byte(value), &record); err != nil {
		return CartRecord{}, false, err
	}
	return record, true, nil
}

func (c *CartStore) Save(ctx context.Context, record CartRecord) error {
	payload, err := json.Marshal(record)
	if err != nil {
		return err
	}
	return c.client.Set(ctx, c.key(record.ID), payload, c.ttl).Err()
}

func (c *CartStore) AddItem(ctx context.Context, cartID string, productID, variantID, quantity int) (CartRecord, error) {
	record, exists, err := c.Load(ctx, cartID)
	if err != nil {
		return CartRecord{}, err
	}
	if !exists {
		record = CartRecord{
			ID:    uuid.NewString(),
			Items: []CartItemRecord{},
		}
	}
	itemID := uuid.NewString()
	record.Items = append(record.Items, CartItemRecord{
		ID:        itemID,
		ProductID: productID,
		VariantID: variantID,
		Quantity:  quantity,
	})
	if err := c.Save(ctx, record); err != nil {
		return CartRecord{}, err
	}
	return record, nil
}

func (c *CartStore) UpdateItem(ctx context.Context, cartID, itemID string, quantity int) (CartRecord, error) {
	record, exists, err := c.Load(ctx, cartID)
	if err != nil {
		return CartRecord{}, err
	}
	if !exists {
		return CartRecord{}, fmt.Errorf("cart not found")
	}
	for i := range record.Items {
		if record.Items[i].ID == itemID {
			record.Items[i].Quantity = quantity
			return record, c.Save(ctx, record)
		}
	}
	return CartRecord{}, fmt.Errorf("item not found")
}

func (c *CartStore) RemoveItem(ctx context.Context, cartID, itemID string) (CartRecord, error) {
	record, exists, err := c.Load(ctx, cartID)
	if err != nil {
		return CartRecord{}, err
	}
	if !exists {
		return CartRecord{}, fmt.Errorf("cart not found")
	}
	next := make([]CartItemRecord, 0, len(record.Items))
	for _, item := range record.Items {
		if item.ID != itemID {
			next = append(next, item)
		}
	}
	record.Items = next
	return record, c.Save(ctx, record)
}

func (c *CartStore) key(id string) string {
	return fmt.Sprintf("cart:%s", id)
}
