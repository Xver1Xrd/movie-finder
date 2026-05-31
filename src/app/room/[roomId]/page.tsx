'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  FormattedMovie, Category, discoverMedia,
  fetchGenreList, getCategoryGenreType,
} from '@/lib/tmdb';
import { discoverAnimeJikan, fetchJikanGenres, JikanMovie } from '@/lib/jikan';
import { getPosterUrl } from '@/lib/tmdb';
import { useRoom } from '@/hooks/useRoom';
import { MAX_PARTICIPANTS } from '@/types';
import {
  FilmIcon, CopyIcon, CheckIcon, UsersIcon,
  PlusIcon
} from '@/components/Icons';
import YearRangeSlider from '@/components/YearRangeSlider';

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
  const { room, participants, loading, setReady, startVoting } = useRoom(roomId);
  const [isHost, setIsHost] = useState(false);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [readyLoading, setReadyLoading] = useState(false);
  const [gameMode, setGameMode] = useState<'solo' | 'multi'>('multi');
  const [moviesInserted, setMoviesInserted] = useState(false);

  useEffect(() => {
    setParticipantId(sessionStorage.getItem('participant_id'));
    setIsHost(sessionStorage.getItem('is_host') === 'true');
    const mode = sessionStorage.getItem('game_mode');
    if (mode === 'solo' || mode === 'multi') setGameMode(mode);
  }, []);

  const isSolo = gameMode === 'solo';

  useEffect(() => {
    if (room?.status === 'voting') router.push(`/room/${roomId}/vote`);
    if (room?.status === 'completed') router.push(`/room/${roomId}/results`);
  }, [room?.status, roomId, router]);

  const myParticipant = participants.find((p) => p.id === participantId);
  const allReady = participants.length >= 2 && participants.every((p) => p.is_ready);

  useEffect(() => {
    if (allReady && isHost && room?.status === 'setup') {
      startVoting();
    }
  }, [allReady, isHost, room?.status, startVoting]);

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

  if (loading) return <LoadingSplash />;
  if (!room) return <ErrorSplash message="Комната не найдена" />;

  const handleBackHome = () => router.push('/');

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
        {!isSolo && participants.length < MAX_PARTICIPANTS && Array.from({ length: MAX_PARTICIPANTS - participants.length }).map((_, i) => (
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
  const [yearMax, setYearMax] = useState(2026);
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [movieCount, setMovieCount] = useState(20);
  const [genreList, setGenreList] = useState<TMDBGenre[]>([]);
  const [results, setResults] = useState<FormattedMovie[]>([]);
  const [fetching, setFetching] = useState(false);
  const [inserting, setInserting] = useState(false);
  const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY || '';
  const fetchTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    (async () => {
      if (category === 'anime') {
        const list = await fetchJikanGenres();
        setGenreList(list.map((g) => ({ id: g.mal_id, name: g.name })));
      } else {
        if (!apiKey) return;
        const type = getCategoryGenreType(category);
        const list = await fetchGenreList(apiKey, type);
        setGenreList(list);
      }
      setSelectedGenres([]);
    })();
  }, [category, apiKey]);

  const fetchMovies = useCallback(async (
    cat: Category, yMin: number, yMax: number, genres: number[], countries: string[], count: number
  ) => {
    setFetching(true);
    try {
      const pages = Math.max(1, Math.ceil(count / 20));
      if (cat === 'anime') {
        const movies = await discoverAnimeJikan(yMin, yMax, genres);
        setResults(movies as unknown as FormattedMovie[]);
      } else {
        const movies = await discoverMedia(apiKey, cat, yMin, yMax, genres, pages, countries);
        setResults(movies);
      }
    } catch {}
    setFetching(false);
  }, [apiKey]);

  useEffect(() => {
    setResults([]);
    if (fetchTimer.current) clearTimeout(fetchTimer.current);
    fetchTimer.current = setTimeout(() => {
      fetchMovies(category, yearMin, yearMax, selectedGenres, selectedCountries, movieCount);
    }, 400);
    return () => { if (fetchTimer.current) clearTimeout(fetchTimer.current); };
  }, [category, yearMin, yearMax, selectedGenres, selectedCountries, movieCount, fetchMovies]);

  const toggleGenre = (id: number) => {
    setSelectedGenres((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  };

  const handleInsertMovies = async () => {
    if (results.length === 0) return;
    setInserting(true);
    try {
      const total = Math.min(results.length, Math.min(movieCount, maxMovies));
      const inserts = results.slice(0, total).map((m, i) => ({
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
      alert('Ошибка при загрузке фильмов. Попробуйте снова.');
      console.error(e);
    }
    setInserting(false);
  };

  const displayCount = Math.min(results.length, Math.min(movieCount, maxMovies));

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
      </div>

      {fetching ? (
        <div className="text-center py-6">
          <p className="text-gray-600 text-sm animate-pulse">Загрузка...</p>
        </div>
      ) : results.length > 0 ? (
        <div className="bg-[#12121a] rounded-2xl p-4 border border-[#1f1f2e]">
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-80 overflow-y-auto scrollbar-thin">
            {results.slice(0, displayCount).map((m) => (
              <div
                key={m.tmdb_id}
                className="group relative aspect-[2/3] rounded-xl overflow-hidden bg-[#0a0a0f] border border-[#1f1f2e] transition-all hover:border-pink-600/40 hover:shadow-lg hover:shadow-pink-600/10"
              >
                <img
                  src={getPosterUrl(m.poster_path, 'w185')}
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
          <p className="text-center text-xs text-gray-600 mt-3">
            {displayCount} / {results.length} фильмов
          </p>
        </div>
      ) : (
        <div className="text-center py-6">
          <p className="text-gray-600 text-sm">Выберите категорию, жанры и годы</p>
        </div>
      )}

      {results.length > 0 && (
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
