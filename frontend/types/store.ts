export type Money = {
  amount: number;
  currency: string;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  imageUrl: string;
  storeName: string;
  storeSlug?: string;
  price: Money;
};

export type Section = {
  id: string;
  title: string;
  products: Product[];
};

export type Store = {
  id: string;
  slug?: string;
  name: string;
  heroTitle: string;
  heroSubtitle: string;
  heroImage: string;
  followersCount: number;
  sections?: Section[];
  products?: Product[];
};

export type StoreResponse = {
  store: Store;
  stores: Store[];
};
