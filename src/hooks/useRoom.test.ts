import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { createQueryBuilder, createChannelMock, QueryResult, ChannelMock } from './testUtils/supabaseMock';
import { useRoom } from './useRoom';
import { supabase } from '@/lib/supabase';

const mocks = vi.hoisted(() => ({
  tableResults: {} as Record<string, QueryResult>,
  ensureAuthSession: vi.fn(async () => 'user-1'),
  channels: {} as Record<string, ChannelMock>,
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn((table: string) => createQueryBuilder(mocks.tableResults[table] ?? { data: [], error: null, count: 0 })),
    channel: vi.fn((name: string) => {
      mocks.channels[name] = mocks.channels[name] ?? createChannelMock();
      return mocks.channels[name];
    }),
    removeChannel: () => {},
    rpc: () => Promise.resolve({ data: null, error: null }),
  },
  ensureAuthSession: mocks.ensureAuthSession,
}));

const ROOM = { id: 'room1', host_id: 'h1', host_auth_uid: 'user-1', max_movies: 80, status: 'setup', created_at: '2026-01-01', invite_code: 'ABCDEF' };

function setUpTables(overrides: Partial<Record<string, QueryResult>> = {}) {
  mocks.tableResults = {
    rooms: { data: ROOM, error: null },
    participants: { data: [], error: null, count: 0 },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.channels = {};
  mocks.ensureAuthSession.mockResolvedValue('user-1');
  setUpTables();
});

describe('useRoom', () => {
  it('loads room and participants on mount', async () => {
    const { result } = renderHook(() => useRoom('room1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.room?.id).toBe('room1');
    expect(result.current.error).toBeNull();
  });

  it('surfaces a load error instead of throwing', async () => {
    setUpTables({ rooms: { data: null, error: new Error('not found') } });
    const { result } = renderHook(() => useRoom('room1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.room).toBeNull();
    expect(result.current.error).toBe('not found');
  });

  it('createRoom waits for an auth session and propagates insert errors', async () => {
    setUpTables({ rooms: { data: null, error: new Error('insert failed') } });
    const { result } = renderHook(() => useRoom());

    await expect(result.current.createRoom('Host', 80)).rejects.toThrow('insert failed');
    expect(mocks.ensureAuthSession).toHaveBeenCalled();
  });

  it('endVoting requires an auth session before updating room status', async () => {
    const { result } = renderHook(() => useRoom('room1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.endVoting();
    });

    expect(mocks.ensureAuthSession).toHaveBeenCalled();
  });

  it('refetches the room after a realtime reconnect, but not on a clean first subscribe', async () => {
    const { result } = renderHook(() => useRoom('room1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const roomChannel = mocks.channels['room-detail:room1'];
    expect(roomChannel).toBeDefined();

    vi.mocked(supabase.from).mockClear();

    act(() => {
      // A CLOSED -> SUBSCRIBED cycle means we may have missed events; refetch
      roomChannel.triggerStatus('CLOSED');
      roomChannel.triggerStatus('SUBSCRIBED');
    });

    await waitFor(() => expect(supabase.from).toHaveBeenCalledWith('rooms'));
  });

  it('does not refetch on a subscribe that was never interrupted', async () => {
    const { result } = renderHook(() => useRoom('room1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const roomChannel = mocks.channels['room-detail:room1'];
    vi.mocked(supabase.from).mockClear();

    act(() => {
      roomChannel.triggerStatus('SUBSCRIBED');
    });

    expect(supabase.from).not.toHaveBeenCalled();
  });
});
