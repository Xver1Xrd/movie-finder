import { describe, it, expect, beforeEach } from 'vitest';
import { getHistory, getHistoryEntry, saveHistoryEntry, HistoryEntry } from './history';

beforeEach(() => {
  localStorage.clear();
});

function makeEntry(overrides: Partial<HistoryEntry> = {}): HistoryEntry {
  return {
    roomId: 'room1',
    mode: 'multi',
    winnerTitle: 'Movie',
    winnerPoster: '/poster.svg',
    totalMovies: 10,
    date: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('history', () => {
  it('saves and retrieves an entry by roomId', () => {
    saveHistoryEntry(makeEntry());
    expect(getHistoryEntry('room1')?.winnerTitle).toBe('Movie');
  });

  it('keeps the original date when a session is revisited', () => {
    saveHistoryEntry(makeEntry({ date: '2026-01-01T00:00:00.000Z' }));
    saveHistoryEntry(makeEntry({ winnerTitle: 'Rewatch', date: '2026-06-01T00:00:00.000Z' }));

    const entry = getHistoryEntry('room1');
    expect(entry?.winnerTitle).toBe('Rewatch');
    expect(entry?.date).toBe('2026-01-01T00:00:00.000Z');
  });

  it('moves the most recently saved room to the front', () => {
    saveHistoryEntry(makeEntry({ roomId: 'room1' }));
    saveHistoryEntry(makeEntry({ roomId: 'room2' }));
    saveHistoryEntry(makeEntry({ roomId: 'room1' }));

    expect(getHistory().map((e) => e.roomId)).toEqual(['room1', 'room2']);
  });

  it('caps history at 10 entries', () => {
    for (let i = 0; i < 15; i++) {
      saveHistoryEntry(makeEntry({ roomId: `room${i}` }));
    }
    expect(getHistory()).toHaveLength(10);
    // Most recent rooms survive, oldest are evicted
    expect(getHistory()[0].roomId).toBe('room14');
    expect(getHistory().find((e) => e.roomId === 'room0')).toBeUndefined();
  });
});
