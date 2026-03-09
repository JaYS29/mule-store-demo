export type Money = {
  amount: number;
  currency: string;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  storeSlug?: string;
  imageUrl: string;
  price: Money;
};

export type Store = {
  id: string;
  slug?: string;
  name: string;
  heroTitle: string;
  heroSubtitle: string;
  heroImage: string;
  followersCount: number;
  isFollowing?: boolean;
  products?: Product[];
};

export type StoresResponse = {
  stores: Store[];
};

export type StoreResponse = {
  storeBySlug: Store | null;
  storeById?: Store | null;
};
