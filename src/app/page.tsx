'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useRoom } from '@/hooks/useRoom';
import { FilmIcon, UserIcon, SoloIcon, PlusIcon, LinkIcon, ArrowRightIcon } from '@/components/Icons';
import PosterBackground from '@/components/PosterBackground';

export default function HomePage() {
  const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY || '';
  const router = useRouter();
  const { createRoom, joinRoom } = useRoom();
  const [mode, setMode] = useState<'solo' | 'create' | 'join'>('solo');
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);

  const handleSolo = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setJoinError(null);
    try {
      const { room, hostId } = await createRoom(name.trim(), 80);
      sessionStorage.setItem('participant_id', hostId);
      sessionStorage.setItem('participant_name', name.trim());
      sessionStorage.setItem('is_host', 'true');
      sessionStorage.setItem('game_mode', 'solo');
      router.push(`/room/${room.id}`);
    } catch (err) {
      setJoinError(typeof err === 'object' && err !== null ? JSON.stringify(err) : String(err));
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setJoinError(null);
    try {
      const { room, hostId } = await createRoom(name.trim(), 80);
      sessionStorage.setItem('participant_id', hostId);
      sessionStorage.setItem('participant_name', name.trim());
      sessionStorage.setItem('is_host', 'true');
      sessionStorage.setItem('game_mode', 'multi');
      router.push(`/room/${room.id}`);
    } catch (err) {
      setJoinError(typeof err === 'object' && err !== null ? JSON.stringify(err) : String(err));
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!inviteCode.trim() || !name.trim()) return;
    setLoading(true);
    setJoinError(null);
    try {
      const { room, participantId } = await joinRoom(inviteCode.trim(), name.trim());
      sessionStorage.setItem('participant_id', participantId);
      sessionStorage.setItem('participant_name', name.trim());
      sessionStorage.setItem('is_host', 'false');
      sessionStorage.setItem('game_mode', 'multi');
      router.push(`/room/${room.id}`);
    } catch (err) {
      setJoinError(typeof err === 'object' && err !== null ? JSON.stringify(err) : String(err));
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 relative">
      {apiKey && <PosterBackground apiKey={apiKey} />}
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
      </div>
    </div>
  );
}
