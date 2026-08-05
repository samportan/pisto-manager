/** Escape `%`, `_`, and `\` for SQL ILIKE ... ESCAPE '\' patterns. */
export function escapeIlikePattern(term: string): string {
  return term.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export function quotePostgrestValue(value: string): string {
  return `"${value.replace(/"/g, '\\"')}"`;
}

export function ilikeOrPart(column: string, pattern: string): string {
  return `${column}.ilike.${quotePostgrestValue(pattern)}`;
}

export function inOrPart(column: string, ids: string[]): string | null {
  if (ids.length === 0) return null;
  return `${column}.in.(${ids.join(",")})`;
}
