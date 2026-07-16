import { describe, it, expect, beforeEach } from 'vitest';
import {
  getWatchlist, addToWatchlist, setWatched, removeFromWatchlist,
  getSeenIds, addSeenIds, getGenreAffinity, bumpGenreAffinity, sortByAffinity,
} from './prefs';

beforeEach(() => {
  localStorage.clear();
});

describe('watchlist', () => {
  it('adds items and skips duplicates by tmdb_id', () => {
    addToWatchlist([{ tmdb_id: 1, title: 'A', poster_url: '/a.svg', roomId: 'r1', date: '2026-01-01' }]);
    addToWatchlist([{ tmdb_id: 1, title: 'A dup', poster_url: '/a.svg', roomId: 'r1', date: '2026-01-02' }]);

    const list = getWatchlist();
    expect(list).toHaveLength(1);
    expect(list[0].title).toBe('A');
    expect(list[0].watched).toBe(false);
  });

  it('marks items watched and records them as seen', () => {
    addToWatchlist([{ tmdb_id: 2, title: 'B', poster_url: '/b.svg', roomId: 'r1', date: '2026-01-01' }]);
    setWatched(2, true);

    expect(getWatchlist().find((i) => i.tmdb_id === 2)?.watched).toBe(true);
    expect(getSeenIds().has(2)).toBe(true);
  });

  it('removes items from the watchlist', () => {
    addToWatchlist([{ tmdb_id: 3, title: 'C', poster_url: '/c.svg', roomId: 'r1', date: '2026-01-01' }]);
    removeFromWatchlist(3);
    expect(getWatchlist()).toHaveLength(0);
  });
});

describe('seen ids', () => {
  it('deduplicates and accumulates seen tmdb ids', () => {
    addSeenIds([1, 2, 3]);
    addSeenIds([2, 3, 4]);
    const seen = getSeenIds();
    expect(Array.from(seen).sort()).toEqual([1, 2, 3, 4]);
  });
});

describe('genre affinity', () => {
  it('accumulates genre counts', () => {
    bumpGenreAffinity(['Комедия', 'Драма']);
    bumpGenreAffinity(['Комедия']);
    const affinity = getGenreAffinity();
    expect(affinity['Комедия']).toBe(2);
    expect(affinity['Драма']).toBe(1);
  });

  it('does not reorder when there is not enough affinity data', () => {
    bumpGenreAffinity(['Комедия']); // total = 1, below the threshold of 10
    const items = [
      { genres: ['Драма'] },
      { genres: ['Комедия'] },
    ];
    expect(sortByAffinity(items)).toEqual(items);
  });

  it('surfaces items matching favored genres once enough data accumulated', () => {
    bumpGenreAffinity(Array(10).fill('Комедия'));
    const items = [
      { id: 1, genres: ['Драма'] },
      { id: 2, genres: ['Комедия'] },
    ];
    const sorted = sortByAffinity(items);
    expect(sorted[0].id).toBe(2);
  });
});
