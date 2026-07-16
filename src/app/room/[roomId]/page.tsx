'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase, ensureAuthSession } from '@/lib/supabase';
import {
  FormattedMovie, Category, SortOption, discoverMedia,
  fetchGenreList, getCategoryGenreType, searchMedia, getPosterUrl,
} from '@/lib/tmdb';
import { discoverAnimeJikan, fetchJikanGenres, AnimeType, AnimeStatus } from '@/lib/jikan';
import { getSeenIds, sortByAffinity } from '@/lib/prefs';
import { useRoom } from '@/hooks/useRoom';
import { MAX_PARTICIPANTS } from '@/types';
import {
  FilmIcon, CopyIcon, CheckIcon, UsersIcon,
  PlusIcon, RefreshIcon, LinkIcon, UserIcon
} from '@/components/Icons';
import YearRangeSlider from '@/components/YearRangeSlider';
import { getRoomIdentity, saveRoomIdentity } from '@/lib/storage';

interface TMDBGenre { id: number; name: string }

const CATEGORIES: { key: Category; label: string }[] = [
  { key: 'movies', label: 'Фильмы' },
  { key: 'series', label: 'Сериалы' },
  { key: 'anime', label: 'Аниме' },
  { key: 'cartoons', label: 'Мультфильмы' },
];

const COUNTRIES: { code: string; name: string }[] = [
  { code: 'US', name: 'США' },
  { code: 'GB', name: 'Великобритания' },
  { code: 'FR', name: 'Франция' },
  { code: 'DE', name: 'Германия' },
  { code: 'IT', name: 'Италия' },
  { code: 'ES', name: 'Испания' },
  { code: 'CA', name: 'Канада' },
  { code: 'AU', name: 'Австралия' },
  { code: 'JP', name: 'Япония' },
  { code: 'KR', name: 'Южная Корея' },
  { code: 'CN', name: 'Китай' },
  { code: 'RU', name: 'Россия' },
];

