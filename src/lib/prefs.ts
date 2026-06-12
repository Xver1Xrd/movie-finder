// Локальные предпочтения: вотчлист мэтчей, виденные фильмы, жанровые вкусы.
// Всё в localStorage — без аккаунтов, как и остальной сервис.

const WATCHLIST_KEY = 'movietier_watchlist';
const SEEN_KEY = 'movietier_seen_ids';
const AFFINITY_KEY = 'movietier_genre_affinity';
const SEEN_LIMIT = 2000;
const WATCHLIST_LIMIT = 100;

export interface WatchlistItem {
  tmdb_id: number;
  title: string;
  poster_url: string;
  roomId: string;
  date: string;
  watched: boolean;
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

// --- Вотчлист (мэтчи и победители сессий) ---

export function getWatchlist(): WatchlistItem[] {
  return readJson<WatchlistItem[]>(WATCHLIST_KEY, []);
}

export function addToWatchlist(items: Omit<WatchlistItem, 'watched'>[]): void {
  const existing = getWatchlist();
  const known = new Set(existing.map((i) => i.tmdb_id));
  const fresh = items
    .filter((i) => !known.has(i.tmdb_id))
    .map((i) => ({ ...i, watched: false }));
  if (fresh.length === 0) return;
  writeJson(WATCHLIST_KEY, [...fresh, ...existing].slice(0, WATCHLIST_LIMIT));
}

export function setWatched(tmdbId: number, watched: boolean): void {
  const list = getWatchlist().map((i) =>
    i.tmdb_id === tmdbId ? { ...i, watched } : i
  );
  writeJson(WATCHLIST_KEY, list);
  if (watched) addSeenIds([tmdbId]);
}

export function removeFromWatchlist(tmdbId: number): void {
  writeJson(WATCHLIST_KEY, getWatchlist().filter((i) => i.tmdb_id !== tmdbId));
}

// --- Виденные фильмы (для фильтра «скрывать из прошлых сессий») ---

export function getSeenIds(): Set<number> {
  return new Set(readJson<number[]>(SEEN_KEY, []));
}

export function addSeenIds(ids: number[]): void {
  const seen = readJson<number[]>(SEEN_KEY, []);
  const set = new Set(seen);
  const fresh = ids.filter((id) => !set.has(id));
  if (fresh.length === 0) return;
  writeJson(SEEN_KEY, [...seen, ...fresh].slice(-SEEN_LIMIT));
}

// --- Жанровые вкусы: копим жанры фильмов, за которые голосовали «Да» ---

export function getGenreAffinity(): Record<string, number> {
  return readJson<Record<string, number>>(AFFINITY_KEY, {});
}

export function bumpGenreAffinity(genres: string[]): void {
  const affinity = getGenreAffinity();
  for (const g of genres) {
    affinity[g] = (affinity[g] || 0) + 1;
  }
  writeJson(AFFINITY_KEY, affinity);
}

// Стабильная пересортировка подборки: фильмы с любимыми жанрами всплывают выше,
// но порядок внутри одинаковых очков сохраняется (лёгкие рекомендации без ML)
export function sortByAffinity<T extends { genres: string[] }>(items: T[]): T[] {
  const affinity = getGenreAffinity();
  const total = Object.values(affinity).reduce((a, b) => a + b, 0);
  if (total < 10) return items; // мало данных — не вмешиваемся

  const score = (m: T) =>
    m.genres.reduce((sum, g) => sum + (affinity[g] || 0), 0);

  return items
    .map((item, index) => ({ item, index, s: score(item) }))
    .sort((a, b) => (b.s !== a.s ? b.s - a.s : a.index - b.index))
    .map((x) => x.item);
}
