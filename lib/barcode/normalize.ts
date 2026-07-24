export function normalizeProductCode(raw: string): string {
  return raw.trim().replace(/\s+/g, "");
}

export function looksLikeProductCode(query: string): boolean {
  const n = normalizeProductCode(query);
  if (n.length < 4) return false;
  if (/^\d{6,}$/.test(n)) return true;
  if (n.length >= 8 && !/\s/.test(query.trim()) && query.trim().split(/\s+/).length === 1) {
    return true;
  }
  return false;
}
