import { NextRequest, NextResponse } from 'next/server';

const TMDB_BASE = 'https://api.themoviedb.org/3';
// TMDB_API_KEY — серверный ключ; NEXT_PUBLIC_ оставлен для совместимости со старыми деплоями
const API_KEY = process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY || '';

export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  if (!API_KEY) {
    return NextResponse.json({ error: 'TMDB API key is not configured' }, { status: 500 });
  }

  const search = new URLSearchParams(req.nextUrl.searchParams);
  search.delete('api_key');
  search.set('api_key', API_KEY);

  const url = `${TMDB_BASE}/${params.path.map(encodeURIComponent).join('/')}?${search.toString()}`;

  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'TMDB request failed' }, { status: 502 });
  }
}
