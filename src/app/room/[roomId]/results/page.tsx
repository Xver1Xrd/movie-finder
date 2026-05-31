'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { calculateResults } from '@/lib/scoring';
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

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const [moviesData, votesData, participantsData] = await Promise.all([
          supabase.from('movies').select('*').eq('room_id', roomId).order('sort_order', { ascending: true }),
          supabase.from('votes').select('*').eq('room_id', roomId),
          supabase.from('participants').select('id', { count: 'exact', head: true }).eq('room_id', roomId),
        ]);

        const movies = (moviesData.data || []) as Movie[];
        const votes = (votesData.data || []) as Vote[];
        const totalParticipants = participantsData.count || 0;

        if (movies.length === 0) {
          setError('Фильмы не найдены');
          setLoading(false);
          return;
        }

        const mode = sessionStorage.getItem('game_mode');
        const solo = mode === 'solo';
        setIsSolo(solo);
        const computedResults = calculateResults(movies, votes, totalParticipants, solo);
        setResults(computedResults);
      } catch {
        setError('Ошибка загрузки');
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [roomId]);

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
      <div className="mt-auto pb-8 text-center">
        <button onClick={handleReturnHome}
          className="px-6 py-3 bg-[#12121a] border border-[#1f1f2e] text-gray-400 text-sm font-semibold rounded-xl transition-all active:scale-95">
          Новая сессия
        </button>
      </div>
    </div>
  );
}
