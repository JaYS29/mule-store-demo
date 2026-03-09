type GraphQLResponse<T> = {
  data?: T;
  errors?: { message: string }[];
};

export async function gqlRequest<T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const endpoint =
    process.env.NEXT_PUBLIC_GRAPHQL_URL ?? "http://localhost:8080/query";

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed: ${response.status}`);
  }

  const payload = (await response.json()) as GraphQLResponse<T>;
  if (payload.errors?.length) {
    throw new Error(payload.errors.map((err) => err.message).join(", "));
  }
  if (!payload.data) {
    throw new Error("GraphQL response missing data");
  }
  return payload.data;
}
