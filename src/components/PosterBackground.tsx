'use client';

import { useEffect, useState } from 'react';

interface BgItem {
  poster_url: string;
  title: string;
}

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w185';

async function fetchBgImages(apiKey: string, endpoint: string): Promise<BgItem[]> {
  try {
    const url = `https://api.themoviedb.org/3${endpoint}&language=ru-RU&api_key=${apiKey}&without_origin_country=IN,TR,KR`;
    const res = await fetch(url);
    const data = await res.json();
    return ((data.results || []) as Array<{ poster_path: string | null; title?: string; name?: string }>)
      .filter((m) => m.poster_path)
      .slice(0, 30)
      .map((m) => ({
        poster_url: `${TMDB_IMAGE_BASE}${m.poster_path}`,
        title: m.title || m.name || '',
      }));
  } catch {
    return [];
  }
}

function BgStrip({ items, speed, reverse }: { items: BgItem[]; speed: number; reverse?: boolean }) {
  const tripled = [...items, ...items, ...items];

  return (
    <div
      className="flex gap-2"
      style={{
        animation: `scroll${reverse ? 'Reverse' : ''} ${speed}s linear infinite`,
      }}
    >
      {tripled.map((item, i) => (
        <div
          key={`${item.title}-${i}`}
          className="w-14 h-20 flex-shrink-0 rounded-lg overflow-hidden opacity-10 hover:opacity-25 transition-opacity bg-[#12121a]"
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

export default function PosterBackground({ apiKey }: { apiKey: string }) {
  const [rows, setRows] = useState<BgItem[][]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const all = await Promise.all([
        fetchBgImages(apiKey, '/discover/movie?page=1&sort_by=popularity.desc'),
        fetchBgImages(apiKey, '/discover/tv?page=1&sort_by=popularity.desc'),
        fetchBgImages(apiKey, '/discover/movie?page=2&sort_by=popularity.desc'),
        fetchBgImages(apiKey, '/discover/tv?page=2&sort_by=popularity.desc'),
        fetchBgImages(apiKey, '/discover/movie?page=3&sort_by=popularity.desc'),
        fetchBgImages(apiKey, '/discover/tv?page=3&sort_by=popularity.desc'),
      ]);
      setRows(all.filter((r) => r.length > 0));
      setLoaded(true);
    })();
  }, [apiKey]);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <div className="absolute inset-0 bg-[#0a0a0f] z-[1]" />
      <div className={`absolute inset-0 bg-[#0a0a0f]/70 backdrop-blur-sm z-[3] ${loaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-700`} />
      {loaded && (
        <div className="absolute inset-0 flex flex-col gap-2 justify-center -rotate-6 scale-110 z-[2]">
          {rows.map((r, i) => (
            <BgStrip
              key={i}
              items={r}
              speed={28 + i * 7}
              reverse={i % 2 === 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
