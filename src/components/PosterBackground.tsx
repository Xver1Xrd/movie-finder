'use client';

import { useEffect, useState, useRef } from 'react';

interface BgItem {
  poster_url: string;
  title: string;
}

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

async function fetchBgImages(apiKey: string, endpoint: string): Promise<BgItem[]> {
  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/${endpoint}?language=ru-RU&page=1&sort_by=popularity.desc&api_key=${apiKey}`
    );
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
      className="flex gap-3 animate-scroll"
      style={{
        animation: `scroll${reverse ? 'Reverse' : ''} ${speed}s linear infinite`,
      }}
    >
      {doubled.map((item, i) => (
        <div
          key={`${item.title}-${i}`}
          className="w-20 h-28 flex-shrink-0 rounded-lg overflow-hidden opacity-20 hover:opacity-40 transition-opacity"
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

  useEffect(() => {
    (async () => {
      const [movies, tv, trending, topRated] = await Promise.all([
        fetchBgImages(apiKey, 'movie/popular'),
        fetchBgImages(apiKey, 'tv/popular'),
        fetchBgImages(apiKey, 'trending/all/week'),
        fetchBgImages(apiKey, 'movie/top_rated'),
      ]);
      setRows([movies, tv, trending, topRated]);
    })();
  }, [apiKey]);

  if (rows.every((r) => r.length === 0)) return null;

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <div className="absolute inset-0 bg-[#0a0a0f]/60 backdrop-blur-sm z-10" />
      <div className="absolute inset-0 flex flex-col gap-3 justify-center -rotate-6 scale-110">
        <BgStrip items={rows[0]} speed={35} />
        <BgStrip items={rows[1]} speed={45} reverse />
        <BgStrip items={rows[2]} speed={30} />
        <BgStrip items={rows[3]} speed={50} reverse />
      </div>
    </div>
  );
}
