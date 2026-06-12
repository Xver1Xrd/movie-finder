const HISTORY_KEY = 'movietier_history';
const HISTORY_LIMIT = 10;

export interface HistoryEntry {
  roomId: string;
  mode: 'solo' | 'multi';
  winnerTitle: string;
  winnerPoster: string;
  totalMovies: number;
  date: string; // ISO
}

export function getHistory(): HistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

export function getHistoryEntry(roomId: string): HistoryEntry | undefined {
  return getHistory().find((e) => e.roomId === roomId);
}

export function saveHistoryEntry(entry: HistoryEntry): void {
  try {
    const all = getHistory();
    const existing = all.find((e) => e.roomId === entry.roomId);
    // Повторный просмотр результатов не должен менять дату сессии
    const merged = existing ? { ...entry, date: existing.date } : entry;
    const rest = all.filter((e) => e.roomId !== entry.roomId);
    const next = [merged, ...rest].slice(0, HISTORY_LIMIT);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {}
}
