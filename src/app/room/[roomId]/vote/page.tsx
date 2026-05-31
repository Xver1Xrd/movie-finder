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
  } = useVoting(roomId, participantId || '');

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

  if (loading || !currentMovie) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-600 text-sm animate-pulse">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center px-4 py-6 max-w-lg mx-auto w-full">
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
