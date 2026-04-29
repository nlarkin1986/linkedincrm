import type { PaginatedUnipileResponse } from "./types";

export async function collectUnipilePages<T>(
  loadPage: (cursor?: string) => Promise<PaginatedUnipileResponse<T>>
): Promise<T[]> {
  const items: T[] = [];
  let cursor: string | undefined;

  do {
    const page = await loadPage(cursor);
    items.push(...page.items);
    cursor = page.cursor ?? undefined;
  } while (cursor);

  return items;
}
