import { Vote, Movie, VoteCount, VOTE_WEIGHTS, MovieResult, RoomResults } from '@/types';

export function calculateMovieScore(
  movieId: string,
  votes: Vote[]
): { total_score: number; vote_counts: VoteCount; want_count: number } {
  const movieVotes = votes.filter((v) => v.movie_id === movieId);

  const vote_counts: VoteCount = {
    want: 0,
    dont_mind: 0,
    pizza: 0,
    seen: 0,
  };

  let total_score = 0;

  for (const vote of movieVotes) {
    vote_counts[vote.vote_type] += 1;
    total_score += VOTE_WEIGHTS[vote.vote_type];
  }

  return {
    total_score,
    vote_counts,
    want_count: vote_counts.want,
  };
}

export function calculateResults(
  movies: Movie[],
  votes: Vote[],
  totalParticipants: number
): RoomResults {
  const movieResults: MovieResult[] = movies.map((movie) => {
    const score = calculateMovieScore(movie.id, votes);
    const totalVotes = score.vote_counts.want + score.vote_counts.dont_mind;
    const agreement_percentage =
      totalParticipants > 0
        ? Math.round((totalVotes / totalParticipants) * 100)
        : 0;

    return {
      movie,
      total_score: score.total_score,
      vote_counts: score.vote_counts,
      want_count: score.want_count,
      agreement_percentage,
    };
  });

  movieResults.sort((a, b) => {
    if (b.total_score !== a.total_score) {
      return b.total_score - a.total_score;
    }
    if (b.want_count !== a.want_count) {
      return b.want_count - a.want_count;
    }
    return Math.random() - 0.5;
  });

  return {
    top_movies: movieResults.slice(0, 3),
    winner: movieResults[0],
    total_participants: totalParticipants,
  };
}
