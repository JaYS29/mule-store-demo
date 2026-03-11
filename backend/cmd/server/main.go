package main

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"crypto/tls"
	"database/sql"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"net/mail"
	"net/smtp"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/graph-gophers/graphql-go"
	"github.com/graph-gophers/graphql-go/relay"
	"github.com/jackc/pgconn"
	"github.com/joho/godotenv"
	"github.com/redis/go-redis/v9"
	"github.com/stripe/stripe-go/v78"
	"github.com/stripe/stripe-go/v78/checkout/session"
	"github.com/stripe/stripe-go/v78/webhook"

	"store-demo-backend/graph/resolver"
	"store-demo-backend/internal/store"
)

func main() {
	// Only load local .env files when not running on Railway.
	// Railway injects environment variables itself, and loading .env there
	// would override those values (e.g. FRONTEND_URL) with local defaults.
	if os.Getenv("RAILWAY_ENVIRONMENT") == "" {
		_ = godotenv.Load("../.env", ".env")
	}

	port := getEnv("PORT", "8080")
	dbURL := getEnv("DATABASE_URL", "postgres://store:store@localhost:5432/store?sslmode=disable")
	redisURL := getEnv("REDIS_URL", "redis://localhost:6379/0")
	origin := getEnv("CORS_ORIGIN", "http://localhost:3000")

	postgres, err := store.NewPostgresStore(dbURL)
	if err != nil {
		log.Fatalf("postgres connect failed: %v", err)
	}
	defer postgres.Close()

	redisClient, err := newRedisClient(redisURL)
	if err != nil {
		log.Fatalf("redis connect failed: %v", err)
	}
	defer redisClient.Close()

	service := store.NewService(postgres, redisClient)
	stripe.Key = getEnv("STRIPE_SECRET_KEY", "")
	stripeSuccessURL := getEnv("STRIPE_SUCCESS_URL", "http://localhost:3000/checkout/success")
	stripeCancelURL := getEnv("STRIPE_CANCEL_URL", "http://localhost:3000/checkout")
	jwtSecret := []byte(getEnv("JWT_SECRET", ""))

	schemaBytes, err := os.ReadFile("graph/schema.graphqls")
	if err != nil {
		log.Fatalf("read schema failed: %v", err)
	}

	schema := graphql.MustParseSchema(string(schemaBytes), &resolver.Resolver{Service: service})
	handler := &relay.Handler{Schema: schema}

	gqlHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		user, err := getUserFromRequest(r, postgres, jwtSecret)
		if err == nil {
			ctx = resolver.ContextWithUser(ctx, user)
		}
		handler.ServeHTTP(w, r.WithContext(ctx))
	})
	http.Handle("/query", cors(origin, gqlHandler))
	http.Handle("/auth/register", cors(origin, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		var payload struct {
			FirstName string `json:"firstName"`
			LastName  string `json:"lastName"`
			Email     string `json:"email"`
			Phone     string `json:"phone"`
			Password  string `json:"password"`
		}
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			http.Error(w, "invalid payload", http.StatusBadRequest)
			return
		}
		if payload.FirstName == "" || payload.LastName == "" || payload.Email == "" || payload.Password == "" {
			http.Error(w, "missing required fields", http.StatusBadRequest)
			return
		}
		encryptedEmail := hashToken(strings.ToLower(payload.Email))
		passwordHash := hashToken(payload.Password)
		var phone *string
		if strings.TrimSpace(payload.Phone) != "" {
			phone = &payload.Phone
		}
		user := store.User{
			FirstName:      payload.FirstName,
			LastName:       payload.LastName,
			Email:          strings.ToLower(payload.Email),
			EncryptedEmail: encryptedEmail,
			PasswordHash:   passwordHash,
			Phone:          phone,
			City:           "Unknown",
			Country:        "Unknown",
		}
		userID, err := postgres.CreateUser(r.Context(), user)
		if err != nil {
			var pgErr *pgconn.PgError
			if errors.As(err, &pgErr) && pgErr.Code == "23505" {
				http.Error(w, "email already in use", http.StatusBadRequest)
				return
			}
			log.Printf("CreateUser failed: %v", err)
			http.Error(w, "registration failed", http.StatusBadRequest)
			return
		}
		token, err := generateToken(32)
		if err == nil {
			tokenHash := hashToken(token)
			if err := postgres.CreateEmailVerification(r.Context(), userID, tokenHash); err == nil {
				baseURL := getEnv("FRONTEND_URL", "http://localhost:3000")
				verifyLink := baseURL + "/verify-email?token=" + token
				go sendVerificationEmail(user.Email, verifyLink)
			}
		}
		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(map[string]bool{"ok": true}); err != nil {
			log.Printf("encode register response failed: %v", err)
		}
		log.Printf("register completed for %s in %s", user.Email, time.Since(start))
	})))
	http.Handle("/auth/verify-email", cors(origin, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		var payload struct {
			Token string `json:"token"`
		}
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			http.Error(w, "invalid payload", http.StatusBadRequest)
			return
		}
		if payload.Token == "" {
			http.Error(w, "token required", http.StatusBadRequest)
			return
		}
		verification, err := postgres.GetEmailVerificationByTokenHash(r.Context(), hashToken(payload.Token))
		if err != nil {
			http.Error(w, "invalid token", http.StatusBadRequest)
			return
		}
		if err := postgres.MarkEmailVerified(r.Context(), verification.UserID, verification.ID); err != nil {
			http.Error(w, "verification failed", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]bool{"ok": true})
	})))
	http.Handle("/auth/login", cors(origin, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		if len(jwtSecret) == 0 {
			http.Error(w, "jwt not configured", http.StatusInternalServerError)
			return
		}
		var payload struct {
			Email    string `json:"email"`
			Password string `json:"password"`
		}
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			http.Error(w, "invalid payload", http.StatusBadRequest)
			return
		}
		if payload.Email == "" || payload.Password == "" {
			http.Error(w, "missing credentials", http.StatusBadRequest)
			return
		}
		email := strings.ToLower(strings.TrimSpace(payload.Email))
		user, err := postgres.GetUserByEmail(r.Context(), email)
		if err != nil {
			http.Error(w, "invalid credentials", http.StatusUnauthorized)
			return
		}
		if user.PasswordHash != hashToken(payload.Password) {
			http.Error(w, "invalid credentials", http.StatusUnauthorized)
			return
		}
		token, err := createJWTToken(user, jwtSecret)
		if err != nil {
			http.Error(w, "token failed", http.StatusInternalServerError)
			return
		}
		http.SetCookie(w, &http.Cookie{
			Name:     "session",
			Value:    token,
			Path:     "/",
			HttpOnly: true,
			SameSite: http.SameSiteNoneMode,
			Secure:   true,
			MaxAge:   int((7 * 24 * time.Hour).Seconds()),
		})
		w.Header().Set("Content-Type", "application/json")
		phone := ""
		if user.Phone != nil {
			phone = *user.Phone
		}
		_ = json.NewEncoder(w).Encode(map[string]string{
			"id":        fmt.Sprintf("%d", user.ID),
			"firstName": user.FirstName,
			"lastName":  user.LastName,
			"email":     user.Email,
			"phone":     phone,
		})
	})))
	http.Handle("/auth/me", cors(origin, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		user, err := getUserFromRequest(r, postgres, jwtSecret)
		if err != nil {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		phone := ""
		if user.Phone != nil {
			phone = *user.Phone
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]string{
			"id":        fmt.Sprintf("%d", user.ID),
			"firstName": user.FirstName,
			"lastName":  user.LastName,
			"email":     user.Email,
			"phone":     phone,
		})
	})))
	http.Handle("/auth/logout", cors(origin, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		http.SetCookie(w, &http.Cookie{
			Name:     "session",
			Value:    "",
			Path:     "/",
			HttpOnly: true,
			SameSite: http.SameSiteNoneMode,
			Secure:   true,
			MaxAge:   -1,
		})
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]bool{"ok": true})
	})))
	http.Handle("/auth/profile/update", cors(origin, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		user, err := getUserFromRequest(r, postgres, jwtSecret)
		if err != nil {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		var payload struct {
			FirstName string `json:"firstName"`
			LastName  string `json:"lastName"`
			Phone     string `json:"phone"`
		}
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			http.Error(w, "invalid payload", http.StatusBadRequest)
			return
		}
		if payload.FirstName == "" || payload.LastName == "" {
			http.Error(w, "missing required fields", http.StatusBadRequest)
			return
		}
		var phone *string
		if strings.TrimSpace(payload.Phone) != "" {
			phone = &payload.Phone
		}
		updated := store.User{
			ID:        user.ID,
			FirstName: payload.FirstName,
			LastName:  payload.LastName,
			Phone:     phone,
		}
		if err := postgres.UpdateUserProfile(r.Context(), updated); err != nil {
			http.Error(w, "update failed", http.StatusBadRequest)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]bool{"ok": true})
	})))
	http.Handle("/auth/password/change", cors(origin, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		user, err := getUserFromRequest(r, postgres, jwtSecret)
		if err != nil {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		var payload struct {
			CurrentPassword string `json:"currentPassword"`
			NewPassword     string `json:"newPassword"`
		}
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			http.Error(w, "invalid payload", http.StatusBadRequest)
			return
		}
		if payload.CurrentPassword == "" || payload.NewPassword == "" {
			http.Error(w, "missing fields", http.StatusBadRequest)
			return
		}
		if user.PasswordHash != hashToken(payload.CurrentPassword) {
			http.Error(w, "invalid credentials", http.StatusUnauthorized)
			return
		}
		if err := postgres.UpdateUserPassword(r.Context(), user.ID, hashToken(payload.NewPassword)); err != nil {
			http.Error(w, "update failed", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]bool{"ok": true})
	})))
	http.Handle("/auth/password-reset/request", cors(origin, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		var payload struct {
			Email string `json:"email"`
		}
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			http.Error(w, "invalid payload", http.StatusBadRequest)
			return
		}
		if payload.Email == "" {
			http.Error(w, "email required", http.StatusBadRequest)
			return
		}

		email := strings.ToLower(strings.TrimSpace(payload.Email))
		user, err := postgres.GetUserByEmail(r.Context(), email)
		if err == nil {
			token, err := generateToken(32)
			if err != nil {
				log.Printf("reset token generation failed for %s: %v", email, err)
			} else {
				tokenHash := hashToken(token)
				if err := postgres.CreatePasswordReset(r.Context(), user.ID, tokenHash); err != nil {
					log.Printf("reset token save failed for %s: %v", email, err)
				} else {
					resetLink := "http://localhost:3000/reset-password?token=" + token
					sendResetEmail(user.Email, resetLink)
				}
			}
		} else if err != sql.ErrNoRows {
			log.Printf("password reset request failed for %s: %v", email, err)
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]bool{"ok": true})
	})))
	http.Handle("/checkout/stripe/session", cors(origin, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		if stripe.Key == "" {
			http.Error(w, "stripe not configured", http.StatusInternalServerError)
			return
		}
		var payload struct {
			CartID string `json:"cartId"`
			UserID int    `json:"userId"`
			Email  string `json:"email"`
		}
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			http.Error(w, "invalid payload", http.StatusBadRequest)
			return
		}
		if payload.CartID == "" || payload.UserID == 0 || payload.Email == "" {
			http.Error(w, "cart id required", http.StatusBadRequest)
			return
		}
		record, exists, err := service.Cart.Load(r.Context(), payload.CartID)
		if err != nil || !exists {
			http.Error(w, "cart not found", http.StatusBadRequest)
			return
		}
		cart, err := service.BuildCart(r.Context(), record)
		if err != nil || len(cart.Items) == 0 {
			http.Error(w, "cart empty", http.StatusBadRequest)
			return
		}

		lineItems := make([]*stripe.CheckoutSessionLineItemParams, 0, len(cart.Items))
		for _, item := range cart.Items {
			lineItems = append(lineItems, &stripe.CheckoutSessionLineItemParams{
				Quantity: stripe.Int64(int64(item.Quantity)),
				PriceData: &stripe.CheckoutSessionLineItemPriceDataParams{
					Currency:   stripe.String(strings.ToLower(item.Variant.Price.Currency)),
					UnitAmount: stripe.Int64(int64(item.Variant.Price.Amount)),
					ProductData: &stripe.CheckoutSessionLineItemPriceDataProductDataParams{
						Name: stripe.String(fmt.Sprintf("%s · %s", item.Product.Name, item.Variant.Name)),
					},
				},
			})
		}

		params := &stripe.CheckoutSessionParams{
			Mode:          stripe.String(string(stripe.CheckoutSessionModePayment)),
			SuccessURL:    stripe.String(stripeSuccessURL),
			CancelURL:     stripe.String(stripeCancelURL),
			CustomerEmail: stripe.String(payload.Email),
			Metadata: map[string]string{
				"cart_id": payload.CartID,
				"user_id": fmt.Sprintf("%d", payload.UserID),
			},
			LineItems: lineItems,
		}
		s, err := session.New(params)
		if err != nil {
			http.Error(w, "stripe session failed", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]string{"url": s.URL})
	})))
	http.Handle("/checkout/stripe/webhook", cors(origin, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		payload, err := io.ReadAll(r.Body)
		if err != nil {
			http.Error(w, "invalid payload", http.StatusBadRequest)
			return
		}
		webhookSecret := getEnv("STRIPE_WEBHOOK_SECRET", "")
		var event stripe.Event
		if webhookSecret != "" {
			event, err = webhook.ConstructEvent(payload, r.Header.Get("Stripe-Signature"), webhookSecret)
			if err != nil {
				http.Error(w, "signature verification failed", http.StatusBadRequest)
				return
			}
		} else {
			if err := json.Unmarshal(payload, &event); err != nil {
				http.Error(w, "invalid event", http.StatusBadRequest)
				return
			}
		}

		if event.Type == "checkout.session.completed" {
			var s stripe.CheckoutSession
			if err := json.Unmarshal(event.Data.Raw, &s); err == nil {
				cartID := s.Metadata["cart_id"]
				userID, _ := strconv.Atoi(s.Metadata["user_id"])
				if cartID != "" && userID != 0 {
					order, err := service.CreateOrderFromCart(r.Context(), userID, cartID)
					if err == nil {
						sendReceiptEmail(s.CustomerEmail, order.Items, order.Total.Amount, order.Total.Currency)
					}
				}
			}
		}
		w.WriteHeader(http.StatusOK)
	})))
	http.Handle("/orders", cors(origin, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		user, err := getUserFromRequest(r, postgres, jwtSecret)
		if err != nil {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		orders, err := postgres.ListOrdersByUserID(r.Context(), user.ID)
		if err != nil {
			http.Error(w, "orders fetch failed", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string][]store.Order{"orders": orders})
	})))
	http.Handle("/orders/create", cors(origin, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		user, err := getUserFromRequest(r, postgres, jwtSecret)
		if err != nil {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		var payload struct {
			CartID string `json:"cartId"`
			Items  []struct {
				ProductID int `json:"productId"`
				VariantID int `json:"variantId"`
				Quantity  int `json:"quantity"`
			} `json:"items"`
		}
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			http.Error(w, "invalid payload", http.StatusBadRequest)
			return
		}
		if payload.CartID == "" && len(payload.Items) == 0 {
			http.Error(w, "missing fields", http.StatusBadRequest)
			return
		}
		var order store.Order
		if payload.CartID != "" {
			order, err = service.CreateOrderFromCart(r.Context(), user.ID, payload.CartID)
		}
		if err != nil {
			if len(payload.Items) == 0 || (!strings.Contains(err.Error(), "cart not found") && !strings.Contains(err.Error(), "cart empty")) {
				http.Error(w, err.Error(), http.StatusBadRequest)
				return
			}
		}
		if len(payload.Items) > 0 && (order.ID == 0) {
			record := store.CartRecord{
				ID:    uuid.NewString(),
				Items: []store.CartItemRecord{},
			}
			for _, item := range payload.Items {
				if item.ProductID == 0 || item.VariantID == 0 || item.Quantity <= 0 {
					continue
				}
				record.Items = append(record.Items, store.CartItemRecord{
					ID:        uuid.NewString(),
					ProductID: item.ProductID,
					VariantID: item.VariantID,
					Quantity:  item.Quantity,
				})
			}
			cart, buildErr := service.BuildCart(r.Context(), record)
			if buildErr != nil || len(cart.Items) == 0 {
				http.Error(w, "order failed", http.StatusBadRequest)
				return
			}
			order, err = postgres.CreateOrder(r.Context(), user.ID, cart)
			if err != nil {
				http.Error(w, err.Error(), http.StatusBadRequest)
				return
			}
		}
		sendReceiptEmail(user.Email, order.Items, order.Total.Amount, order.Total.Currency)
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]int{"orderId": order.ID})
	})))
	http.Handle("/orders/repeat", cors(origin, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		var payload struct {
			OrderID int `json:"orderId"`
		}
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			http.Error(w, "invalid payload", http.StatusBadRequest)
			return
		}
		if payload.OrderID == 0 {
			http.Error(w, "order id required", http.StatusBadRequest)
			return
		}
		order, err := postgres.GetOrderByID(r.Context(), payload.OrderID)
		if err != nil {
			http.Error(w, "order not found", http.StatusBadRequest)
			return
		}
		record := store.CartRecord{
			ID:    uuid.NewString(),
			Items: []store.CartItemRecord{},
		}
		for _, item := range order.Items {
			record.Items = append(record.Items, store.CartItemRecord{
				ID:        uuid.NewString(),
				ProductID: item.ProductID,
				VariantID: item.VariantID,
				Quantity:  item.Quantity,
			})
		}
		if err := service.Cart.Save(r.Context(), record); err != nil {
			http.Error(w, "cart create failed", http.StatusInternalServerError)
			return
		}
		cart, err := service.BuildCart(r.Context(), record)
		if err != nil {
			http.Error(w, "cart create failed", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(cart)
	})))
	http.Handle("/checkout/receipt", cors(origin, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		var payload struct {
			Email string `json:"email"`
			Items []struct {
				Name     string `json:"name"`
				Quantity int    `json:"quantity"`
				Price    int    `json:"price"`
				Currency string `json:"currency"`
			} `json:"items"`
			Total    int    `json:"total"`
			Currency string `json:"currency"`
		}
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			http.Error(w, "invalid payload", http.StatusBadRequest)
			return
		}
		if payload.Email == "" || len(payload.Items) == 0 {
			http.Error(w, "missing fields", http.StatusBadRequest)
			return
		}
		converted := make([]store.OrderItem, 0, len(payload.Items))
		for _, item := range payload.Items {
			lineTotal := item.Price * item.Quantity
			converted = append(converted, store.OrderItem{
				ProductName: item.Name,
				Quantity:    item.Quantity,
				LineTotal:   lineTotal,
			})
		}
		sendReceiptEmail(payload.Email, converted, payload.Total, payload.Currency)
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]bool{"ok": true})
	})))
	http.Handle("/auth/password-reset/confirm", cors(origin, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		var payload struct {
			Token    string `json:"token"`
			Password string `json:"password"`
		}
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			http.Error(w, "invalid payload", http.StatusBadRequest)
			return
		}
		if payload.Token == "" || payload.Password == "" {
			http.Error(w, "token and password required", http.StatusBadRequest)
			return
		}

		reset, err := postgres.GetPasswordResetByTokenHash(r.Context(), hashToken(payload.Token))
		if err != nil {
			http.Error(w, "invalid token", http.StatusBadRequest)
			return
		}
		passwordHash := hashToken(payload.Password)
		if err := postgres.UpdateUserPassword(r.Context(), reset.UserID, passwordHash); err != nil {
			http.Error(w, "update failed", http.StatusInternalServerError)
			return
		}
		if err := postgres.MarkPasswordResetUsed(r.Context(), reset.ID); err != nil {
			http.Error(w, "update failed", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]bool{"ok": true})
	})))
	http.HandleFunc("/playground", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		_, _ = w.Write([]byte(playgroundHTML))
	})
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	log.Printf("GraphQL API running on :%s/query", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}

