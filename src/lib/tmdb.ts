const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

interface TMDBItem {
  id: number;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path: string | null;
  vote_average: number;
  genre_ids: number[];
  overview: string;
}

interface TMDBGenre {
  id: number;
  name: string;
}

export type Category = 'movies' | 'series' | 'anime' | 'cartoons';

const movieGenreCache: Map<number, string> = new Map();
const tvGenreCache: Map<number, string> = new Map();

async function fetchGenres(apiKey: string): Promise<void> {
  const [movieRes, tvRes] = await Promise.all([
    fetch(`${TMDB_BASE}/genre/movie/list?language=ru-RU&api_key=${apiKey}`),
    fetch(`${TMDB_BASE}/genre/tv/list?language=ru-RU&api_key=${apiKey}`),
  ]);
  try {
    const movieData = await movieRes.json();
    for (const g of movieData.genres as TMDBGenre[]) {
      movieGenreCache.set(g.id, g.name);
    }
  } catch {}
  try {
    const tvData = await tvRes.json();
    for (const g of tvData.genres as TMDBGenre[]) {
      tvGenreCache.set(g.id, g.name);
    }
  } catch {}
}

function getGenreNames(genreIds: number[], isTv: boolean): string[] {
  const cache = isTv ? tvGenreCache : movieGenreCache;
  return genreIds.map((id) => cache.get(id) || 'Unknown').filter(Boolean);
}

export function getCategoryGenreType(category: Category): 'movie' | 'tv' {
  return category === 'series' || category === 'anime' ? 'tv' : 'movie';
}

export async function fetchGenreList(apiKey: string, type: 'movie' | 'tv'): Promise<TMDBGenre[]> {
  try {
    const res = await fetch(`${TMDB_BASE}/genre/${type}/list?language=ru-RU&api_key=${apiKey}`);
    const data = await res.json();
    return data.genres as TMDBGenre[];
  } catch {
    return [];
  }
}

export async function discoverMedia(
  apiKey: string,
  category: Category,
  yearMin: number,
  yearMax: number,
  withGenres: number[] = [],
  totalPages = 4
) {
  if (movieGenreCache.size === 0 && tvGenreCache.size === 0) {
    await fetchGenres(apiKey);
  }

  const isTv = category === 'series' || category === 'anime';
  const endpoint = isTv ? 'tv' : 'movie';

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  const results = await Promise.all(
    pages.map(async (page) => {
      let url = `${TMDB_BASE}/discover/${endpoint}?language=ru-RU&page=${page}&sort_by=popularity.desc&api_key=${apiKey}`;

      if (isTv) {
        url += `&first_air_date.gte=${yearMin}-01-01&first_air_date.lte=${yearMax}-12-31`;
      } else {
        url += `&primary_release_date.gte=${yearMin}-01-01&primary_release_date.lte=${yearMax}-12-31`;
      }

      url += '&without_origin_country=IN,TR,KR';

      const genreIds = [...withGenres];
      if (category === 'anime') {
        if (!genreIds.includes(16)) genreIds.push(16);
        url += '&with_origin_country=JP';
      } else if (category === 'cartoons') {
        if (!genreIds.includes(16)) genreIds.push(16);
      }

      if (genreIds.length > 0) {
        url += `&with_genres=${genreIds.join(',')}`;
      }

      try {
        const res = await fetch(url);
        const data = await res.json();
        return (data.results as TMDBItem[]).map((m) => formatMedia(m, isTv));
      } catch {
        return [] as FormattedMovie[];
      }
    })
  );

  const seen = new Set<number>();
  return results.flat().filter((m) => {
    if (seen.has(m.tmdb_id)) return false;
    seen.add(m.tmdb_id);
    return true;
  });
}

export async function searchMovies(apiKey: string, query: string, page = 1) {
  if (movieGenreCache.size === 0) await fetchGenres(apiKey);
  try {
    const res = await fetch(
      `${TMDB_BASE}/search/movie?query=${encodeURIComponent(query)}&language=ru-RU&page=${page}&api_key=${apiKey}`
    );
    const data = await res.json();
    return (data.results as TMDBItem[]).map((m) => formatMedia(m, false));
  } catch {
    return [];
  }
}

export async function getMovieTrailer(apiKey: string, tmdbId: number): Promise<string | null> {
  try {
    const res = await fetch(
      `${TMDB_BASE}/movie/${tmdbId}/videos?language=ru-RU&api_key=${apiKey}`
    );
    const data = await res.json();
    const videos = data.results as Array<{ key: string; site: string; type: string }>;
    const trailer = videos.find(
      (v) => v.site === 'YouTube' && v.type === 'Trailer'
    ) || videos.find((v) => v.site === 'YouTube');
    return trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null;
  } catch {
    return null;
  }
}

export async function getMovieWatchProviders(
  apiKey: string,
  tmdbId: number,
  country = 'RU'
): Promise<string[]> {
  try {
    const res = await fetch(
      `${TMDB_BASE}/movie/${tmdbId}/watch/providers?api_key=${apiKey}`
    );
    const data = await res.json();
    const providers = data.results?.[country]?.flatrate as Array<{ provider_name: string }> | undefined;
    return providers?.map((p) => p.provider_name) || [];
  } catch {
    return [];
  }
}

function formatMedia(m: TMDBItem, isTv: boolean) {
  const dateStr = isTv ? m.first_air_date : m.release_date;
  return {
    tmdb_id: m.id,
    title: m.title || m.name || 'Unknown',
    year: dateStr ? parseInt(dateStr.slice(0, 4), 10) : 0,
    poster_url: m.poster_path
      ? `${TMDB_IMAGE_BASE}/w500${m.poster_path}`
      : `https://via.placeholder.com/300x450/1a1a2e/e0e0e0?text=No+Poster`,
    rating: Math.round(m.vote_average * 10) / 10,
    genres: getGenreNames(m.genre_ids, isTv),
    overview: m.overview,
  };
}

export type FormattedMovie = ReturnType<typeof formatMedia>;
