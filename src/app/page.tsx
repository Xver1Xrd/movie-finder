'use client';

import { useState, useEffect, lazy, Suspense } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useRoom } from '@/hooks/useRoom';
import { getHistory, HistoryEntry } from '@/lib/history';
import { saveRoomIdentity } from '@/lib/storage';
import { getWatchlist, setWatched, removeFromWatchlist, WatchlistItem } from '@/lib/prefs';
import { FilmIcon, UserIcon, SoloIcon, PlusIcon, LinkIcon, ArrowRightIcon, MedalIcon, CheckIcon, EyeIcon } from '@/components/Icons';

const PosterBackground = lazy(() => import('@/components/PosterBackground'));

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && err !== null && 'message' in err) {
    return String((err as { message: unknown }).message);
  }
  return 'Что-то пошло не так. Попробуйте ещё раз.';
}

export default function HomePage() {
  const router = useRouter();
  const { createRoom, joinRoom } = useRoom();
  const [mode, setMode] = useState<'solo' | 'create' | 'join'>('solo');
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);

  useEffect(() => {
    setHistory(getHistory());
    setWatchlist(getWatchlist());
  }, []);

  const toggleWatched = (tmdbId: number, watched: boolean) => {
    setWatched(tmdbId, watched);
    setWatchlist(getWatchlist());
  };

  const removeItem = (tmdbId: number) => {
    removeFromWatchlist(tmdbId);
    setWatchlist(getWatchlist());
  };

  const handleSolo = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setJoinError(null);
    try {
      const { room, hostId } = await createRoom(name.trim(), 80);
      saveRoomIdentity(room.id, { participantId: hostId, name: name.trim(), isHost: true, mode: 'solo' });
      router.push(`/room/${room.id}`);
    } catch (err) {
      setJoinError(errorMessage(err));
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setJoinError(null);
    try {
      const { room, hostId } = await createRoom(name.trim(), 80);
      saveRoomIdentity(room.id, { participantId: hostId, name: name.trim(), isHost: true, mode: 'multi' });
      router.push(`/room/${room.id}`);
    } catch (err) {
      setJoinError(errorMessage(err));
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!inviteCode.trim() || !name.trim()) return;
    setLoading(true);
    setJoinError(null);
    try {
      const { room, participantId } = await joinRoom(inviteCode.trim(), name.trim());
      saveRoomIdentity(room.id, { participantId, name: name.trim(), isHost: false, mode: 'multi' });
      router.push(`/room/${room.id}`);
    } catch (err) {
      setJoinError(errorMessage(err));
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 relative">
      <Suspense fallback={null}><PosterBackground /></Suspense>
      <div className="w-full max-w-sm space-y-8 relative z-20">
        <div className="text-center space-y-4 pt-8">
          <div className="flex justify-center mb-2">
            <div className="w-14 h-14 rounded-2xl bg-pink-600 flex items-center justify-center shadow-lg shadow-pink-600/25">
              <FilmIcon className="w-7 h-7 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-black tracking-tight">
            Movie
            <span className="text-pink-500">Tier</span>
          </h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            Свайпай фильмы и выбирай
            <br />идеальный с друзьями.
          </p>
        </div>

        {mode === 'solo' ? (
          <div className="space-y-4">
            <div className="relative">
              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ваше имя"
                maxLength={30}
                className="w-full pl-11 pr-5 py-3.5 bg-[#12121a] border border-[#1f1f2e] rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-pink-600/50 transition-colors text-sm"
              />
            </div>
            <button
              onClick={handleSolo}
              disabled={loading || !name.trim()}
              className="w-full py-4 bg-pink-600 disabled:opacity-40 text-white font-bold rounded-xl transition-all active:scale-[0.98] text-base shadow-lg shadow-pink-600/30 flex items-center justify-center gap-2 hover:bg-pink-500"
            >
              <SoloIcon className="w-4 h-4" />
              {loading ? 'Запуск...' : 'Один'}
            </button>
            {joinError && mode === 'solo' && (
              <div className="text-red-400 text-xs text-center bg-red-400/10 py-2.5 px-4 rounded-xl">{joinError}</div>
            )}
            <div className="flex gap-2">
              <button onClick={() => { setMode('create'); setJoinError(null); }} className="flex-1 py-3 bg-[#12121a] border border-[#1f1f2e] text-gray-400 text-sm font-medium rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 hover:border-gray-700">
                <PlusIcon className="w-3.5 h-3.5" />
                Создать комнату
              </button>
              <button onClick={() => { setMode('join'); setJoinError(null); }} className="flex-1 py-3 bg-[#12121a] border border-[#1f1f2e] text-gray-400 text-sm font-medium rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 hover:border-gray-700">
                <LinkIcon className="w-3.5 h-3.5" />
                Присоединиться
              </button>
            </div>
          </div>
        ) : mode === 'create' ? (
          <div className="space-y-4">
            <div className="relative">
              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ваше имя"
                maxLength={30}
                className="w-full pl-11 pr-5 py-3.5 bg-[#12121a] border border-[#1f1f2e] rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-pink-600/50 transition-colors text-sm"
              />
            </div>
            {joinError && mode === 'create' && (
              <div className="text-red-400 text-xs text-center bg-red-400/10 py-2.5 px-4 rounded-xl">{joinError}</div>
            )}
            <button
              onClick={handleCreate}
              disabled={loading || !name.trim()}
              className="w-full py-3.5 bg-pink-600 disabled:opacity-40 text-white font-semibold rounded-xl transition-all active:scale-[0.98] text-sm shadow-lg shadow-pink-600/20 hover:bg-pink-500"
            >
              {loading ? 'Создание...' : 'Создать комнату'}
            </button>
            <button onClick={() => { setMode('solo'); setJoinError(null); }} className="w-full text-center text-gray-600 text-xs hover:text-gray-400 transition-colors flex items-center justify-center gap-1">
              <ArrowRightIcon className="w-3 h-3 rotate-180" />
              Назад
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative">
              <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="Код приглашения"
                maxLength={6}
                className="w-full pl-11 pr-5 py-3.5 bg-[#12121a] border border-[#1f1f2e] rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-pink-600/50 transition-colors text-sm uppercase text-center tracking-widest font-mono"
              />
            </div>
            <div className="relative">
              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ваше имя"
                maxLength={30}
                className="w-full pl-11 pr-5 py-3.5 bg-[#12121a] border border-[#1f1f2e] rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-pink-600/50 transition-colors text-sm"
              />
            </div>
            {joinError && (
              <div className="text-red-400 text-xs text-center bg-red-400/10 py-2.5 px-4 rounded-xl">{joinError}</div>
            )}
            <button
              onClick={handleJoin}
              disabled={loading || !inviteCode.trim() || !name.trim()}
              className="w-full py-3.5 bg-pink-600 disabled:opacity-40 text-white font-semibold rounded-xl transition-all active:scale-[0.98] text-sm shadow-lg shadow-pink-600/20 hover:bg-pink-500"
            >
              {loading ? 'Вход...' : 'Присоединиться'}
            </button>
            <button onClick={() => { setMode('solo'); setJoinError(null); }} className="w-full text-center text-gray-600 text-xs hover:text-gray-400 transition-colors flex items-center justify-center gap-1">
              <ArrowRightIcon className="w-3 h-3 rotate-180" />
              Назад
            </button>
          </div>
        )}

        {mode === 'solo' && watchlist.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <EyeIcon className="w-3.5 h-3.5 text-gray-600" />
              <span className="text-xs text-gray-600 font-medium">Вотчлист</span>
              <span className="text-[10px] text-gray-700">{watchlist.filter((w) => !w.watched).length} не просмотрено</span>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-thin">
              {watchlist.map((w) => (
                <div
                  key={w.tmdb_id}
                  className={`flex items-center gap-3 bg-[#12121a] border border-[#1f1f2e] rounded-xl px-3 py-2 transition-all ${w.watched ? 'opacity-50' : ''}`}
                >
                  <Image src={w.poster_url} alt="" width={32} height={48} className="w-8 h-12 rounded-md object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${w.watched ? 'text-gray-500 line-through' : 'text-white'}`}>{w.title}</p>
                    <p className="text-[10px] text-gray-600">{new Date(w.date).toLocaleDateString('ru-RU')}</p>
                  </div>
                  <button
                    onClick={() => toggleWatched(w.tmdb_id, !w.watched)}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                      w.watched
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-[#1f1f2e] text-gray-600 hover:text-gray-400'
                    }`}
                    title={w.watched ? 'Посмотрели' : 'Отметить просмотренным'}
                  >
                    <CheckIcon className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => removeItem(w.tmdb_id)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-gray-700 hover:text-red-400 transition-colors"
                    title="Убрать из вотчлиста"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {mode === 'solo' && history.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <MedalIcon className="w-3.5 h-3.5 text-gray-600" />
              <span className="text-xs text-gray-600 font-medium">Прошлые сессии</span>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-thin">
              {history.map((h) => (
                <button
                  key={h.roomId}
                  onClick={() => router.push(`/room/${h.roomId}/results`)}
                  className="w-full flex items-center gap-3 bg-[#12121a] border border-[#1f1f2e] rounded-xl px-3 py-2 text-left transition-all hover:border-pink-600/40 active:scale-[0.98]"
                >
                  {h.winnerPoster ? (
                    <Image src={h.winnerPoster} alt="" width={32} height={48} className="w-8 h-12 rounded-md object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-8 h-12 rounded-md bg-[#1f1f2e] flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">{h.winnerTitle}</p>
                    <p className="text-[10px] text-gray-600">
                      {h.mode === 'solo' ? 'Соло' : 'Комната'} · {h.totalMovies} фильмов · {new Date(h.date).toLocaleDateString('ru-RU')}
                    </p>
                  </div>
                  <ArrowRightIcon className="w-3.5 h-3.5 text-gray-700 flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
