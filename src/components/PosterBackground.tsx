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
      .map((m) => ({
        poster_url: `${TMDB_IMAGE_BASE}${m.poster_path}`,
        title: m.title || m.name || '',
      }));
  } catch {
    return [];
  }
}

function BgStrip({ items, speed, reverse }: { items: BgItem[]; speed: number; reverse?: boolean }) {
  const doubled = [...items, ...items, ...items];

  return (
    <div
      className="flex gap-3"
      style={{
        animation: `scroll${reverse ? 'Reverse' : ''} ${speed}s linear infinite`,
      }}
    >
      {doubled.map((item, i) => (
        <div
          key={`${item.title}-${i}`}
          className="w-16 h-24 flex-shrink-0 rounded-lg overflow-hidden opacity-15 hover:opacity-30 transition-opacity bg-[#12121a]"
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
  const [rows, setRows] = useState<BgItem[][]>([[], [], [], []]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const [movies, tv, trending, topRated] = await Promise.all([
        fetchBgImages(apiKey, '/discover/movie?page=1&sort_by=popularity.desc'),
        fetchBgImages(apiKey, '/discover/tv?page=1&sort_by=popularity.desc'),
        fetchBgImages(apiKey, '/discover/movie?page=2&sort_by=popularity.desc'),
        fetchBgImages(apiKey, '/discover/tv?page=2&sort_by=popularity.desc'),
      ]);
      setRows([movies, tv, trending, topRated]);
      setLoaded(true);
    })();
  }, [apiKey]);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <div className="absolute inset-0 bg-[#0a0a0f] z-[1]" />
      <div className={`absolute inset-0 bg-[#0a0a0f]/60 backdrop-blur-sm z-[3] ${loaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-700`} />
      {loaded && (
        <div className="absolute inset-0 flex flex-col gap-3 justify-center -rotate-6 scale-110 z-[2]">
          <BgStrip items={rows[0]} speed={35} />
          <BgStrip items={rows[1]} speed={45} reverse />
          <BgStrip items={rows[2]} speed={30} />
          <BgStrip items={rows[3]} speed={50} reverse />
        </div>
      )}
    </div>
  );
}
