export function normalizeImageUrl(url: string) {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    if (parsed.hostname.startsWith("photo-")) {
      return `https://images.unsplash.com/${parsed.hostname}${parsed.search}`;
    }
    return url;
  } catch {
    return url;
  }
}
