// Минимальный fake для fluent query-builder'а supabase-js: каждый метод
// возвращает this, а `then` резолвит заранее заданный результат для таблицы.
// Этого достаточно, чтобы тестировать логику хуков, не поднимая настоящую БД.
import { vi } from 'vitest';

export interface QueryResult {
  data?: unknown;
  error?: unknown;
  count?: number | null;
}

export function createQueryBuilder(result: QueryResult) {
  const builder: Record<string, unknown> = {};
  const chainMethods = ['select', 'eq', 'order', 'update', 'insert', 'delete', 'in', 'single'];
  for (const method of chainMethods) {
    builder[method] = vi.fn(() => builder);
  }
  builder.then = (resolve: (v: QueryResult) => unknown, reject?: (e: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return builder;
}

export interface ChannelMock {
  on: (...args: unknown[]) => ChannelMock;
  subscribe: (cb?: (status: string) => void) => ChannelMock;
  // Ручной триггер статуса подписки — для тестов реконнекта realtime
  triggerStatus: (status: string) => void;
}

export function createChannelMock(): ChannelMock {
  let statusCallback: ((status: string) => void) | undefined;
  const channel = {} as ChannelMock;
  channel.on = vi.fn(() => channel);
  channel.subscribe = vi.fn((cb?: (status: string) => void) => {
    statusCallback = cb;
    cb?.('SUBSCRIBED');
    return channel;
  });
  channel.triggerStatus = (status: string) => statusCallback?.(status);
  return channel;
}

export function createSupabaseMock(tableResults: Record<string, QueryResult> = {}) {
  const fromCalls: string[] = [];
  const supabase = {
    from: vi.fn((table: string) => {
      fromCalls.push(table);
      return createQueryBuilder(tableResults[table] ?? { data: [], error: null, count: 0 });
    }),
    channel: vi.fn(() => createChannelMock()),
    removeChannel: vi.fn(),
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
  };
  return { supabase, fromCalls };
}
