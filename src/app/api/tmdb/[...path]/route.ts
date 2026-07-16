import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const TMDB_BASE = 'https://api.themoviedb.org/3';
// TMDB_API_KEY — серверный ключ; NEXT_PUBLIC_ оставлен для совместимости со старыми деплоями
const API_KEY = process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY || '';

// Прокси открыт всем посетителям сайта, но ключ TMDB — общий на весь деплой.
// Ограничиваем его только эндпоинтами, которые реально использует приложение,
// чтобы прокси нельзя было превратить в произвольный клиент TMDB API.
const ALLOWED_PATH_PATTERNS: RegExp[] = [
  /^discover\/(movie|tv)$/,
  /^genre\/(movie|tv)\/list$/,
  /^search\/multi$/,
  /^(movie|tv)\/\d+\/videos$/,
  /^(movie|tv)\/\d+\/watch\/providers$/,
];

function isAllowedPath(path: string): boolean {
  return ALLOWED_PATH_PATTERNS.some((re) => re.test(path));
}

const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_MAX = 60;

// Резервный rate limit в памяти процесса — на случай, если БД недоступна.
// Сам по себе не защищает от распределённой нагрузки (у каждого холодного
// старта/региона своя память), поэтому основной источник истины — Postgres.
const requestLog = new Map<string, number[]>();

function isRateLimitedInMemory(ip: string): boolean {
  if (requestLog.size > 5000) requestLog.clear(); // предохранитель от неограниченного роста
  const now = Date.now();
  const timestamps = (requestLog.get(ip) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_SECONDS * 1000);
  timestamps.push(now);
  requestLog.set(ip, timestamps);
  return timestamps.length > RATE_LIMIT_MAX;
}

// Считаем запросы в общей Postgres-таблице (миграция 009), чтобы лимит
// действовал одинаково на всех serverless-инстансах прокси.
async function isRateLimited(ip: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('check_and_increment_rate_limit', {
      p_key: `tmdb_proxy:${ip}`,
      p_window_seconds: RATE_LIMIT_WINDOW_SECONDS,
      p_max_requests: RATE_LIMIT_MAX,
    });
    if (error) throw error;
    return data === false;
  } catch {
    return isRateLimitedInMemory(ip);
  }
}

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  if (!API_KEY) {
    return NextResponse.json({ error: 'TMDB API key is not configured' }, { status: 500 });
  }

  const path = params.path.map(encodeURIComponent).join('/');
  if (!isAllowedPath(path)) {
    return NextResponse.json({ error: 'Path not allowed' }, { status: 403 });
  }

  if (await isRateLimited(getClientIp(req))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const search = new URLSearchParams(req.nextUrl.searchParams);
  search.delete('api_key');
  search.set('api_key', API_KEY);

  const url = `${TMDB_BASE}/${path}?${search.toString()}`;

  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'TMDB request failed' }, { status: 502 });
  }
}
