'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useVoting } from '@/hooks/useVoting';
import { useRoom } from '@/hooks/useRoom';
import MovieCard from '@/components/MovieCard';
import MovieDetailsModal from '@/components/MovieDetailsModal';
import VoteButtons from '@/components/VoteButtons';
import ProgressBar from '@/components/ProgressBar';
import { FireIcon } from '@/components/Icons';
import { VoteType, Movie } from '@/types';
import { getRoomIdentity } from '@/lib/storage';

export default function VotePage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;

  const [participantId, setParticipantId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [voteError, setVoteError] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showMyVotes, setShowMyVotes] = useState(false);
  const voteErrorTimer = useRef<ReturnType<typeof setTimeout>>();
  const advanceTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const identity = getRoomIdentity(roomId);
    // Не участник — отправляем в лобби, там можно войти по ссылке
    if (!identity) { router.push(`/room/${roomId}`); return; }
    setParticipantId(identity.participantId);
    setIsHost(identity.isHost);
  }, [roomId, router]);

  useEffect(() => {
    return () => {
      if (voteErrorTimer.current) clearTimeout(voteErrorTimer.current);
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    };
  }, []);

  const {
    currentMovie, currentIndex, progress, loading,
    hasVotedCurrent, allVoted, currentVoteType,
    movies, castVote, goToNext, goToIndex, isLastMovie,
    matchedMovie, dismissMatch, participantVotes,
    participantProgress, everyoneVotedAll, totalParticipants,
  } = useVoting(roomId, participantId);

  const { room, participants, endVoting } = useRoom(roomId);

  useEffect(() => {
    if (room?.status === 'completed') router.push(`/room/${roomId}/results`);
  }, [room?.status, roomId, router]);

  // Все участники проголосовали за всё — комната завершается автоматически.
  // Триггерит любой участник (а не только хост), иначе закрытая вкладка хоста
  // навсегда подвешивает комнату на последнем фильме.
  useEffect(() => {
    if (everyoneVotedAll && totalParticipants >= 2 && room?.status === 'voting') {
      endVoting().catch(() => {});
    }
  }, [everyoneVotedAll, totalParticipants, room?.status, endVoting]);

  // Тиндер-механика: успешный голос сам переводит к следующему фильму —
  // задержка достаточная, чтобы увидеть выбор, но без лишнего тапа на «Далее»
  const handleVote = useCallback(async (type: VoteType, advanceDelay = 400) => {
    const ok = await castVote(type);
    if (!ok) {
      setVoteError(true);
      if (voteErrorTimer.current) clearTimeout(voteErrorTimer.current);
      voteErrorTimer.current = setTimeout(() => setVoteError(false), 3000);
      return;
    }
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(() => goToNext(), advanceDelay);
  }, [castVote, goToNext]);

  const handleSwipe = useCallback((dir: 'left' | 'right') => {
    // Карточка уже улетела за экран к моменту вызова — переходим сразу
    handleVote(dir === 'right' ? 'want' : 'dont_mind', 0);
  }, [handleVote]);

  const handleEndVoting = async () => {
    try { await endVoting(); } catch {}
  };

  // Стрелки ←/→ — голос «Нет»/«Да» с клавиатуры, отключены при открытых модалках
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (showDetails || showMyVotes || matchedMovie) return;
      if (e.key === 'ArrowRight') handleVote('want');
      else if (e.key === 'ArrowLeft') handleVote('dont_mind');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleVote, showDetails, showMyVotes, matchedMovie]);

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

        {participants.length >= 2 && (
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {participants.map((p) => {
              const voted = participantProgress[p.id] || 0;
              const done = voted >= movies.length && movies.length > 0;
              const isMe = p.id === participantId;
              return (
                <div key={p.id} className="flex items-center gap-1.5" title={`${p.name}: ${voted} из ${movies.length}`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                    done ? 'bg-green-500/20 text-green-400' : 'bg-[#1f1f2e] text-gray-400'
                  }`}>
                    {p.name.charAt(0).toUpperCase()}
                  </span>
                  <span className={`text-[10px] ${done ? 'text-green-400' : 'text-gray-600'}`}>
                    {isMe ? 'вы' : p.name.split(' ')[0]} · {done ? '✓' : `${voted}/${movies.length}`}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex-1 flex items-center justify-center w-full py-2">
        <MovieCard
          key={currentMovie.id}
          movie={currentMovie}
          onSwipe={handleSwipe}
          onInfo={() => setShowDetails(true)}
        />
      </div>

      <div className="w-full mt-4 space-y-4">
        {voteError && (
          <p className="text-center text-red-400 text-xs bg-red-400/10 py-2 px-4 rounded-xl max-w-sm mx-auto">
            Не удалось сохранить голос. Проверьте соединение и попробуйте ещё раз.
          </p>
        )}

        <VoteButtons
          onVote={handleVote}
          selectedType={currentVoteType}
        />
        <p className="hidden sm:block text-center text-gray-700 text-[10px]">← Нет&nbsp;&nbsp;·&nbsp;&nbsp;Да →</p>

        <div className="flex items-center justify-center gap-4">
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

        {Object.keys(participantVotes).length > 0 && (
          <button
            onClick={() => setShowMyVotes(true)}
            className="w-full text-center text-gray-600 text-xs hover:text-gray-400 transition-colors"
          >
            Мои голоса ({Object.keys(participantVotes).length})
          </button>
        )}
      </div>

      {showDetails && (
        <MovieDetailsModal movie={currentMovie} onClose={() => setShowDetails(false)} />
      )}

      {showMyVotes && (
        <MyVotesModal
          movies={movies}
          votes={participantVotes}
          onSelect={(index) => { goToIndex(index); setShowMyVotes(false); }}
          onClose={() => setShowMyVotes(false)}
        />
      )}

      {matchedMovie && (
        <MatchModal
          movie={matchedMovie}
          isHost={isHost}
          onContinue={() => dismissMatch(matchedMovie.id)}
          onFinish={async () => {
            dismissMatch(matchedMovie.id);
            await handleEndVoting();
          }}
        />
      )}
    </div>
  );
}

function MyVotesModal({ movies, votes, onSelect, onClose }: {
  movies: Movie[];
  votes: Record<string, VoteType>;
  onSelect: (index: number) => void;
  onClose: () => void;
}) {
  const voted = movies
    .map((m, index) => ({ movie: m, index, vote: votes[m.id] }))
    .filter((x) => x.vote !== undefined);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md max-h-[80vh] overflow-y-auto scrollbar-thin bg-[#12121a] border border-[#1f1f2e] rounded-t-3xl sm:rounded-3xl p-5 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white">Мои голоса</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl leading-none px-1">×</button>
        </div>
        <p className="text-xs text-gray-600">Нажми на фильм, чтобы вернуться к нему и передумать</p>
        <div className="space-y-1.5">
          {voted.map(({ movie, index, vote }) => (
            <button
              key={movie.id}
              onClick={() => onSelect(index)}
              className="w-full flex items-center gap-3 bg-[#0a0a0f] border border-[#1f1f2e] rounded-xl px-3 py-2 text-left hover:border-pink-600/40 transition-all"
            >
              <img src={movie.poster_url} alt="" className="w-8 h-12 rounded-md object-cover flex-shrink-0" loading="lazy" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{movie.title}</p>
                <p className="text-[10px] text-gray-600">{movie.year}</p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0 ${
                vote === 'want'
                  ? 'bg-green-500/15 text-green-400'
                  : 'bg-red-500/15 text-red-400'
              }`}>
                {vote === 'want' ? 'Да' : 'Нет'}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const CONFETTI_COLORS = ['#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#a855f7', '#ef4444'];

function Confetti() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 40 }).map((_, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            left: `${Math.random() * 100}%`,
            backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
            animationDelay: `${Math.random() * 1.5}s`,
            animationDuration: `${2 + Math.random() * 2}s`,
            transform: `rotate(${Math.random() * 360}deg)`,
          }}
        />
      ))}
    </div>
  );
}

