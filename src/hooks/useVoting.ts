'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase, ensureAuthSession } from '@/lib/supabase';
import { Movie, Vote, VoteType } from '@/types';

type VoteRecord = Pick<Vote, 'movie_id' | 'vote_type' | 'participant_id'>;

function readSeenMatches(roomId: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(`matches_seen_${roomId}`) || '[]');
  } catch {
    return [];
  }
}

export function useVoting(roomId: string, participantId: string | null) {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [participantVotes, setParticipantVotes] = useState<Record<string, VoteType>>({});
  const [allVotes, setAllVotes] = useState<Record<string, VoteRecord>>({});
  const [totalParticipants, setTotalParticipants] = useState(0);
  const [loading, setLoading] = useState(true);
  const [seenMatches, setSeenMatches] = useState<string[]>([]);

  // Полный список голосов по комнате + число участников — переиспользуется
  // и при первой загрузке, и при рефетче после разрыва realtime-соединения
  const fetchAllVotes = useCallback(async () => {
    const [allVotesData, participantsCount] = await Promise.all([
      supabase
        .from('votes')
        .select('id, movie_id, vote_type, participant_id')
        .eq('room_id', roomId),
      supabase
        .from('participants')
        .select('id', { count: 'exact', head: true })
        .eq('room_id', roomId),
    ]);

    const votes = (allVotesData.data || []) as Pick<Vote, 'id' | 'movie_id' | 'vote_type' | 'participant_id'>[];
    const voteById: Record<string, VoteRecord> = {};
    for (const v of votes) {
      voteById[v.id] = { movie_id: v.movie_id, vote_type: v.vote_type, participant_id: v.participant_id };
    }
    setAllVotes(voteById);
    setTotalParticipants(participantsCount.count || 0);
  }, [roomId]);

  useEffect(() => {
    if (!participantId) return;
    const fetchData = async () => {
      const [moviesData, votesData] = await Promise.all([
        supabase
          .from('movies')
          .select('*')
          .eq('room_id', roomId)
          .order('sort_order', { ascending: true }),
        supabase
          .from('votes')
          .select('*')
          .eq('participant_id', participantId)
          .eq('room_id', roomId),
        fetchAllVotes(),
      ]);

      const allMovies = (moviesData.data || []) as Movie[];
      setMovies(allMovies);

      const myVotes = (votesData.data || []) as Vote[];
      const voteMap: Record<string, VoteType> = {};
      for (const v of myVotes) {
        voteMap[v.movie_id] = v.vote_type;
      }
      setParticipantVotes(voteMap);

      setSeenMatches(readSeenMatches(roomId));

      // Ключ включает id первого фильма: после финального раунда список новый — индекс сбросится
      const savedIndex = sessionStorage.getItem(`movie_index_${roomId}_${participantId}_${allMovies[0]?.id || ''}`);
      if (savedIndex) {
        const idx = Math.min(parseInt(savedIndex, 10), Math.max(0, allMovies.length - 1));
        setCurrentIndex(idx);
      }

      setLoading(false);
    };

    fetchData();
  }, [roomId, participantId, fetchAllVotes]);

  useEffect(() => {
    let hadDisconnect = false;
    const voteChannel = supabase
      .channel(`votes:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'votes',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          if (payload.eventType !== 'INSERT' && payload.eventType !== 'UPDATE') return;
          const vote = payload.new as Vote;
          setAllVotes((prev) => ({
            ...prev,
            [vote.id]: { movie_id: vote.movie_id, vote_type: vote.vote_type, participant_id: vote.participant_id },
          }));
        }
      )
      .subscribe((status) => {
        // postgres_changes теряет события во время разрыва — при повторной
        // подписке дотягиваем всё, что могли пропустить
        if (status === 'SUBSCRIBED') {
          if (hadDisconnect) fetchAllVotes();
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          hadDisconnect = true;
        }
      });

    return () => {
      supabase.removeChannel(voteChannel);
    };
  }, [roomId, fetchAllVotes]);

  const voteCounts = useMemo(() => {
    const counts: Record<string, Record<VoteType, number>> = {};
    for (const movie of movies) {
      counts[movie.id] = { want: 0, dont_mind: 0 };
    }
    for (const v of Object.values(allVotes)) {
      if (counts[v.movie_id]) {
        counts[v.movie_id][v.vote_type] += 1;
      }
    }
    return counts;
  }, [movies, allVotes]);

  // Мэтч: все участники проголосовали «Да» за один фильм (только мультиплеер)
  const matchedMovie = useMemo(() => {
    if (totalParticipants < 2) return null;
    for (const movie of movies) {
      if (seenMatches.includes(movie.id)) continue;
      if (voteCounts[movie.id]?.want === totalParticipants) return movie;
    }
    return null;
  }, [movies, voteCounts, totalParticipants, seenMatches]);

  // Сколько фильмов проголосовал каждый участник (для панели прогресса)
  const participantProgress = useMemo(() => {
    const progress: Record<string, number> = {};
    const movieIds = new Set(movies.map((m) => m.id));
    for (const v of Object.values(allVotes)) {
      if (movieIds.has(v.movie_id)) {
        progress[v.participant_id] = (progress[v.participant_id] || 0) + 1;
      }
    }
    return progress;
  }, [movies, allVotes]);

  // Все участники проголосовали за все фильмы — комнату можно завершать
  const everyoneVotedAll = useMemo(() => {
    if (movies.length === 0 || totalParticipants === 0) return false;
    const validVotes = Object.values(allVotes).filter((v) =>
      movies.some((m) => m.id === v.movie_id)
    );
    return validVotes.length >= movies.length * totalParticipants;
  }, [movies, allVotes, totalParticipants]);

  const dismissMatch = useCallback((movieId: string) => {
    setSeenMatches((prev) => {
      if (prev.includes(movieId)) return prev;
      const next = [...prev, movieId];
      localStorage.setItem(`matches_seen_${roomId}`, JSON.stringify(next));
      return next;
    });
  }, [roomId]);

  const currentMovie = movies[currentIndex] || null;
  const progress = movies.length > 0 ? `${currentIndex + 1} из ${movies.length}` : '0 из 0';

  const castVote = useCallback(
    async (voteType: VoteType): Promise<boolean> => {
      const movie = movies[currentIndex];
      if (!movie || !participantId) return false;

      const existingVote = participantVotes[movie.id];
      const voteId = `${participantId}_${movie.id}`;

      try {
        await ensureAuthSession();
      } catch {
        return false;
      }

      if (existingVote) {
        const { error } = await supabase
          .from('votes')
          .update({ vote_type: voteType })
          .eq('id', voteId);
        if (error) return false;
      } else {
        const { error } = await supabase.from('votes').insert({
          id: voteId,
          participant_id: participantId,
          movie_id: movie.id,
          room_id: roomId,
          vote_type: voteType,
        });
        if (error) return false;
      }

      setParticipantVotes((prev) => ({ ...prev, [movie.id]: voteType }));
      setAllVotes((prev) => ({
        ...prev,
        [voteId]: { movie_id: movie.id, vote_type: voteType, participant_id: participantId },
      }));
      return true;
    },
    [currentIndex, movies, participantId, roomId, participantVotes]
  );

  const saveIndex = useCallback((index: number) => {
    sessionStorage.setItem(
      `movie_index_${roomId}_${participantId}_${movies[0]?.id || ''}`,
      String(index)
    );
  }, [roomId, participantId, movies]);

  const goToNext = useCallback(() => {
    if (currentIndex < movies.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      saveIndex(nextIndex);
    }
  }, [currentIndex, movies.length, saveIndex]);

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      saveIndex(prevIndex);
    }
  }, [currentIndex, saveIndex]);

  const goToIndex = useCallback((index: number) => {
    if (index >= 0 && index < movies.length) {
      setCurrentIndex(index);
      saveIndex(index);
    }
  }, [movies.length, saveIndex]);

  const hasVotedCurrent = currentMovie ? participantVotes[currentMovie.id] !== undefined : false;
  const allVoted = movies.length > 0 && movies.every((m) => participantVotes[m.id] !== undefined);
  const currentVoteType = currentMovie ? participantVotes[currentMovie.id] || null : null;
  const currentVoteCounts = currentMovie ? voteCounts[currentMovie.id] || null : null;
  const isLastMovie = currentIndex >= movies.length - 1;

  return {
    movies,
    currentMovie,
    currentIndex,
    progress,
    loading,
    hasVotedCurrent,
    allVoted,
    currentVoteType,
    currentVoteCounts,
    totalParticipants,
    participantVotes,
    participantProgress,
    everyoneVotedAll,
    matchedMovie,
    dismissMatch,
    castVote,
    goToNext,
    goToPrevious,
    goToIndex,
    isLastMovie,
  };
}
