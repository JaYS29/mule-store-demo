"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { gqlRequest } from "@/lib/graphql";

type Money = {
  amount: number;
  currency: string;
};

type Variant = {
  id: string;
  name: string;
  sku: string;
  price: Money;
};

type Product = {
  id: string;
  name: string;
  slug: string;
  imageUrl: string;
  price: Money;
};

type CartItem = {
  id: string;
  product: Product;
  variant: Variant;
  quantity: number;
  lineTotal: Money;
};

type Cart = {
  id: string;
  items: CartItem[];
  subtotal: Money;
  total: Money;
};

type CartContextValue = {
  cart: Cart | null;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  replaceCart: (nextCart: Cart) => void;
  clearCart: () => void;
  addToCart: (
    productId: string,
    variantId: string,
    quantity?: number
  ) => Promise<void>;
  updateItem: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

const CART_KEY = "store-demo-cart-id";
const CART_SNAPSHOT_KEY = "store-demo-cart";
const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

const cartMutation = `
  mutation AddToCart($cartId: ID, $productId: ID!, $variantId: ID!, $quantity: Int!) {
    addToCart(cartId: $cartId, productId: $productId, variantId: $variantId, quantity: $quantity) {
      id
      subtotal { amount currency }
      total { amount currency }
      items {
        id
        quantity
        lineTotal { amount currency }
        product { id name slug imageUrl price { amount currency } }
        variant { id name sku price { amount currency } }
      }
    }
  }
`;

const updateMutation = `
  mutation UpdateCartItem($cartId: ID!, $itemId: ID!, $quantity: Int!) {
    updateCartItem(cartId: $cartId, itemId: $itemId, quantity: $quantity) {
      id
      subtotal { amount currency }
      total { amount currency }
      items {
        id
        quantity
        lineTotal { amount currency }
        product { id name slug imageUrl price { amount currency } }
        variant { id name sku price { amount currency } }
      }
    }
  }
`;

const removeMutation = `
  mutation RemoveCartItem($cartId: ID!, $itemId: ID!) {
    removeCartItem(cartId: $cartId, itemId: $itemId) {
      id
      subtotal { amount currency }
      total { amount currency }
      items {
        id
        quantity
        lineTotal { amount currency }
        product { id name slug imageUrl price { amount currency } }
        variant { id name sku price { amount currency } }
      }
    }
  }
`;

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [cartId, setCartId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(CART_KEY);
    if (stored) {
      setCartId(stored);
    }
  }, []);

  const openCart = () => setIsOpen(true);
  const closeCart = () => setIsOpen(false);

  const addToCart = async (
    productId: string,
    variantId: string,
    quantity = 1
  ) => {
    if (typeof window !== "undefined") {
      const res = await fetch(`${apiBase}/auth/me`, {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("login-required");
      }
    }
    const result = await gqlRequest<{ addToCart: Cart }>(cartMutation, {
      cartId,
      productId,
      variantId,
      quantity,
    });
    setCart(result.addToCart);
    setCartId(result.addToCart.id);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(CART_KEY, result.addToCart.id);
      window.localStorage.setItem(
        CART_SNAPSHOT_KEY,
        JSON.stringify(result.addToCart)
      );
    }
    setIsOpen(true);
  };

  const updateItem = async (itemId: string, quantity: number) => {
    if (!cartId) return;
    const result = await gqlRequest<{ updateCartItem: Cart }>(updateMutation, {
      cartId,
      itemId,
      quantity,
    });
    setCart(result.updateCartItem);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        CART_SNAPSHOT_KEY,
        JSON.stringify(result.updateCartItem)
      );
    }
  };

  const removeItem = async (itemId: string) => {
    if (!cartId) return;
    const result = await gqlRequest<{ removeCartItem: Cart }>(removeMutation, {
      cartId,
      itemId,
    });
    setCart(result.removeCartItem);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        CART_SNAPSHOT_KEY,
        JSON.stringify(result.removeCartItem)
      );
    }
  };

  const replaceCart = (nextCart: Cart) => {
    setCart(nextCart);
    setCartId(nextCart.id);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(CART_KEY, nextCart.id);
      window.localStorage.setItem(CART_SNAPSHOT_KEY, JSON.stringify(nextCart));
    }
  };

  const clearCart = () => {
    setCart(null);
    setCartId(null);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(CART_KEY);
      window.localStorage.removeItem(CART_SNAPSHOT_KEY);
    }
  };

  const value = useMemo(
    () => ({
      cart,
      isOpen,
      openCart,
      closeCart,
      replaceCart,
      clearCart,
      addToCart,
      updateItem,
      removeItem,
    }),
    [cart, isOpen]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
}
