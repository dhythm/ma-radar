export const watchlistKey = 'ma-radar:watchlist';

export function parseWatchlist(raw: string | null): number[] {
  if (raw === null) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return [...new Set(value.filter((id): id is number => typeof id === 'number' && Number.isFinite(id)))];
  } catch {
    return [];
  }
}

export function toggleWatchlist(ids: number[], id: number): number[] {
  return ids.includes(id) ? ids.filter(existing => existing !== id) : [...ids, id];
}
