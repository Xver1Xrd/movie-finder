import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'MovieTier — результаты голосования';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

interface MovieRow {
  id: string;
  title: string;
  year: number;
  poster_url: string;
  rating: number;
}

interface VoteRow {
  movie_id: string;
  vote_type: string;
}

async function fetchWinner(roomId: string): Promise<{ movie: MovieRow; yes: number } | null> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!base || !key) return null;

  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  try {
    const [moviesRes, votesRes] = await Promise.all([
      fetch(`${base}/rest/v1/movies?room_id=eq.${roomId}&select=id,title,year,poster_url,rating`, { headers }),
      fetch(`${base}/rest/v1/votes?room_id=eq.${roomId}&select=movie_id,vote_type`, { headers }),
    ]);
    const movies = (await moviesRes.json()) as MovieRow[];
    const votes = (await votesRes.json()) as VoteRow[];
    if (!Array.isArray(movies) || movies.length === 0) return null;

    const yesCounts = new Map<string, number>();
    for (const v of Array.isArray(votes) ? votes : []) {
      if (v.vote_type === 'want') {
        yesCounts.set(v.movie_id, (yesCounts.get(v.movie_id) || 0) + 1);
      }
    }

    // Тот же тай-брейк, что в scoring.ts: голоса → рейтинг → название
    const sorted = [...movies].sort((a, b) => {
      const ya = yesCounts.get(a.id) || 0;
      const yb = yesCounts.get(b.id) || 0;
      if (yb !== ya) return yb - ya;
      if (b.rating !== a.rating) return b.rating - a.rating;
      return a.title.localeCompare(b.title);
    });

    return { movie: sorted[0], yes: yesCounts.get(sorted[0].id) || 0 };
  } catch {
    return null;
  }
}

export default async function Image({ params }: { params: { roomId: string } }) {
  const winner = await fetchWinner(params.roomId);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          backgroundColor: '#0a0a0f',
          padding: 60,
          alignItems: 'center',
          gap: 56,
        }}
      >
        {winner?.movie.poster_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={winner.movie.poster_url}
            alt=""
            width={340}
            height={510}
            style={{ borderRadius: 24, objectFit: 'cover', border: '3px solid #eab308' }}
          />
        ) : (
          <div style={{ width: 340, height: 510, borderRadius: 24, backgroundColor: '#12121a', display: 'flex' }} />
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: 56, height: 56, borderRadius: 16, backgroundColor: '#db2777',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: 30, fontWeight: 900,
              }}
            >
              M
            </div>
            <div style={{ display: 'flex', fontSize: 36, fontWeight: 900, color: 'white' }}>
              Movie<span style={{ color: '#ec4899' }}>Tier</span>
            </div>
          </div>
          <div style={{ display: 'flex', fontSize: 28, color: '#9ca3af' }}>🏆 Мы выбрали фильм:</div>
          <div style={{ display: 'flex', fontSize: 58, fontWeight: 900, color: 'white', lineHeight: 1.1 }}>
            {winner ? winner.movie.title : 'Совместный выбор фильмов'}
          </div>
          {winner && (
            <div style={{ display: 'flex', fontSize: 30, color: '#6b7280', gap: 24 }}>
              <span>{winner.movie.year}</span>
              <span style={{ color: '#eab308' }}>★ {winner.movie.rating.toFixed(1)}</span>
              {winner.yes > 0 && <span style={{ color: '#4ade80' }}>Да × {winner.yes}</span>}
            </div>
          )}
        </div>
      </div>
    ),
    { ...size }
  );
}
