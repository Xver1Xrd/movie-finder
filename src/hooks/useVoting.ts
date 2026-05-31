'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Movie, Vote, VoteType } from '@/types';

export function useVoting(roomId: string, participantId: string | null) {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [participantVotes, setParticipantVotes] = useState<Record<string, VoteType>>({});
  const [voteCounts, setVoteCounts] = useState<Record<string, Record<VoteType, number>>>({});
  const [totalParticipants, setTotalParticipants] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!participantId) return;
    const fetchData = async () => {
      const [moviesData, votesData, voteCountsData, participantsCount] = await Promise.all([
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
        supabase
          .from('votes')
          .select('movie_id, vote_type')
          .eq('room_id', roomId),
        supabase
          .from('participants')
          .select('id', { count: 'exact', head: true })
          .eq('room_id', roomId),
      ]);

      const allMovies = (moviesData.data || []) as Movie[];
      setMovies(allMovies);

      const myVotes = (votesData.data || []) as Vote[];
      const voteMap: Record<string, VoteType> = {};
      for (const v of myVotes) {
        voteMap[v.movie_id] = v.vote_type;
      }
      setParticipantVotes(voteMap);

      const allVotes = (voteCountsData.data || []) as Pick<Vote, 'movie_id' | 'vote_type'>[];
      const counts: Record<string, Record<VoteType, number>> = {};
      for (const movie of allMovies) {
        counts[movie.id] = { want: 0, dont_mind: 0 };
      }
      for (const v of allVotes) {
        if (counts[v.movie_id]) {
          counts[v.movie_id][v.vote_type as VoteType] += 1;
        }
      }
      setVoteCounts(counts);

      setTotalParticipants(participantsCount.count || 0);

      const savedIndex = sessionStorage.getItem(`movie_index_${roomId}_${participantId}`);
      if (savedIndex) {
        const idx = Math.min(parseInt(savedIndex, 10), Math.max(0, allMovies.length - 1));
        setCurrentIndex(idx);
      }

      setLoading(false);
    };

    fetchData();
  }, [roomId, participantId]);

  useEffect(() => {
    const voteChannel = supabase
      .channel(`votes:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'votes',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const newVote = payload.new as Vote;
          setVoteCounts((prev) => {
            const movieId = newVote.movie_id;
            const current = { ...(prev[movieId] || { want: 0, dont_mind: 0 }) };
            current[newVote.vote_type as VoteType] += 1;
            return { ...prev, [movieId]: current };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(voteChannel);
    };
  }, [roomId]);

  const currentMovie = movies[currentIndex] || null;
  const progress = movies.length > 0 ? `${currentIndex + 1} of ${movies.length}` : '0 of 0';

  const castVote = useCallback(
    async (voteType: VoteType) => {
      const movie = movies[currentIndex];
      if (!movie) return;

      const existingVote = participantVotes[movie.id];
      const voteId = `${participantId}_${movie.id}`;

      if (existingVote) {
        await supabase
          .from('votes')
          .update({ vote_type: voteType })
          .eq('id', voteId);
      } else {
        await supabase.from('votes').insert({
          id: voteId,
          participant_id: participantId,
          movie_id: movie.id,
          room_id: roomId,
          vote_type: voteType,
        });
      }

      setParticipantVotes((prev) => ({ ...prev, [movie.id]: voteType }));

      sessionStorage.setItem(
        `vote_${roomId}_${participantId}_${movie.id}`,
        voteType
      );
    },
    [currentIndex, movies, participantId, roomId, participantVotes]
  );

  const goToNext = useCallback(() => {
    if (currentIndex < movies.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      sessionStorage.setItem(
        `movie_index_${roomId}_${participantId}`,
        String(nextIndex)
      );
    }
  }, [currentIndex, movies.length, roomId, participantId]);

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      sessionStorage.setItem(
        `movie_index_${roomId}_${participantId}`,
        String(prevIndex)
      );
    }
  }, [currentIndex, roomId, participantId]);

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
    castVote,
    goToNext,
    goToPrevious,
    isLastMovie,
  };
}
