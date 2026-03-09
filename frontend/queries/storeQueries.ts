export const STORE_PAGE_QUERY = `
  query StorePage {
    store {
      id
      slug
      name
      heroTitle
      heroSubtitle
      heroImage
      products {
        id
        name
        slug
        storeSlug
        imageUrl
        storeName
        price { amount currency }
      }
    }
    stores {
      id
      slug
      name
      heroTitle
      heroSubtitle
      heroImage
      followersCount
    }
  }
`;

export const STORE_SETUP_QUERY = `
  query StoreSetup {
    myStore {
      id
      name
      heroTitle
      heroSubtitle
      heroImage
    }
  }
`;

export const CREATE_STORE_MUTATION = `
  mutation CreateStore($input: CreateStoreInput!) {
    createStore(input: $input) {
      id
      name
      heroTitle
      heroSubtitle
      heroImage
    }
  }
`;

export const UPDATE_STORE_MUTATION = `
  mutation UpdateStore($id: ID!, $input: UpdateStoreInput!) {
    updateStore(id: $id, input: $input) {
      id
      name
      heroTitle
      heroSubtitle
      heroImage
    }
  }
`;

export const STORE_CATALOG_QUERY = `
  query StoreCatalog {
    myStore {
      id
      slug
      name
      products {
        id
        name
        slug
        storeSlug
        imageUrl
        variants {
          id
          name
          sku
          price { amount currency }
        }
      }
    }
  }
`;

export const CREATE_PRODUCT_MUTATION = `
  mutation CreateProduct($input: CreateProductInput!) {
    createProduct(input: $input) {
      id
      name
      slug
      imageUrl
      variants {
        id
        name
        sku
        price { amount currency }
      }
    }
  }
`;

export const PRODUCT_TEMPLATES_QUERY = `
  query ProductTemplates {
    productTemplates {
      id
      name
      slug
      imageUrl
      variants {
        id
        name
        sku
        price { amount currency }
      }
    }
  }
`;

export const CREATE_STORE_PRODUCT_MUTATION = `
  mutation CreateStoreProduct($input: CreateStoreProductInput!) {
    createStoreProduct(input: $input) {
      id
      name
      slug
      storeSlug
      imageUrl
      variants {
        id
        name
        sku
        price { amount currency }
      }
    }
  }
`;

export const DELETE_STORE_PRODUCT_MUTATION = `
  mutation DeleteStoreProduct($productId: ID!) {
    deleteStoreProduct(productId: $productId)
  }
`;