const playgroundHTML = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>GraphQL Playground</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="stylesheet" href="https://unpkg.com/graphiql@1.8.5/graphiql.min.css" />
    <style>
      html, body, #root { height: 100%; margin: 0; }
      body { background: #f3f4f6; }
    </style>
    <script src="https://unpkg.com/react@16.14.0/umd/react.production.min.js"></script>
    <script src="https://unpkg.com/react-dom@16.14.0/umd/react-dom.production.min.js"></script>
    <script src="https://unpkg.com/graphiql@1.8.5/graphiql.min.js"></script>
  </head>
  <body>
    <div id="root"></div>
    <script>
      const fetcher = GraphiQL.createFetcher({ url: "/query" });
      ReactDOM.render(
        React.createElement(GraphiQL, { fetcher }),
        document.getElementById("root")
      );
    </script>
  </body>
</html>`

func newRedisClient(redisURL string) (*redis.Client, error) {
	options, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, err
	}
	client := redis.NewClient(options)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := client.Ping(ctx).Err(); err != nil {
		return nil, err
	}
	return client, nil
}

func cors(origin string, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", origin)
		w.Header().Set("Vary", "Origin")
		w.Header().Set("Access-Control-Allow-Credentials", "true")
		if requested := r.Header.Get("Access-Control-Request-Headers"); requested != "" {
			w.Header().Set("Access-Control-Allow-Headers", requested)
		} else {
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		}
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func generateToken(length int) (string, error) {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(bytes), nil
}

func hashToken(value string) string {
	hash := sha256.Sum256([]byte(value))
	return hex.EncodeToString(hash[:])
}

func sendResetEmail(email, resetLink string) {
	host := getEnv("SMTP_HOST", "")
	port := getEnv("SMTP_PORT", "587")
	user := getEnv("SMTP_USER", "")
	pass := getEnv("SMTP_PASS", "")
	from := getEnv("SMTP_FROM", user)
	fromAddress := from
	if parsed, err := mail.ParseAddress(from); err == nil {
		fromAddress = parsed.Address
	}

	if host == "" || user == "" || pass == "" || from == "" {
		log.Printf("SMTP not configured, reset link for %s: %s", email, resetLink)
		return
	}

	subject := "Reset your Mule Store password"
	htmlBody := fmt.Sprintf(
		`<div style="font-family: 'Inter', system-ui, sans-serif; background: #f9fafb; padding: 32px;">
  <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 24px; padding: 28px;">
    <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280; margin: 0 0 8px;">Mule Store</p>
    <h1 style="font-size: 22px; margin: 0 0 12px; color: #111827;">Reset your password</h1>
    <p style="margin: 0 0 16px; color: #4b5563;">We received a request to reset your password. Click the button below to set a new password.</p>
    <a href="%s" style="display: inline-block; background: #111827; color: #ffffff; text-decoration: none; padding: 10px 18px; border-radius: 999px; font-weight: 600; font-size: 14px;">Reset password</a>
    <p style="margin: 16px 0 0; font-size: 12px; color: #9ca3af;">If you didn’t request this, you can safely ignore this email.</p>
  </div>
</div>`, resetLink,
	)

	message := strings.Join([]string{
		fmt.Sprintf("From: %s", from),
		fmt.Sprintf("To: %s", email),
		fmt.Sprintf("Subject: %s", subject),
		"MIME-Version: 1.0",
		"Content-Type: text/html; charset=UTF-8",
		"",
		htmlBody,
	}, "\r\n")

	addr := net.JoinHostPort(host, port)
	client, err := smtp.Dial(addr)
	if err != nil {
		log.Printf("SMTP dial failed: %v", err)
		return
	}
	defer func() { _ = client.Quit() }()

	if ok, _ := client.Extension("STARTTLS"); ok {
		tlsConfig := &tls.Config{ServerName: host}
		if err := client.StartTLS(tlsConfig); err != nil {
			log.Printf("SMTP STARTTLS failed: %v", err)
			return
		}
	}

	auth := smtp.PlainAuth("", user, pass, host)
	if err := client.Auth(auth); err != nil {
		log.Printf("SMTP auth failed: %v", err)
		return
	}
	if err := client.Mail(fromAddress); err != nil {
		log.Printf("SMTP from failed: %v", err)
		return
	}
	if err := client.Rcpt(email); err != nil {
		log.Printf("SMTP rcpt failed: %v", err)
		return
	}
	writer, err := client.Data()
	if err != nil {
		log.Printf("SMTP data failed: %v", err)
		return
	}
	if _, err := writer.Write([]byte(message)); err != nil {
		log.Printf("SMTP write failed: %v", err)
		return
	}
	_ = writer.Close()
}

func sendVerificationEmail(email, verifyLink string) {
	host := getEnv("SMTP_HOST", "")
	port := getEnv("SMTP_PORT", "587")
	user := getEnv("SMTP_USER", "")
	pass := getEnv("SMTP_PASS", "")
	from := getEnv("SMTP_FROM", user)

	if host == "" || user == "" || pass == "" || from == "" {
		log.Printf("SMTP not configured, verify link for %s: %s", email, verifyLink)
		return
	}

	subject := "Verify your Mule Store email"
	htmlBody := fmt.Sprintf(
		`<div style="font-family: 'Inter', system-ui, sans-serif; background: #f9fafb; padding: 32px;">
  <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 24px; padding: 28px;">
    <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280; margin: 0 0 8px;">Mule Store</p>
    <h1 style="font-size: 22px; margin: 0 0 12px; color: #111827;">Verify your email</h1>
    <p style="margin: 0 0 16px; color: #4b5563;">Confirm your email address to finish setting up your account.</p>
    <a href="%s" style="display: inline-block; background: #111827; color: #ffffff; text-decoration: none; padding: 10px 18px; border-radius: 999px; font-weight: 600; font-size: 14px;">Verify email</a>
    <p style="margin: 16px 0 0; font-size: 12px; color: #9ca3af;">If you didn’t request this, you can safely ignore this email.</p>
  </div>
</div>`, verifyLink,
	)

	fromAddress := from
	if parsed, err := mail.ParseAddress(from); err == nil {
		fromAddress = parsed.Address
	}

	message := strings.Join([]string{
		fmt.Sprintf("From: %s", from),
		fmt.Sprintf("To: %s", email),
		fmt.Sprintf("Subject: %s", subject),
		"MIME-Version: 1.0",
		"Content-Type: text/html; charset=UTF-8",
		"",
		htmlBody,
	}, "\r\n")

	addr := net.JoinHostPort(host, port)
	client, err := smtp.Dial(addr)
	if err != nil {
		log.Printf("SMTP dial failed: %v", err)
		return
	}
	defer func() { _ = client.Quit() }()

	if ok, _ := client.Extension("STARTTLS"); ok {
		tlsConfig := &tls.Config{ServerName: host}
		if err := client.StartTLS(tlsConfig); err != nil {
			log.Printf("SMTP STARTTLS failed: %v", err)
			return
		}
	}

	auth := smtp.PlainAuth("", user, pass, host)
	if err := client.Auth(auth); err != nil {
		log.Printf("SMTP auth failed: %v", err)
		return
	}
	if err := client.Mail(fromAddress); err != nil {
		log.Printf("SMTP from failed: %v", err)
		return
	}
	if err := client.Rcpt(email); err != nil {
		log.Printf("SMTP rcpt failed: %v", err)
		return
	}
	writer, err := client.Data()
	if err != nil {
		log.Printf("SMTP data failed: %v", err)
		return
	}
	if _, err := writer.Write([]byte(message)); err != nil {
		log.Printf("SMTP write failed: %v", err)
		return
	}
	_ = writer.Close()
}

func sendReceiptEmail(email string, items []store.OrderItem, total int, currency string) {
	host := getEnv("SMTP_HOST", "")
	port := getEnv("SMTP_PORT", "587")
	user := getEnv("SMTP_USER", "")
	pass := getEnv("SMTP_PASS", "")
	from := getEnv("SMTP_FROM", user)

	if host == "" || user == "" || pass == "" || from == "" {
		log.Printf("SMTP not configured, receipt for %s", email)
		return
	}

	subject := "Your Mule Store receipt"
	rows := ""
	for _, item := range items {
		lineTotal := float64(item.LineTotal) / 100.0
		rows += fmt.Sprintf(
			`<tr>
  <td style="padding: 8px 0; color: #111827;">%s</td>
  <td style="padding: 8px 0; color: #6b7280; text-align: center;">%d</td>
  <td style="padding: 8px 0; color: #111827; text-align: right;">%.2f %s</td>
</tr>`, item.ProductName, item.Quantity, lineTotal, strings.ToUpper(currency))
	}
	totalFormatted := fmt.Sprintf("%.2f %s", float64(total)/100.0, strings.ToUpper(currency))
	htmlBody := fmt.Sprintf(
		`<div style="font-family: 'Inter', system-ui, sans-serif; background: #f9fafb; padding: 32px;">
  <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 24px; padding: 28px;">
    <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280; margin: 0 0 8px;">Mule Store</p>
    <h1 style="font-size: 22px; margin: 0 0 12px; color: #111827;">Thanks for your purchase</h1>
    <p style="margin: 0 0 16px; color: #4b5563;">Here is your order summary.</p>
    <table style="width: 100%%; border-collapse: collapse; font-size: 14px;">
      <thead>
        <tr>
          <th style="text-align: left; padding-bottom: 6px; color: #6b7280; font-weight: 600;">Item</th>
          <th style="text-align: center; padding-bottom: 6px; color: #6b7280; font-weight: 600;">Qty</th>
          <th style="text-align: right; padding-bottom: 6px; color: #6b7280; font-weight: 600;">Price</th>
        </tr>
      </thead>
      <tbody>
        %s
      </tbody>
    </table>
    <div style="margin-top: 16px; border-top: 1px solid #e5e7eb; padding-top: 12px; display: flex; justify-content: space-between; font-weight: 600; color: #111827;">
      <span style="margin-right: 8px;">Total</span>
      <span>%s</span>
    </div>
  </div>
</div>`, rows, totalFormatted,
	)

	fromAddress := from
	if parsed, err := mail.ParseAddress(from); err == nil {
		fromAddress = parsed.Address
	}

	message := strings.Join([]string{
		fmt.Sprintf("From: %s", from),
		fmt.Sprintf("To: %s", email),
		fmt.Sprintf("Subject: %s", subject),
		"MIME-Version: 1.0",
		"Content-Type: text/html; charset=UTF-8",
		"",
		htmlBody,
	}, "\r\n")

	addr := net.JoinHostPort(host, port)
	client, err := smtp.Dial(addr)
	if err != nil {
		log.Printf("SMTP dial failed: %v", err)
		return
	}
	defer func() { _ = client.Quit() }()

	if ok, _ := client.Extension("STARTTLS"); ok {
		tlsConfig := &tls.Config{ServerName: host}
		if err := client.StartTLS(tlsConfig); err != nil {
			log.Printf("SMTP STARTTLS failed: %v", err)
			return
		}
	}

	auth := smtp.PlainAuth("", user, pass, host)
	if err := client.Auth(auth); err != nil {
		log.Printf("SMTP auth failed: %v", err)
		return
	}
	if err := client.Mail(fromAddress); err != nil {
		log.Printf("SMTP from failed: %v", err)
		return
	}
	if err := client.Rcpt(email); err != nil {
		log.Printf("SMTP rcpt failed: %v", err)
		return
	}
	writer, err := client.Data()
	if err != nil {
		log.Printf("SMTP data failed: %v", err)
		return
	}
	if _, err := writer.Write([]byte(message)); err != nil {
		log.Printf("SMTP write failed: %v", err)
		return
	}
	_ = writer.Close()
}

type SessionClaims struct {
	UserID int    `json:"userId"`
	Email  string `json:"email"`
	jwt.RegisteredClaims
}

func createJWTToken(user store.User, secret []byte) (string, error) {
	claims := SessionClaims{
		UserID: user.ID,
		Email:  user.Email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(7 * 24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(secret)
}

func getUserFromRequest(r *http.Request, postgres *store.PostgresStore, secret []byte) (store.User, error) {
	if len(secret) == 0 {
		return store.User{}, fmt.Errorf("jwt not configured")
	}
	cookie, err := r.Cookie("session")
	if err != nil || cookie.Value == "" {
		return store.User{}, fmt.Errorf("missing session")
	}
	token, err := jwt.ParseWithClaims(cookie.Value, &SessionClaims{}, func(token *jwt.Token) (interface{}, error) {
		return secret, nil
	})
	if err != nil || !token.Valid {
		return store.User{}, fmt.Errorf("invalid session")
	}
	claims, ok := token.Claims.(*SessionClaims)
	if !ok || claims.UserID == 0 {
		return store.User{}, fmt.Errorf("invalid session")
	}
	return postgres.GetUserByID(r.Context(), claims.UserID)
}
