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

export async function discoverAnimeJikan(
  yearMin: number,
  yearMax: number,
  genreIds: number[] = [],
  page = 1
): Promise<JikanMovie[]> {
  let url = `${JIKAN_BASE}/anime?order_by=popularity&sort=asc&page=${page}&limit=25`;

  if (yearMin > 0) url += `&start_date=${yearMin}-01-01`;
  if (yearMax < 9999) url += `&end_date=${yearMax}-12-31`;
  if (genreIds.length > 0) url += `&genres=${genreIds.join(',')}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json() as JikanResponse;
    const animes = data.data || [];

    return animes
      .filter((a) => a.score > 0)
      .map((a) => {
        const year = a.year || (a.aired?.from ? parseInt(a.aired.from.slice(0, 4), 10) : 0);
        return {
          tmdb_id: a.mal_id,
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
  } catch {
    return [];
  }
}
