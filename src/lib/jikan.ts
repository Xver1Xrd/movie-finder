const JIKAN_BASE = 'https://api.jikan.moe/v4';

interface JikanAnime {
  mal_id: number;
  title: string;
  title_english?: string;
  images: { webp: { image_url: string } };
  score: number;
  genres: Array<{ mal_id: number; name: string }>;
  synopsis: string;
  year?: number;
  aired?: { from?: string };
}

interface JikanResponse {
  data: JikanAnime[];
}

interface JikanGenreItem {
  mal_id: number;
  name: string;
}

const JIKAN_GENRE_CACHE: JikanGenreItem[] = [];

export async function fetchJikanGenres(): Promise<JikanGenreItem[]> {
  if (JIKAN_GENRE_CACHE.length > 0) return JIKAN_GENRE_CACHE;
  try {
    const res = await fetch(`${JIKAN_BASE}/genres/anime`);
    const data = await res.json() as { data: JikanGenreItem[] };
    const genres = data.data.filter((g) => g.mal_id !== 0);
    JIKAN_GENRE_CACHE.push(...genres);
    return genres;
  } catch {
    return [];
  }
}

export interface JikanMovie {
  tmdb_id: number;
  title: string;
  year: number;
  poster_url: string;
  rating: number;
  genres: string[];
  overview: string;
  source: 'jikan';
}

export type AnimeType = '' | 'tv' | 'movie' | 'ova';
export type AnimeStatus = '' | 'airing' | 'complete';

export interface JikanDiscoverOptions {
  yearMin: number;
  yearMax: number;
  genreIds?: number[];
  count?: number;
  startPage?: number;
  type?: AnimeType;
  status?: AnimeStatus;
  minScore?: number;
}

function fetchJikanPage(opts: JikanDiscoverOptions, page: number): Promise<JikanAnime[]> {
  let url = `${JIKAN_BASE}/anime?page=${page}&limit=25`;
  url += opts.minScore && opts.minScore > 0
    ? `&order_by=popularity&sort=asc&min_score=${opts.minScore}`
    : '&order_by=popularity&sort=asc';

  if (opts.yearMin > 0) url += `&start_date=${opts.yearMin}-01-01`;
  if (opts.yearMax < 9999) url += `&end_date=${opts.yearMax}-12-31`;
  if (opts.genreIds && opts.genreIds.length > 0) url += `&genres=${opts.genreIds.join(',')}`;
  if (opts.type) url += `&type=${opts.type}`;
  if (opts.status) url += `&status=${opts.status}`;

  return fetch(url)
    .then((res) => (res.ok ? res.json() : { data: [] }))
    .then((data: JikanResponse) => data.data || [])
    .catch(() => []);
}

export async function discoverAnimeJikan(options: JikanDiscoverOptions): Promise<JikanMovie[]> {
  const { count = 25, startPage = 1 } = options;
  const totalPages = Math.max(1, Math.ceil(count / 25));
  const animes: JikanAnime[] = [];

  // Jikan ограничивает ~3 запроса/сек — грузим страницы последовательно
  for (let i = 0; i < totalPages; i++) {
    const pageData = await fetchJikanPage(options, startPage + i);
    animes.push(...pageData);
    if (pageData.length < 25) break;
    if (i < totalPages - 1) await new Promise((r) => setTimeout(r, 350));
  }

  const seen = new Set<number>();
  return animes
    .filter((a) => {
      if (a.score <= 0 || seen.has(a.mal_id)) return false;
      seen.add(a.mal_id);
      return true;
    })
    .map((a) => {
      const year = a.year || (a.aired?.from ? parseInt(a.aired.from.slice(0, 4), 10) : 0);
      return {
        // Отрицательный id отличает MAL id от TMDB id (нужно для поиска трейлера)
        tmdb_id: -a.mal_id,
        title: a.title_english || a.title,
        year,
        poster_url: a.images.webp?.image_url
          ? a.images.webp.image_url
          : `https://via.placeholder.com/300x450/1a1a2e/e0e0e0?text=No+Poster`,
        rating: a.score || 0,
        genres: (a.genres || []).map((g) => g.name),
        overview: a.synopsis || '',
        source: 'jikan' as const,
      };
    });
}