export default function RoomLobbyPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;
  const { room, participants, loading, setReady, startVoting, joinRoomById } = useRoom(roomId);
  const [isHost, setIsHost] = useState(false);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [readyLoading, setReadyLoading] = useState(false);
  const [gameMode, setGameMode] = useState<'solo' | 'multi'>('multi');
  const [moviesInserted, setMoviesInserted] = useState(false);
  const [identityChecked, setIdentityChecked] = useState(false);

  useEffect(() => {
    const identity = getRoomIdentity(roomId);
    if (identity) {
      setParticipantId(identity.participantId);
      setIsHost(identity.isHost);
      setGameMode(identity.mode);
    }
    setIdentityChecked(true);
  }, [roomId]);

  const isSolo = gameMode === 'solo';

  useEffect(() => {
    if (!participantId) return;
    if (room?.status === 'voting') router.push(`/room/${roomId}/vote`);
    if (room?.status === 'completed') router.push(`/room/${roomId}/results`);
  }, [participantId, room?.status, roomId, router]);

  const myParticipant = participants.find((p) => p.id === participantId);
  const allReady = participants.length >= 2 && participants.every((p) => p.is_ready);

  // Хост мог перезагрузить страницу — проверяем по БД, выбраны ли уже фильмы
  useEffect(() => {
    if (!isHost) return;
    (async () => {
      const { count } = await supabase
        .from('movies')
        .select('id', { count: 'exact', head: true })
        .eq('room_id', roomId);
      if (count && count > 0) setMoviesInserted(true);
    })();
  }, [isHost, roomId]);

  useEffect(() => {
    if (!(allReady && isHost && room?.status === 'setup')) return;
    let cancelled = false;
    // Не стартуем голосование, пока хост не выбрал фильмы
    (async () => {
      const { count } = await supabase
        .from('movies')
        .select('id', { count: 'exact', head: true })
        .eq('room_id', roomId);
      if (!cancelled && count && count > 0) startVoting();
    })();
    return () => { cancelled = true; };
  }, [allReady, isHost, room?.status, roomId, moviesInserted, startVoting]);

  const handleToggleReady = async () => {
    if (!participantId) return;
    setReadyLoading(true);
    try {
      await setReady(participantId, !myParticipant?.is_ready);
    } catch {}
    setReadyLoading(false);
  };

  const copyCode = useCallback(() => {
    if (!room?.invite_code) return;
    navigator.clipboard.writeText(room.invite_code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [room?.invite_code]);

  if (loading || !identityChecked) return <LoadingSplash />;
  if (!room) return <ErrorSplash message="Комната не найдена" />;

  // Гость открыл ссылку на комнату, но ещё не участник — даём войти прямо здесь
  if (!participantId) {
    if (room.status !== 'setup') {
      return (
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center space-y-4">
            <div className="text-gray-500 text-sm">
              {room.status === 'voting' ? 'Голосование уже идёт — вход закрыт' : 'Эта сессия завершена'}
            </div>
            {room.status === 'completed' && (
              <button onClick={() => router.push(`/room/${roomId}/results`)}
                className="px-6 py-3 bg-pink-600 text-white font-semibold rounded-xl text-sm hover:bg-pink-500">
                Посмотреть результаты
              </button>
            )}
          </div>
        </div>
      );
    }
    return (
      <JoinByLink
        onJoin={async (name) => {
          const { participantId: pid } = await joinRoomById(roomId, name);
          saveRoomIdentity(roomId, { participantId: pid, name, isHost: false, mode: 'multi' });
          setParticipantId(pid);
          setIsHost(false);
          setGameMode('multi');
        }}
      />
    );
  }

  const handleBackHome = () => router.push('/');
  const shareLink = async () => {
    const url = `${window.location.origin}/room/${roomId}`;
    if (navigator.share) {
      try { await navigator.share({ title: 'MovieTier', text: 'Заходи выбирать фильм!', url }); return; } catch {}
    }
    await navigator.clipboard.writeText(url);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col px-5 py-6 max-w-lg mx-auto w-full">
      <button onClick={handleBackHome} className="self-start mb-2 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-300 transition-colors">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        На главную
      </button>
      <div className="text-center space-y-2 mb-6">
        <div className="flex justify-center mb-2">
          <div className="w-12 h-12 rounded-2xl bg-pink-600 flex items-center justify-center shadow-lg shadow-pink-600/25">
            <FilmIcon className="w-6 h-6 text-white" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-white">Ожидание</h1>
        <p className="text-gray-500 text-sm">
          {isSolo ? 'Одиночный режим' : `${participants.length} / ${MAX_PARTICIPANTS} игроков`}
        </p>
      </div>

      {isHost && !isSolo && (
        <div className="bg-[#12121a] rounded-2xl p-4 border border-[#1f1f2e] mb-5">
          <p className="text-xs text-gray-500 font-medium mb-2 text-center">Отправь этот код друзьям</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-[#0a0a0f] rounded-xl px-4 py-3 border border-[#1f1f2e]">
              <span className="text-2xl font-mono font-bold tracking-[0.3em] text-white text-center block">
                {room.invite_code}
              </span>
            </div>
            <button
              onClick={copyCode}
              className="flex-shrink-0 w-12 h-12 rounded-xl bg-pink-600 flex items-center justify-center transition-all active:scale-95 hover:bg-pink-500"
            >
              {copied ? <CheckIcon className="w-5 h-5 text-white" /> : <CopyIcon className="w-5 h-5 text-white" />}
            </button>
          </div>
          <button
            onClick={shareLink}
            className="w-full mt-3 py-2.5 bg-[#0a0a0f] border border-[#1f1f2e] text-gray-400 text-xs font-medium rounded-xl transition-all active:scale-[0.98] hover:border-pink-600/40 hover:text-gray-200 flex items-center justify-center gap-1.5"
          >
            <LinkIcon className="w-3.5 h-3.5" />
            {linkCopied ? 'Ссылка скопирована ✓' : 'Поделиться ссылкой'}
          </button>
        </div>
      )}

      {!isHost && (
        <div className="bg-[#12121a] rounded-2xl p-4 border border-[#1f1f2e] mb-5">
          <p className="text-xs text-gray-500 font-medium mb-2 text-center">Код комнаты</p>
          <div className="bg-[#0a0a0f] rounded-xl px-4 py-3 border border-[#1f1f2e]">
            <span className="text-2xl font-mono font-bold tracking-[0.3em] text-white text-center block">
              {room.invite_code}
            </span>
          </div>
        </div>
      )}

      <div className="space-y-2 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <UsersIcon className="w-4 h-4 text-gray-500" />
          <span className="text-xs text-gray-500 font-medium">Игроки</span>
        </div>
        {participants.map((p) => {
          const isMe = p.id === participantId;
          return (
            <div
              key={p.id}
              className={`flex items-center gap-3 bg-[#12121a] rounded-xl px-4 py-3 border transition-all ${
                isMe ? 'border-pink-600/30 bg-pink-600/5' : 'border-[#1f1f2e]'
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                p.is_host
                  ? 'bg-pink-600 text-white'
                  : 'bg-[#1f1f2e] text-gray-400'
              }`}>
                {p.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-medium truncate flex items-center gap-1.5">
                  {p.name}
                  {isMe && <span className="text-[10px] text-gray-600">(вы)</span>}
                </div>
                <div className="text-xs text-gray-600">
                  {isSolo ? 'Одиночный' : p.is_host ? 'Ведущий' : 'Игрок'}
                </div>
              </div>
              {!isSolo && (
                <div className={`flex items-center gap-1.5 text-xs font-medium ${
                  p.is_ready ? 'text-green-400' : 'text-gray-600'
                }`}>
                  {p.is_ready ? (
                    <><CheckIcon className="w-3.5 h-3.5" /> Готов</>
                  ) : (
                    'Ожидание...'
                  )}
                </div>
              )}
            </div>
          );
        })}
        {!isSolo && participants.length < MAX_PARTICIPANTS && Array.from({ length: Math.min(3, MAX_PARTICIPANTS - participants.length) }).map((_, i) => (
          <div key={`empty-${i}`} className="flex items-center gap-3 bg-[#12121a]/50 rounded-xl px-4 py-3 border border-[#1f1f2e] border-dashed">
            <div className="w-8 h-8 rounded-full bg-[#1f1f2e]/50 flex items-center justify-center">
              <PlusIcon className="w-3.5 h-3.5 text-gray-700" />
            </div>
            <div className="text-sm text-gray-700">Ожидание игрока...</div>
          </div>
        ))}
      </div>

      {isHost && room.status === 'setup' && !moviesInserted && (
        <MovieConfig
          roomId={roomId}
          maxMovies={room.max_movies}
          isSolo={isSolo}
          onMoviesInserted={() => setMoviesInserted(true)}
          startVoting={startVoting}
        />
      )}

      {isHost && room.status === 'setup' && moviesInserted && (
        <div className="text-center py-4">
          <p className="text-green-400 text-sm font-medium flex items-center justify-center gap-1.5">
            <CheckIcon className="w-4 h-4" />
            Фильмы выбраны!
          </p>
          {!isSolo && (
            <p className="text-gray-500 text-xs mt-1">Ожидание готовности игроков...</p>
          )}
        </div>
      )}

      {!isHost && room.status === 'setup' && (
        <div className="text-center py-2">
          <p className="text-gray-600 text-xs">Ведущий выбирает фильмы...</p>
        </div>
      )}

      {!isSolo && participants.length < 2 && room.status === 'setup' && (
        <div className="text-center py-4">
          <p className="text-gray-500 text-sm">Ожидание игроков...</p>
        </div>
      )}

      {participants.length >= 2 && !allReady && room.status === 'setup' && (
        <div className="text-center py-2">
          <p className="text-gray-500 text-sm">Ожидание готовности всех игроков</p>
        </div>
      )}

      {allReady && room.status === 'setup' && (
        <div className="text-center py-2">
          <p className="text-green-400 text-sm font-medium flex items-center justify-center gap-1.5">
            <CheckIcon className="w-4 h-4" />
            Все готовы! Запуск...
          </p>
        </div>
      )}

      <div className="mt-auto pt-4 space-y-3">
        {!isSolo && room.status === 'setup' && participantId && (
          <button
            onClick={handleToggleReady}
            disabled={readyLoading}
            className={`w-full py-4 font-bold rounded-xl transition-all active:scale-[0.98] text-sm shadow-lg flex items-center justify-center gap-2 ${
              myParticipant?.is_ready
                ? 'bg-green-500/20 border border-green-500/40 text-green-400 shadow-green-500/10'
                : 'bg-pink-600 text-white shadow-pink-600/20 hover:bg-pink-500'
            }`}
          >
            {myParticipant?.is_ready ? (
              <><CheckIcon className="w-4 h-4" /> Готов</>
            ) : (
              'Нажми, когда готов'
            )}
          </button>
        )}

        {!isSolo && !isHost && participants.length > 0 && !allReady && (
          <p className="text-center text-gray-600 text-xs">Ожидание ведущего</p>
        )}
      </div>
    </div>
  );
}

function MovieConfig({
  roomId, maxMovies, isSolo, onMoviesInserted, startVoting
}: {
  roomId: string; maxMovies: number; isSolo: boolean;
  onMoviesInserted: () => void; startVoting: () => Promise<void>;
}) {
  const [category, setCategory] = useState<Category>('movies');
  const [yearMin, setYearMin] = useState(1990);
  const [yearMax, setYearMax] = useState(() => new Date().getFullYear() + 1);
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [movieCount, setMovieCount] = useState(20);
  const [pageOffset, setPageOffset] = useState(0);
  const [minRating, setMinRating] = useState(0);
  const [sort, setSort] = useState<SortOption>('popularity');
  const [animeType, setAnimeType] = useState<AnimeType>('');
  const [animeStatus, setAnimeStatus] = useState<AnimeStatus>('');
  const [excludeSeen, setExcludeSeen] = useState(false);
  const [genreList, setGenreList] = useState<TMDBGenre[]>([]);
  const [results, setResults] = useState<FormattedMovie[]>([]);
  const [picked, setPicked] = useState<FormattedMovie[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FormattedMovie[]>([]);
  const [searching, setSearching] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [inserting, setInserting] = useState(false);
  const [insertError, setInsertError] = useState<string | null>(null);
  const fetchTimer = useRef<ReturnType<typeof setTimeout>>();
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    (async () => {
      if (category === 'anime') {
        const list = await fetchJikanGenres();
        setGenreList(list.map((g) => ({ id: g.mal_id, name: g.name })));
      } else {
        const type = getCategoryGenreType(category);
        const list = await fetchGenreList(type);
        setGenreList(list);
      }
      setSelectedGenres([]);
    })();
  }, [category]);

  const fetchMovies = useCallback(async (
    cat: Category, yMin: number, yMax: number, genres: number[], countries: string[],
    count: number, offset: number, rating: number, sortBy: SortOption,
    aType: AnimeType, aStatus: AnimeStatus
  ) => {
    setFetching(true);
    try {
      if (cat === 'anime') {
        const jikanPages = Math.max(1, Math.ceil(count / 25));
        const movies = await discoverAnimeJikan({
          yearMin: yMin, yearMax: yMax, genreIds: genres, count,
          startPage: offset * jikanPages + 1,
          type: aType, status: aStatus, minScore: rating,
        });
        setResults(movies as unknown as FormattedMovie[]);
      } else {
        const pages = Math.max(1, Math.ceil(count / 20));
        const movies = await discoverMedia({
          category: cat, yearMin: yMin, yearMax: yMax,
          withGenres: genres, totalPages: pages, withCountries: countries,
          startPage: offset * pages + 1, minRating: rating, sort: sortBy,
        });
        setResults(movies);
      }
    } catch {}
    setFetching(false);
  }, []);

  // Смена фильтров сбрасывает реролл на первую подборку
  useEffect(() => {
    setPageOffset(0);
  }, [category, yearMin, yearMax, selectedGenres, selectedCountries, minRating, sort, animeType, animeStatus]);

  useEffect(() => {
    setResults([]);
    if (fetchTimer.current) clearTimeout(fetchTimer.current);
    fetchTimer.current = setTimeout(() => {
      fetchMovies(category, yearMin, yearMax, selectedGenres, selectedCountries,
        movieCount, pageOffset, minRating, sort, animeType, animeStatus);
    }, 400);
    return () => { if (fetchTimer.current) clearTimeout(fetchTimer.current); };
  }, [category, yearMin, yearMax, selectedGenres, selectedCountries, movieCount,
      pageOffset, minRating, sort, animeType, animeStatus, fetchMovies]);

  // Поиск конкретного фильма для ручного добавления
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    const q = searchQuery.trim();
    if (q.length < 2) { setSearchResults([]); setSearching(false); return; }
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      const found = await searchMedia(q);
      setSearchResults(found);
      setSearching(false);
    }, 400);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [searchQuery]);

  const toggleGenre = (id: number) => {
    setSelectedGenres((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  };

  const addPicked = (m: FormattedMovie) => {
    setPicked((prev) => prev.some((p) => p.tmdb_id === m.tmdb_id) ? prev : [...prev, m]);
    setSearchQuery('');
    setSearchResults([]);
  };

  // Итоговая подборка: вручную добавленные — первыми, дальше выдача
  // (минус виденное, минус дубли), любимые жанры всплывают выше
  const finalList = (() => {
    const pickedIds = new Set(picked.map((p) => p.tmdb_id));
    let pool = results.filter((m) => !pickedIds.has(m.tmdb_id));
    if (excludeSeen) {
      const seenIds = getSeenIds();
      pool = pool.filter((m) => !seenIds.has(m.tmdb_id));
    }
    return [...picked, ...sortByAffinity(pool)];
  })();

  const handleInsertMovies = async () => {
    if (finalList.length === 0) return;
    setInserting(true);
    setInsertError(null);
    try {
      await ensureAuthSession();
      const total = Math.min(finalList.length, Math.min(movieCount, maxMovies));
      const inserts = finalList.slice(0, total).map((m, i) => ({
        room_id: roomId,
        tmdb_id: m.tmdb_id,
        title: m.title,
        year: m.year,
        poster_url: m.poster_url,
        rating: m.rating,
        genres: m.genres,
        overview: m.overview,
        sort_order: i,
      }));
      const { error } = await supabase.from('movies').insert(inserts);
      if (error) throw error;
      onMoviesInserted();
      if (isSolo) {
        await startVoting();
      }
    } catch (e) {
      setInsertError('Ошибка при загрузке фильмов. Попробуйте снова.');
      console.error(e);
    }
    setInserting(false);
  };

  const displayCount = Math.min(finalList.length, Math.min(movieCount, maxMovies));

  return (
    <div className="mb-4 space-y-4">
      <div className="bg-[#12121a] rounded-2xl p-4 border border-[#1f1f2e] space-y-4">
        <p className="text-xs text-gray-500 font-medium">Выбор фильмов</p>

        <div className="flex gap-1.5 bg-[#0a0a0f] rounded-xl p-1 border border-[#1f1f2e]">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                category === c.key
                  ? 'bg-pink-600 text-white'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <YearRangeSlider yearMin={yearMin} yearMax={yearMax} onChange={(min, max) => { setYearMin(min); setYearMax(max); }} />

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <div className="text-xs text-gray-500 font-medium">Рейтинг</div>
            <div className="flex flex-wrap gap-1.5">
              {[{ v: 0, l: 'Любой' }, { v: 6, l: '6+' }, { v: 7, l: '7+' }, { v: 8, l: '8+' }].map((r) => (
                <FilterChip key={r.v} active={minRating === r.v} onClick={() => setMinRating(r.v)}>{r.l}</FilterChip>
              ))}
            </div>
          </div>
          {category !== 'anime' && (
            <div className="space-y-1.5">
              <div className="text-xs text-gray-500 font-medium">Сортировка</div>
              <div className="flex flex-wrap gap-1.5">
                {([['popularity', 'Популярные'], ['rating', 'Рейтинг'], ['newest', 'Новинки']] as [SortOption, string][]).map(([v, l]) => (
                  <FilterChip key={v} active={sort === v} onClick={() => setSort(v)}>{l}</FilterChip>
                ))}
              </div>
            </div>
          )}
        </div>

        {category === 'anime' && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <div className="text-xs text-gray-500 font-medium">Тип</div>
              <div className="flex flex-wrap gap-1.5">
                {([['', 'Любой'], ['tv', 'Сериал'], ['movie', 'Фильм'], ['ova', 'OVA']] as [AnimeType, string][]).map(([v, l]) => (
                  <FilterChip key={v} active={animeType === v} onClick={() => setAnimeType(v)}>{l}</FilterChip>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="text-xs text-gray-500 font-medium">Статус</div>
              <div className="flex flex-wrap gap-1.5">
                {([['', 'Любой'], ['airing', 'Онгоинг'], ['complete', 'Завершён']] as [AnimeStatus, string][]).map(([v, l]) => (
                  <FilterChip key={v} active={animeStatus === v} onClick={() => setAnimeStatus(v)}>{l}</FilterChip>
                ))}
              </div>
            </div>
          </div>
        )}

        {genreList.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-xs text-gray-500 font-medium">Жанры</div>
            <div className="flex flex-wrap gap-1.5">
              {genreList.map((g) => {
                const active = selectedGenres.includes(g.id);
                return (
                  <button
                    key={g.id}
                    onClick={() => toggleGenre(g.id)}
                    className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all ${
                      active
                        ? 'bg-pink-600/20 text-pink-300 border border-pink-600/40'
                        : 'bg-[#0a0a0f] text-gray-500 border border-[#1f1f2e] hover:text-gray-300 hover:border-gray-700'
                    }`}
                  >
                    {g.name}
                  </button>
                );
              })}
            </div>
            {selectedGenres.length > 0 && (
              <p className="text-[10px] text-gray-600">{selectedGenres.length} жанр(ов) выбрано</p>
            )}
          </div>
        )}

        <div className="space-y-1.5">
          <div className="text-xs text-gray-500 font-medium">Страна</div>
          <div className="flex flex-wrap gap-1.5">
            {COUNTRIES.map((c) => {
              const active = selectedCountries.includes(c.code);
              return (
                <button
                  key={c.code}
                  onClick={() => setSelectedCountries((prev) =>
                    prev.includes(c.code) ? prev.filter((x) => x !== c.code) : [...prev, c.code]
                  )}
                  className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all ${
                    active
                      ? 'bg-pink-600/20 text-pink-300 border border-pink-600/40'
                      : 'bg-[#0a0a0f] text-gray-500 border border-[#1f1f2e] hover:text-gray-300 hover:border-gray-700'
                  }`}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
          {selectedCountries.length > 0 && (
            <p className="text-[10px] text-gray-600">{selectedCountries.length} стран(ы) выбрано</p>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 font-medium">Количество</span>
            <span className="text-xs text-pink-400 font-bold">{movieCount}</span>
          </div>
          <input
            type="range"
            min={5}
            max={maxMovies}
            value={movieCount}
            onChange={(e) => setMovieCount(Number(e.target.value))}
            className="w-full h-1.5 bg-[#0a0a0f] rounded-full appearance-none cursor-pointer accent-pink-600"
          />
          <div className="flex justify-between text-[9px] text-gray-700">
            <span>5</span>
            <span>{maxMovies}</span>
          </div>
        </div>

        <button
          onClick={() => setExcludeSeen((v) => !v)}
          className="flex items-center gap-2 text-xs font-medium transition-colors"
        >
          <span className={`w-9 h-5 rounded-full p-0.5 transition-colors ${excludeSeen ? 'bg-pink-600' : 'bg-[#1f1f2e]'}`}>
            <span className={`block w-4 h-4 rounded-full bg-white transition-transform ${excludeSeen ? 'translate-x-3' : ''}`} />
          </span>
          <span className={excludeSeen ? 'text-gray-300' : 'text-gray-600'}>Скрывать фильмы из прошлых сессий</span>
        </button>

        <div className="space-y-1.5">
          <div className="text-xs text-gray-500 font-medium">Добавить конкретный фильм</div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по названию..."
            className="w-full px-4 py-2.5 bg-[#0a0a0f] border border-[#1f1f2e] rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-pink-600/50 transition-colors text-xs"
          />
          {searching && <p className="text-[10px] text-gray-600 animate-pulse">Поиск...</p>}
          {searchResults.length > 0 && (
            <div className="max-h-44 overflow-y-auto scrollbar-thin space-y-1">
              {searchResults.map((m) => (
                <button
                  key={m.tmdb_id}
                  onClick={() => addPicked(m)}
                  className="w-full flex items-center gap-2.5 bg-[#0a0a0f] border border-[#1f1f2e] rounded-lg px-2 py-1.5 text-left hover:border-pink-600/40 transition-all"
                >
                  <img src={m.poster_path ? getPosterUrl(m.poster_path, 'w92') : m.poster_url} alt="" className="w-7 h-10 rounded object-cover flex-shrink-0" loading="lazy" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white truncate">{m.title}</p>
                    <p className="text-[10px] text-gray-600">{m.year}</p>
                  </div>
                  <PlusIcon className="w-3.5 h-3.5 text-pink-500 flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
          {picked.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {picked.map((m) => (
                <span key={m.tmdb_id} className="flex items-center gap-1.5 text-[10px] bg-pink-600/15 text-pink-300 border border-pink-600/30 pl-2 pr-1 py-1 rounded-full">
                  {m.title}
                  <button
                    onClick={() => setPicked((prev) => prev.filter((p) => p.tmdb_id !== m.tmdb_id))}
                    className="w-4 h-4 rounded-full bg-pink-600/20 flex items-center justify-center hover:bg-pink-600/40"
                    aria-label={`Убрать ${m.title}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {fetching ? (
        <div className="text-center py-6">
          <p className="text-gray-600 text-sm animate-pulse">Загрузка...</p>
        </div>
      ) : finalList.length > 0 ? (
        <div className="bg-[#12121a] rounded-2xl p-4 border border-[#1f1f2e]">
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-80 overflow-y-auto scrollbar-thin">
            {finalList.slice(0, displayCount).map((m) => (
              <div
                key={m.tmdb_id}
                className="group relative aspect-[2/3] rounded-xl overflow-hidden bg-[#0a0a0f] border border-[#1f1f2e] transition-all hover:border-pink-600/40 hover:shadow-lg hover:shadow-pink-600/10"
              >
                <img
                  src={m.poster_path ? getPosterUrl(m.poster_path, 'w185') : m.poster_url}
                  alt={m.title}
                  className="absolute inset-0 w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-[10px] font-semibold text-white leading-tight truncate">{m.title}</p>
                  <p className="text-[9px] text-gray-400">{m.year}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mt-3">
            <p className="text-xs text-gray-600">
              {displayCount} / {finalList.length} фильмов
            </p>
            <button
              onClick={() => setPageOffset((p) => p + 1)}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-pink-400 font-medium transition-colors"
            >
              <RefreshIcon className="w-3.5 h-3.5" />
              Другая подборка
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center py-6 space-y-3">
          <p className="text-gray-600 text-sm">
            {pageOffset > 0 ? 'Больше ничего не нашлось' : 'Выберите категорию, жанры и годы'}
          </p>
          {pageOffset > 0 && (
            <button
              onClick={() => setPageOffset(0)}
              className="text-xs text-pink-400 hover:text-pink-300 font-medium transition-colors"
            >
              Вернуться к первой подборке
            </button>
          )}
        </div>
      )}

      {insertError && (
        <p className="text-center text-red-400 text-xs bg-red-400/10 py-2 px-4 rounded-xl">{insertError}</p>
      )}

      {finalList.length > 0 && (
        <button
          onClick={handleInsertMovies}
          disabled={inserting}
          className="w-full py-4 bg-pink-600 disabled:opacity-40 text-white font-bold rounded-xl transition-all active:scale-[0.98] text-sm shadow-lg shadow-pink-600/20 hover:bg-pink-500"
        >
          {inserting
            ? 'Загрузка...'
            : isSolo
              ? `Начать (${displayCount} фильмов)`
              : `Использовать (${displayCount} фильмов)`
          }
        </button>
      )}
    </div>
  );
}

function FilterChip({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all ${
        active
          ? 'bg-pink-600/20 text-pink-300 border border-pink-600/40'
          : 'bg-[#0a0a0f] text-gray-500 border border-[#1f1f2e] hover:text-gray-300 hover:border-gray-700'
      }`}
    >
      {children}
    </button>
  );
}

function JoinByLink({ onJoin }: { onJoin: (name: string) => Promise<void> }) {
  const [name, setName] = useState('');
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = async () => {
    if (!name.trim()) return;
    setJoining(true);
    setError(null);
    try {
      await onJoin(name.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось войти. Попробуйте ещё раз.');
      setJoining(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-5">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-2">
            <div className="w-12 h-12 rounded-2xl bg-pink-600 flex items-center justify-center shadow-lg shadow-pink-600/25">
              <FilmIcon className="w-6 h-6 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white">Тебя пригласили!</h1>
          <p className="text-gray-500 text-sm">Введи имя, чтобы войти в комнату</p>
        </div>
        <div className="relative">
          <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleJoin(); }}
            placeholder="Ваше имя"
            maxLength={30}
            autoFocus
            className="w-full pl-11 pr-5 py-3.5 bg-[#12121a] border border-[#1f1f2e] rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-pink-600/50 transition-colors text-sm"
          />
        </div>
        {error && (
          <div className="text-red-400 text-xs text-center bg-red-400/10 py-2.5 px-4 rounded-xl">{error}</div>
        )}
        <button
          onClick={handleJoin}
          disabled={joining || !name.trim()}
          className="w-full py-4 bg-pink-600 disabled:opacity-40 text-white font-bold rounded-xl transition-all active:scale-[0.98] text-sm shadow-lg shadow-pink-600/30 hover:bg-pink-500"
        >
          {joining ? 'Вход...' : 'Войти в комнату'}
        </button>
      </div>
    </div>
  );
}

function LoadingSplash() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-gray-600 text-sm animate-pulse">Загрузка...</div>
    </div>
  );
}

function ErrorSplash({ message }: { message: string }) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center space-y-2">
        <div className="text-gray-500 text-sm">{message}</div>
      </div>
    </div>
  );
}
