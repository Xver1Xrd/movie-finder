import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { createQueryBuilder, createChannelMock, QueryResult } from './testUtils/supabaseMock';
import { useVoting } from './useVoting';

const mocks = vi.hoisted(() => ({
  tableResults: {} as Record<string, QueryResult>,
  ensureAuthSession: vi.fn(async () => 'user-1'),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => createQueryBuilder(mocks.tableResults[table] ?? { data: [], error: null, count: 0 }),
    channel: () => createChannelMock(),
    removeChannel: () => {},
    rpc: () => Promise.resolve({ data: null, error: null }),
  },
  ensureAuthSession: mocks.ensureAuthSession,
}));

const ROOM_ID = 'room1';
const MOVIES = [
  { id: 'm1', room_id: ROOM_ID, tmdb_id: 1, title: 'A', year: 2020, poster_url: '/a.svg', rating: 7, genres: [], overview: '', sort_order: 0 },
  { id: 'm2', room_id: ROOM_ID, tmdb_id: 2, title: 'B', year: 2021, poster_url: '/b.svg', rating: 8, genres: [], overview: '', sort_order: 1 },
];

function setUpTables(overrides: Partial<Record<string, QueryResult>> = {}) {
  mocks.tableResults = {
    movies: { data: MOVIES, error: null },
    votes: { data: [], error: null },
    participants: { data: [], error: null, count: 2 },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.ensureAuthSession.mockResolvedValue('user-1');
  localStorage.clear();
  sessionStorage.clear();
});

describe('useVoting', () => {
  it('loads movies and vote state on mount', async () => {
    setUpTables();
    const { result } = renderHook(() => useVoting(ROOM_ID, 'p1'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.movies).toHaveLength(2);
    expect(result.current.currentMovie?.id).toBe('m1');
    expect(result.current.totalParticipants).toBe(2);
  });

  it('detects a match once every participant votes "want" on a movie', async () => {
    setUpTables({
      votes: {
        data: [
          { id: 'p1_m1', movie_id: 'm1', vote_type: 'want', participant_id: 'p1' },
          { id: 'p2_m1', movie_id: 'm1', vote_type: 'want', participant_id: 'p2' },
        ],
        error: null,
      },
      participants: { data: [], error: null, count: 2 },
    });

    const { result } = renderHook(() => useVoting(ROOM_ID, 'p1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.matchedMovie?.id).toBe('m1');
  });

  it('does not report everyoneVotedAll until every participant voted on every movie', async () => {
    setUpTables({
      votes: {
        data: [
          { id: 'p1_m1', movie_id: 'm1', vote_type: 'want', participant_id: 'p1' },
          { id: 'p2_m1', movie_id: 'm1', vote_type: 'want', participant_id: 'p2' },
        ],
        error: null,
      },
      participants: { data: [], error: null, count: 2 },
    });

    const { result } = renderHook(() => useVoting(ROOM_ID, 'p1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Only m1 has votes from both participants; m2 has none yet
    expect(result.current.everyoneVotedAll).toBe(false);
  });

  it('castVote requires an auth session and updates local state optimistically', async () => {
    setUpTables({ votes: { data: [], error: null }, participants: { data: [], error: null, count: 2 } });
    const { result } = renderHook(() => useVoting(ROOM_ID, 'p1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let ok = false;
    await act(async () => {
      ok = await result.current.castVote('want');
    });

    expect(ok).toBe(true);
    expect(mocks.ensureAuthSession).toHaveBeenCalled();
    expect(result.current.participantVotes['m1']).toBe('want');
  });

  it('castVote returns false and leaves state untouched when the auth session cannot be established', async () => {
    setUpTables();
    mocks.ensureAuthSession.mockRejectedValueOnce(new Error('anonymous sign-in disabled'));
    const { result } = renderHook(() => useVoting(ROOM_ID, 'p1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let ok = true;
    await act(async () => {
      ok = await result.current.castVote('want');
    });

    expect(ok).toBe(false);
    expect(result.current.participantVotes['m1']).toBeUndefined();
  });

  it('castVote returns false when the insert fails', async () => {
    setUpTables({
      votes: { data: [], error: null },
      participants: { data: [], error: null, count: 2 },
    });
    const { result } = renderHook(() => useVoting(ROOM_ID, 'p1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Reconfigure the votes table to fail on the next write
    mocks.tableResults.votes = { data: null, error: new Error('insert failed') };

    let ok = true;
    await act(async () => {
      ok = await result.current.castVote('want');
    });

    expect(ok).toBe(false);
  });
});
