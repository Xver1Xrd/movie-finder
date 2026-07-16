import { describe, it, expect } from 'vitest';
import { calculateResults } from './scoring';
import { Movie, Vote } from '@/types';

function makeMovie(overrides: Partial<Movie> & Pick<Movie, 'id'>): Movie {
  return {
    room_id: 'room1',
    tmdb_id: 1,
    title: 'Untitled',
    year: 2020,
    poster_url: '/poster.svg',
    rating: 5,
    genres: [],
    overview: '',
    sort_order: 0,
    ...overrides,
  };
}

function makeVote(overrides: Pick<Vote, 'participant_id' | 'movie_id' | 'vote_type'>): Vote {
  return {
    id: `${overrides.participant_id}_${overrides.movie_id}`,
    room_id: 'room1',
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('calculateResults', () => {
  it('ranks movies by yes_count, then rating, then title', () => {
    const movies = [
      makeMovie({ id: 'a', title: 'Bravo', rating: 7 }),
      makeMovie({ id: 'b', title: 'Alpha', rating: 9 }),
      makeMovie({ id: 'c', title: 'Charlie', rating: 9 }),
    ];
    const votes = [
      makeVote({ participant_id: 'p1', movie_id: 'a', vote_type: 'want' }),
      makeVote({ participant_id: 'p1', movie_id: 'b', vote_type: 'want' }),
      makeVote({ participant_id: 'p2', movie_id: 'b', vote_type: 'want' }),
      makeVote({ participant_id: 'p1', movie_id: 'c', vote_type: 'want' }),
      makeVote({ participant_id: 'p2', movie_id: 'c', vote_type: 'want' }),
    ];

    const results = calculateResults(movies, votes, 2, true);

    // b and c both have 2 "want" votes and rating 9 -> tie-broken alphabetically
    expect(results.top_movies.map((r) => r.movie.id)).toEqual(['b', 'c', 'a']);
    expect(results.winner.movie.id).toBe('b');
  });

  it('counts want/dont_mind votes correctly', () => {
    const movies = [makeMovie({ id: 'a' })];
    const votes = [
      makeVote({ participant_id: 'p1', movie_id: 'a', vote_type: 'want' }),
      makeVote({ participant_id: 'p2', movie_id: 'a', vote_type: 'dont_mind' }),
    ];

    const results = calculateResults(movies, votes, 2, true);
    expect(results.top_movies[0].vote_counts).toEqual({ want: 1, dont_mind: 1 });
    expect(results.top_movies[0].yes_count).toBe(1);
  });

  it('limits to top 3 unless showAll is set', () => {
    const movies = Array.from({ length: 5 }, (_, i) => makeMovie({ id: `m${i}`, title: `Movie ${i}` }));

    const limited = calculateResults(movies, [], 1, false);
    expect(limited.top_movies).toHaveLength(3);

    const all = calculateResults(movies, [], 1, true);
    expect(all.top_movies).toHaveLength(5);
  });

  it('reports total_participants as passed in', () => {
    const results = calculateResults([makeMovie({ id: 'a' })], [], 4, true);
    expect(results.total_participants).toBe(4);
  });
});
