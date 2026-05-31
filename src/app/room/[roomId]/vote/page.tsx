'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useVoting } from '@/hooks/useVoting';
import { useRoom } from '@/hooks/useRoom';
import MovieCard from '@/components/MovieCard';
import VoteButtons from '@/components/VoteButtons';
import ProgressBar from '@/components/ProgressBar';
import { VoteType } from '@/types';

export default function VotePage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;

  const [participantId, setParticipantId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);

  useEffect(() => {
    const pid = sessionStorage.getItem('participant_id');
    const host = sessionStorage.getItem('is_host') === 'true';
    if (!pid) { router.push('/'); return; }
    setParticipantId(pid);
    setIsHost(host);
  }, [router]);

  const {
    currentMovie, currentIndex, progress, loading,
    hasVotedCurrent, allVoted, currentVoteType,
    movies, castVote, goToNext, goToPrevious, isLastMovie,
  } = useVoting(roomId, participantId);

  const { room, endVoting } = useRoom(roomId);

  useEffect(() => {
    if (room?.status === 'completed') router.push(`/room/${roomId}/results`);
  }, [room?.status, roomId, router]);

  const handleVote = useCallback(async (type: VoteType) => {
    await castVote(type);
  }, [castVote]);

  const handleSwipe = useCallback((dir: 'left' | 'right') => {
    if (dir === 'right') castVote('want');
    else castVote('dont_mind');
  }, [castVote]);

  const handleSwipeUp = useCallback(() => {
    castVote('seen');
  }, [castVote]);

  const handleEndVoting = async () => {
    try { await endVoting(); } catch {}
  };

  if (!loading && movies.length === 0 && !currentMovie) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <div className="text-gray-500 text-sm">Нет фильмов для голосования</div>
          <button onClick={() => router.push(`/room/${roomId}`)}
            className="px-6 py-3 bg-pink-600 text-white font-semibold rounded-xl text-sm hover:bg-pink-500">
            Вернуться в лобби
          </button>
        </div>
      </div>
    );
  }

  if (loading || !currentMovie) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-600 text-sm animate-pulse">Загрузка...</div>
      </div>
    );
  }

  const handleBack = () => router.push(`/room/${roomId}`);

  return (
    <div className="flex-1 flex flex-col items-center px-4 py-6 max-w-lg mx-auto w-full">
      <button onClick={handleBack} className="self-start mb-2 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-300 transition-colors">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        Назад
      </button>
      <div className="w-full max-w-sm space-y-3 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 font-medium">{progress}</span>
          {allVoted && <span className="text-xs text-green-400 font-medium">Все проголосовали ✓</span>}
        </div>
        <ProgressBar current={currentIndex + 1} total={movies.length} />
      </div>

      <div className="flex-1 flex items-center justify-center w-full py-2">
        <MovieCard
          key={currentMovie.id}
          movie={currentMovie}
          onSwipe={handleSwipe}
          onSwipeUp={handleSwipeUp}
        />
      </div>

      <div className="w-full mt-4 space-y-4">
        <VoteButtons
          onVote={handleVote}
          selectedType={currentVoteType}
        />

        <div className="flex items-center justify-center gap-4">
          {!isLastMovie && hasVotedCurrent && (
            <button
              onClick={() => goToNext()}
              className="px-6 py-3 bg-pink-600 text-white text-sm font-semibold rounded-xl transition-all active:scale-95 shadow-lg shadow-pink-600/20 hover:bg-pink-500"
            >
              Далее →
            </button>
          )}
          {isLastMovie && hasVotedCurrent && (
            <span className="text-gray-500 text-xs">Последний ✓</span>
          )}
          {isHost && (
            <button
              onClick={handleEndVoting}
              className="px-6 py-3 bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-semibold rounded-xl transition-all active:scale-95"
            >
              Завершить
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
