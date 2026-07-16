import { NextRequest, NextResponse } from 'next/server';

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

// Простейший rate limit в памяти процесса: не защищает от распределённой
// нагрузки за много инстансов, но останавливает случайный/скриптовый перебор.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 60;
const requestLog = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  if (requestLog.size > 5000) requestLog.clear(); // предохранитель от неограниченного роста
  const now = Date.now();
  const timestamps = (requestLog.get(ip) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  timestamps.push(now);
  requestLog.set(ip, timestamps);
  return timestamps.length > RATE_LIMIT_MAX;
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

  if (isRateLimited(getClientIp(req))) {
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
