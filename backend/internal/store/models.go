package store

import "time"

type Money struct {
	Amount   int    `json:"amount"`
	Currency string `json:"currency"`
}

type Store struct {
	ID             int
	UserID         *int
	Slug           string
	Name           string
	HeroTitle      string
	HeroSubtitle   string
	HeroImage      string
	FollowersCount int
	Sections       []Section
}

type Section struct {
	ID       int
	Title    string
	Products []Product
}

type Product struct {
	ID          int
	StoreID     int
	StoreName   string
	StoreSlug   string
	Name        string
	Slug        string
	Description string
	ImageURL    string
	Price       Money
	Variants    []Variant
}

type Variant struct {
	ID        int
	ProductID int
	Name      string
	SKU       string
	Price     Money
}

type Cart struct {
	ID       string
	Items    []CartItem
	Subtotal Money
	Total    Money
}

type CartItem struct {
	ID        string
	Product   Product
	Variant   Variant
	Quantity  int
	LineTotal Money
}

type User struct {
	ID              int
	FirstName       string
	LastName        string
	Email           string
	EncryptedEmail  string
	PasswordHash    string
	Phone           *string
	EmailVerifiedAt *time.Time
	City            string
	Country         string
}

type PasswordReset struct {
	ID        int
	UserID    int
	TokenHash string
	ExpiresAt time.Time
	UsedAt    *time.Time
}

type EmailVerification struct {
	ID         int
	UserID     int
	TokenHash  string
	ExpiresAt  time.Time
	VerifiedAt *time.Time
}

type Order struct {
	ID        int
	UserID    int
	Total     Money
	CreatedAt time.Time
	Items     []OrderItem
}

type OrderItem struct {
	ID          int
	OrderID     int
	ProductID   int
	VariantID   int
	Quantity    int
	UnitPrice   int
	LineTotal   int
	ProductName string
	VariantName string
	ImageURL    string
}

type CartRecord struct {
	ID    string           `json:"id"`
	Items []CartItemRecord `json:"items"`
}

type CartItemRecord struct {
	ID        string `json:"id"`
	ProductID int    `json:"productId"`
	VariantID int    `json:"variantId"`
	Quantity  int    `json:"quantity"`
}
