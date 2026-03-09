export function formatMoney(
  amount: number | null | undefined,
  currency: string | null | undefined
) {
  const safeAmount = typeof amount === "number" ? amount : 0;
  const safeCurrency = currency ?? "USD";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: safeCurrency,
  }).format(safeAmount / 100);
}
