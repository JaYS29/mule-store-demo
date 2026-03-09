export const STORES_PAGE_QUERY = `
  query StoresPage {
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

export const STORE_DETAIL_QUERY = `
  query StoreBySlug($slug: String!) {
    storeBySlug(slug: $slug) {
      id
      slug
      name
      heroTitle
      heroSubtitle
      heroImage
      followersCount
      isFollowing
      products {
        id
        name
        slug
        storeSlug
        imageUrl
        price { amount currency }
      }
    }
  }
`;

export const STORE_FOLLOW_QUERY = `
  query StoreFollowStatus($id: ID!) {
    storeById(id: $id) {
      id
      isFollowing
    }
  }
`;

export const FOLLOW_STORE_MUTATION = `
  mutation FollowStore($storeId: ID!) {
    followStore(storeId: $storeId) {
      id
      followersCount
      isFollowing
    }
  }
`;

export const UNFOLLOW_STORE_MUTATION = `
  mutation UnfollowStore($storeId: ID!) {
    unfollowStore(storeId: $storeId) {
      id
      followersCount
      isFollowing
    }
  }
`;