function MatchModal({ movie, isHost, onContinue, onFinish }: {
  movie: Movie;
  isHost: boolean;
  onContinue: () => void;
  onFinish: () => void;
}) {
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([100, 50, 200]);
    }
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
      <Confetti />
      <div className="w-full max-w-xs bg-[#12121a] border border-pink-600/40 rounded-3xl p-6 text-center space-y-4 shadow-2xl shadow-pink-600/20 relative">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-full bg-pink-600/20 flex items-center justify-center">
            <FireIcon className="w-6 h-6 text-pink-500" />
          </div>
        </div>
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-white">Это мэтч!</h2>
          <p className="text-gray-400 text-sm">Все хотят посмотреть этот фильм</p>
        </div>
        <div className="relative aspect-[2/3] w-32 mx-auto rounded-xl overflow-hidden border border-pink-600/40 shadow-lg">
          <img src={movie.poster_url} alt={movie.title} className="absolute inset-0 w-full h-full object-cover" />
        </div>
        <p className="text-white font-bold text-sm leading-tight">{movie.title}</p>
        <div className="space-y-2">
          {isHost && (
            <button
              onClick={onFinish}
              className="w-full py-3 bg-pink-600 hover:bg-pink-500 text-white text-sm font-bold rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-pink-600/30"
            >
              Завершить и смотреть
            </button>
          )}
          <button
            onClick={onContinue}
            className="w-full py-3 bg-[#1f1f2e] hover:bg-[#28283a] text-gray-300 text-sm font-semibold rounded-xl transition-all active:scale-[0.98]"
          >
            Продолжить голосование
          </button>
        </div>
      </div>
    </div>
  );
}
