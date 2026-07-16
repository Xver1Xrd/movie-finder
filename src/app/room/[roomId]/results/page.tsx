'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { calculateResults } from '@/lib/scoring';
import { saveHistoryEntry, getHistoryEntry } from '@/lib/history';
import { getRoomIdentity } from '@/lib/storage';
import { addToWatchlist, addSeenIds, bumpGenreAffinity } from '@/lib/prefs';
import { fetchWatchProviders, getProviderLogoUrl, WatchProvider } from '@/lib/tmdb';
import { useRoom } from '@/hooks/useRoom';
import ResultsPanel from '@/components/ResultsPanel';
import { Movie, Vote, RoomResults } from '@/types';

export default function ResultsPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;

  const [results, setResults] = useState<RoomResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSolo, setIsSolo] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [winnerProviders, setWinnerProviders] = useState<WatchProvider[]>([]);
  const [shared, setShared] = useState(false);
  const [startingFinal, setStartingFinal] = useState(false);
  const [finalRoundError, setFinalRoundError] = useState<string | null>(null);

  const { room, startFinalRound } = useRoom(roomId);

  // Финальный раунд вернул комнату в голосование — уходим свайпать финалистов
  useEffect(() => {
    if (room?.status === 'voting' && getRoomIdentity(roomId)) {
      router.push(`/room/${roomId}/vote`);
    }
  }, [room?.status, roomId, router]);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const [moviesData, votesData, participantsData] = await Promise.all([
          supabase.from('movies').select('*').eq('room_id', roomId).order('sort_order', { ascending: true }),
          supabase.from('votes').select('*').eq('room_id', roomId),
          supabase.from('participants').select('id', { count: 'exact', head: true }).eq('room_id', roomId),
        ]);

        const allMovies = (moviesData.data || []) as Movie[];
        const votes = (votesData.data || []) as Vote[];
        const totalParticipants = participantsData.count || 0;

        if (allMovies.length === 0) {
          setError('Фильмы не найдены');
          setLoading(false);
          return;
        }

        // Режим берём из личности в этой комнате, а при просмотре из истории — из записи
        const identity = getRoomIdentity(roomId);
        const solo = identity ? identity.mode === 'solo' : getHistoryEntry(roomId)?.mode === 'solo';
        setIsSolo(solo);
        setIsHost(identity?.isHost ?? false);

        const computedResults = calculateResults(allMovies, votes, totalParticipants, solo);
        setResults(computedResults);

        // История сохраняется только тем, кто реально участвовал — иначе просмотр
        // результатов по ссылке «Поделиться» замусорит историю чужой сессией
        if (identity) {
          saveHistoryEntry({
            roomId,
            mode: solo ? 'solo' : 'multi',
            winnerTitle: computedResults.winner.movie.title,
            winnerPoster: computedResults.winner.movie.poster_url,
            totalMovies: allMovies.length,
            date: new Date().toISOString(),
          });

          // Участник сессии — пополняем локальные предпочтения
          addSeenIds(allMovies.map((m) => m.tmdb_id));

          const myYesMovieIds = new Set(
            votes
              .filter((v) => v.participant_id === identity.participantId && v.vote_type === 'want')
              .map((v) => v.movie_id)
          );
          const myYesMovies = allMovies.filter((m) => myYesMovieIds.has(m.id));
          bumpGenreAffinity(myYesMovies.flatMap((m) => m.genres));

          // В вотчлист: мэтчи (все «Да») и победитель; в соло — понравившиеся
          const date = new Date().toISOString();
          const watchlistMovies = solo
            ? myYesMovies.slice(0, 20)
            : (() => {
                const fullMatch = computedResults.top_movies
                  .filter((r) => totalParticipants >= 2 && r.yes_count === totalParticipants)
                  .map((r) => r.movie);
                return fullMatch.length > 0 ? fullMatch : [computedResults.winner.movie];
              })();
          addToWatchlist(watchlistMovies.map((m) => ({
            tmdb_id: m.tmdb_id,
            title: m.title,
            poster_url: m.poster_url,
            roomId,
            date,
          })));
        }

        fetchWatchProviders(computedResults.winner.movie.tmdb_id)
          .then(setWinnerProviders)
          .catch(() => {});
      } catch {
        setError('Ошибка загрузки');
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [roomId]);

  // Ничья: несколько фильмов с максимумом голосов «Да» (только мультиплеер, минимум 1 голос)
  const finalists = useMemo(() => {
    if (!results || isSolo) return [];
    const top = results.top_movies[0];
    if (!top || top.yes_count === 0) return [];
    return results.top_movies
      .filter((r) => r.yes_count === top.yes_count)
      .map((r) => r.movie);
  }, [results, isSolo]);

  const isTie = finalists.length >= 2;

  const handleFinalRound = async () => {
    setStartingFinal(true);
    setFinalRoundError(null);
    try {
      await startFinalRound(finalists);
      // Редирект произойдёт по realtime-смене статуса комнаты
    } catch {
      setStartingFinal(false);
      setFinalRoundError('Не удалось запустить финальный раунд. Попробуйте ещё раз.');
    }
  };

  const handleShare = async () => {
    if (!results) return;
    const url = `${window.location.origin}/room/${roomId}/results`;
    const text = `Мы выбрали фильм: «${results.winner.movie.title}» (${results.winner.movie.year}) 🎬`;
    if (navigator.share) {
      try { await navigator.share({ title: 'MovieTier', text, url }); return; } catch {}
    }
    await navigator.clipboard.writeText(`${text}\n${url}`);
    setShared(true);
    setTimeout(() => setShared(false), 2000);
  };

  const handleReturnHome = () => router.push('/');

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-600 text-sm animate-pulse">Расчёт...</div>
      </div>
    );
  }

  if (error || !results) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <div className="text-gray-500 text-sm">{error || 'Нет результатов'}</div>
          <button onClick={handleReturnHome}
            className="px-6 py-3 bg-pink-600 text-white font-semibold rounded-xl transition-all active:scale-95 text-sm hover:bg-pink-500">
            На главную
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <ResultsPanel results={results} isSolo={isSolo} />

      <div className="w-full max-w-lg mx-auto px-4 space-y-4">
        {!isSolo && winnerProviders.length > 0 && (
          <div className="bg-[#12121a] rounded-2xl p-4 border border-[#1f1f2e] space-y-2">
            <p className="text-xs text-gray-500 font-medium">Где смотреть «{results.winner.movie.title}»</p>
            <div className="flex flex-wrap items-center gap-2">
              {winnerProviders.slice(0, 8).map((p) => (
                <span key={p.provider_name} className="flex items-center gap-1.5 text-xs bg-white/5 text-gray-300 pl-1 pr-2.5 py-1 rounded-full">
                  <img src={getProviderLogoUrl(p.logo_path)} alt="" className="w-5 h-5 rounded-md" />
                  {p.provider_name}
                </span>
              ))}
            </div>
          </div>
        )}

        {isTie && (
          <div className="bg-[#12121a] rounded-2xl p-4 border border-yellow-500/30 space-y-3 text-center">
            <p className="text-sm text-yellow-400 font-semibold">
              Ничья! {finalists.length} фильма набрали поровну голосов
            </p>
            {isHost ? (
              <>
                <button
                  onClick={handleFinalRound}
                  disabled={startingFinal}
                  className="px-6 py-3 bg-yellow-500 disabled:opacity-40 text-black text-sm font-bold rounded-xl transition-all active:scale-95 hover:bg-yellow-400"
                >
                  {startingFinal ? 'Запуск...' : '⚡ Финальный раунд'}
                </button>
                {finalRoundError && (
                  <p className="text-red-400 text-xs bg-red-400/10 py-2 px-4 rounded-xl">{finalRoundError}</p>
                )}
              </>
            ) : (
              <p className="text-xs text-gray-500">Ведущий может запустить финальный раунд</p>
            )}
          </div>
        )}
      </div>

      <div className="mt-auto pt-6 pb-8 text-center space-y-3">
        <div className="flex items-center justify-center gap-3">
          <button onClick={handleShare}
            className="px-6 py-3.5 bg-[#12121a] border border-[#1f1f2e] text-gray-300 font-semibold rounded-xl transition-all active:scale-95 text-sm hover:border-pink-600/40">
            {shared ? 'Скопировано ✓' : 'Поделиться'}
          </button>
          <button onClick={handleReturnHome}
            className="px-8 py-3.5 bg-pink-600 text-white font-bold rounded-xl transition-all active:scale-95 text-sm shadow-lg shadow-pink-600/20 hover:bg-pink-500">
            На главную
          </button>
        </div>
      </div>
    </div>
  );
}
