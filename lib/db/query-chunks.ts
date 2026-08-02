/** Keep PostgREST `in.(...)` filters under common URL length limits (~8KB). */
export const POSTGREST_IN_CHUNK_SIZE = 80;

/** Supabase/PostgREST default max rows per request. */
export const POSTGREST_PAGE_SIZE = 1000;

export function chunkIds(ids: string[], size = POSTGREST_IN_CHUNK_SIZE): string[][] {
  if (ids.length === 0) return [];
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += size) {
    chunks.push(ids.slice(i, i + size));
  }
  return chunks;
}

export async function fetchAllInChunks<T>(
  ids: string[],
  fetchChunk: (chunk: string[]) => Promise<T[]>
): Promise<T[]> {
  const out: T[] = [];
  for (const chunk of chunkIds(ids)) {
    out.push(...(await fetchChunk(chunk)));
  }
  return out;
}

export async function fetchAllPages<T>(
  fetchPage: (from: number, to: number) => Promise<T[]>,
  pageSize = POSTGREST_PAGE_SIZE
): Promise<T[]> {
  const out: T[] = [];
  let from = 0;
  for (;;) {
    const page = await fetchPage(from, from + pageSize - 1);
    out.push(...page);
    if (page.length < pageSize) break;
    from += pageSize;
  }
  return out;
}
