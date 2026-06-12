'use client';

import { useEffect, useState } from 'react';

interface BgItem {
  poster_url: string;
}

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w154';
const CACHE_KEY = 'posterBackgroundCache';

async function fetchBgImages(endpoint: string): Promise<BgItem[]> {
  try {
    const url = `/api/tmdb${endpoint}&language=ru-RU&without_origin_country=IN,TR,KR`;
    const res = await fetch(url);
    const data = await res.json();
    return ((data.results || []) as Array<{ poster_path: string | null }>)
      .filter((m) => m.poster_path)
      .slice(0, 20)
      .map((m) => ({
        poster_url: `${TMDB_IMAGE_BASE}${m.poster_path}`,
      }));
  } catch {
    return [];
  }
}

function BgStrip({ items, speed, reverse }: { items: BgItem[]; speed: number; reverse?: boolean }) {
  const tripled = [...items, ...items, ...items];

  return (
    <div
      className="flex gap-3"
      style={{
        animation: `scroll${reverse ? 'Reverse' : ''} ${speed}s linear infinite`,
      }}
    >
      {tripled.map((item, i) => (
        <div
          key={`${item.poster_url}-${i}`}
          className="w-20 h-28 flex-shrink-0 rounded-xl overflow-hidden opacity-15 bg-[#12121a]"
        >
          <img
            src={item.poster_url}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      ))}
    </div>
  );
}

export default function PosterBackground() {
  const [rows, setRows] = useState<BgItem[][]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const cached = sessionStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached) as BgItem[][];
          if (parsed.length > 0) {
            setRows(parsed);
            setLoaded(true);
            return;
          }
        }
      } catch { /* ignore */ }

      const all = await Promise.all([
        fetchBgImages('/discover/movie?page=1&sort_by=popularity.desc'),
        fetchBgImages('/discover/tv?page=1&sort_by=popularity.desc'),
        fetchBgImages('/discover/movie?page=2&sort_by=popularity.desc'),
        fetchBgImages('/discover/tv?page=2&sort_by=popularity.desc'),
      ]);
      const filtered = all.filter((r) => r.length > 0);
      try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(filtered)); } catch { /* ignore */ }
      setRows(filtered);
      setLoaded(true);
    })();
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <div className="absolute inset-0 bg-[#0a0a0f] z-[1]" />
      <div className="absolute inset-0 z-[3]" style={{ background: 'rgba(10,10,15,0.2)' }} />
      {loaded && (
        <div className="absolute inset-0 flex flex-col gap-1.5 justify-center -rotate-6 scale-110 z-[2]">
          {rows.map((r, i) => (
            <BgStrip
              key={i}
              items={r}
              speed={22 + i * 8}
              reverse={i % 2 === 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
