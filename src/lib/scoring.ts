import { Vote, Movie, VoteCount, MovieResult, RoomResults } from '@/types';

export function calculateResults(
  movies: Movie[],
  votes: Vote[],
  totalParticipants: number,
  showAll = false
): RoomResults {
  const movieResults: MovieResult[] = movies.map((movie) => {
    const movieVotes = votes.filter((v) => v.movie_id === movie.id);
    const vote_counts: VoteCount = { want: 0, dont_mind: 0 };
    for (const v of movieVotes) {
      if (v.vote_type === 'want') vote_counts.want += 1;
      else if (v.vote_type === 'dont_mind') vote_counts.dont_mind += 1;
    }
    return {
      movie,
      vote_counts,
      yes_count: vote_counts.want,
    };
  });

  movieResults.sort((a, b) => {
    if (b.yes_count !== a.yes_count) return b.yes_count - a.yes_count;
    return Math.random() - 0.5;
  });

  const limit = showAll ? movieResults.length : 3;
  return {
    top_movies: movieResults.slice(0, limit),
    winner: movieResults[0],
    total_participants: totalParticipants,
  };
}
