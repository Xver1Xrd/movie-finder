// Все запросы идут через серверный прокси /api/tmdb — ключ не попадает в бандл
const TMDB_PROXY = '/api/tmdb';
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
  original_language: string;
  media_type?: string;
}

const INDIAN_LANGUAGES = new Set(['hi', 'te', 'ta', 'ml', 'kn', 'bn', 'mr', 'gu', 'pa', 'ur']);

interface TMDBGenre {
  id: number;
  name: string;
}

export type Category = 'movies' | 'series' | 'anime' | 'cartoons';
export type SortOption = 'popularity' | 'rating' | 'newest';

const SORT_PARAMS: Record<SortOption, string> = {
  popularity: 'popularity.desc',
  rating: 'vote_average.desc',
  newest: 'primary_release_date.desc',
};

const TV_SORT_PARAMS: Record<SortOption, string> = {
  popularity: 'popularity.desc',
  rating: 'vote_average.desc',
  newest: 'first_air_date.desc',
};

const movieGenreCache: Map<number, string> = new Map();
const tvGenreCache: Map<number, string> = new Map();

async function fetchGenres(): Promise<void> {
  const [movieRes, tvRes] = await Promise.all([
    fetch(`${TMDB_PROXY}/genre/movie/list?language=ru-RU`),
    fetch(`${TMDB_PROXY}/genre/tv/list?language=ru-RU`),
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
  return genreIds.map((id) => cache.get(id)).filter((name): name is string => Boolean(name));
}

export function getCategoryGenreType(category: Category): 'movie' | 'tv' {
  return category === 'series' || category === 'anime' ? 'tv' : 'movie';
}

export async function fetchGenreList(type: 'movie' | 'tv'): Promise<TMDBGenre[]> {
  try {
    const res = await fetch(`${TMDB_PROXY}/genre/${type}/list?language=ru-RU`);
    const data = await res.json();
    return data.genres as TMDBGenre[];
  } catch {
    return [];
  }
}

export interface DiscoverOptions {
  category: Category;
  yearMin: number;
  yearMax: number;
  withGenres?: number[];
  totalPages?: number;
  withCountries?: string[];
  startPage?: number;
  minRating?: number;
  sort?: SortOption;
}

export async function discoverMedia(options: DiscoverOptions) {
  const {
    category, yearMin, yearMax,
    withGenres = [], totalPages = 4, withCountries = [],
    startPage = 1, minRating = 0, sort = 'popularity',
  } = options;

  if (movieGenreCache.size === 0 && tvGenreCache.size === 0) {
    await fetchGenres();
  }

  const isTv = category === 'series' || category === 'anime';
  const endpoint = isTv ? 'tv' : 'movie';
  const sortBy = isTv ? TV_SORT_PARAMS[sort] : SORT_PARAMS[sort];

  const pages = Array.from({ length: totalPages }, (_, i) => i + startPage);

  const results = await Promise.all(
    pages.map(async (page) => {
      let url = `${TMDB_PROXY}/discover/${endpoint}?language=ru-RU&page=${page}&sort_by=${sortBy}`;

      if (isTv) {
        url += `&first_air_date.gte=${yearMin}-01-01&first_air_date.lte=${yearMax}-12-31`;
      } else {
        url += `&primary_release_date.gte=${yearMin}-01-01&primary_release_date.lte=${yearMax}-12-31`;
      }

      if (minRating > 0) {
        url += `&vote_average.gte=${minRating}&vote_count.gte=100`;
      } else if (sort === 'rating') {
        // Сортировка по рейтингу без порога голосов выдаёт мусор с 1-2 оценками
        url += '&vote_count.gte=200';
      }

      if (withCountries.length > 0) {
        url += `&with_origin_country=${withCountries.join(',')}`;
      } else if (category === 'anime') {
        url += '&with_origin_country=JP';
      } else {
        url += '&without_origin_country=IN,TR,KR';
      }

      const genreIds = [...withGenres];
      if (category === 'cartoons') {
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
    if (INDIAN_LANGUAGES.has(m.original_language)) return false;
    if (seen.has(m.tmdb_id)) return false;
    seen.add(m.tmdb_id);
    return true;
  });
}

// Поиск конкретного фильма/сериала по названию (для ручного добавления в подборку)
export async function searchMedia(query: string): Promise<FormattedMovie[]> {
  if (movieGenreCache.size === 0 && tvGenreCache.size === 0) {
    await fetchGenres();
  }
  try {
    const res = await fetch(`${TMDB_PROXY}/search/multi?language=ru-RU&query=${encodeURIComponent(query)}&page=1`);
    const data = await res.json();
    return ((data.results || []) as TMDBItem[])
      .filter((m) => (m.media_type === 'movie' || m.media_type === 'tv') && m.poster_path)
      .slice(0, 12)
      .map((m) => formatMedia(m, m.media_type === 'tv'));
  } catch {
    return [];
  }
}

export const POSTER_PLACEHOLDER_URL = '/poster-placeholder.svg';

export function getPosterUrl(posterPath: string | null, size: string = 'w342'): string {
  if (!posterPath) return POSTER_PLACEHOLDER_URL;
  return `${TMDB_IMAGE_BASE}/${size}${posterPath}`;
}

function formatMedia(m: TMDBItem, isTv: boolean) {
  const dateStr = isTv ? m.first_air_date : m.release_date;
  return {
    tmdb_id: m.id,
    title: m.title || m.name || 'Unknown',
    year: dateStr ? parseInt(dateStr.slice(0, 4), 10) : 0,
    poster_path: m.poster_path,
    poster_url: getPosterUrl(m.poster_path, 'w342'),
    rating: Math.round(m.vote_average * 10) / 10,
    genres: getGenreNames(m.genre_ids, isTv),
    overview: m.overview,
    original_language: m.original_language,
  };
}

export type FormattedMovie = ReturnType<typeof formatMedia>;

interface TMDBVideo {
  key: string;
  site: string;
  type: string;
  official?: boolean;
}

function pickTrailer(videos: TMDBVideo[]): string | null {
  const yt = videos.filter((v) => v.site === 'YouTube');
  const trailer =
    yt.find((v) => v.type === 'Trailer' && v.official) ||
    yt.find((v) => v.type === 'Trailer') ||
    yt.find((v) => v.type === 'Teaser');
  return trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null;
}

async function fetchVideos(endpoint: 'movie' | 'tv', id: number): Promise<TMDBVideo[]> {
  try {
    const res = await fetch(`${TMDB_PROXY}/${endpoint}/${id}/videos?language=ru-RU&include_video_language=ru,en`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []) as TMDBVideo[];
  } catch {
    return [];
  }
}

// tmdb_id > 0 — TMDB (тип фильм/сериал неизвестен, пробуем оба); tmdb_id < 0 — MAL id из Jikan
export async function fetchTrailerUrl(tmdbId: number): Promise<string | null> {
  if (tmdbId < 0) {
    try {
      const res = await fetch(`https://api.jikan.moe/v4/anime/${-tmdbId}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.data?.trailer?.url || null;
    } catch {
      return null;
    }
  }
  const [movieVideos, tvVideos] = await Promise.all([
    fetchVideos('movie', tmdbId),
    fetchVideos('tv', tmdbId),
  ]);
  return pickTrailer(movieVideos) || pickTrailer(tvVideos);
}

export interface WatchProvider {
  provider_name: string;
  logo_path: string;
}

interface ProvidersRegion {
  flatrate?: WatchProvider[];
  rent?: WatchProvider[];
  buy?: WatchProvider[];
}

async function fetchProvidersFor(endpoint: 'movie' | 'tv', id: number, region: string): Promise<WatchProvider[]> {
  try {
    const res = await fetch(`${TMDB_PROXY}/${endpoint}/${id}/watch/providers`);
    if (!res.ok) return [];
    const data = await res.json();
    const regionData = (data.results || {})[region] as ProvidersRegion | undefined;
    if (!regionData) return [];
    const seen = new Set<string>();
    return [...(regionData.flatrate || []), ...(regionData.rent || []), ...(regionData.buy || [])]
      .filter((p) => {
        if (seen.has(p.provider_name)) return false;
        seen.add(p.provider_name);
        return true;
      });
  } catch {
    return [];
  }
}

// «Где смотреть»: стриминги по региону (данные TMDB/JustWatch). Для аниме из Jikan недоступно.
export async function fetchWatchProviders(tmdbId: number, region = 'RU'): Promise<WatchProvider[]> {
  if (tmdbId < 0) return [];
  const [movie, tv] = await Promise.all([
    fetchProvidersFor('movie', tmdbId, region),
    fetchProvidersFor('tv', tmdbId, region),
  ]);
  return movie.length > 0 ? movie : tv;
}

export function getProviderLogoUrl(logoPath: string): string {
  return `${TMDB_IMAGE_BASE}/w92${logoPath}`;
}
