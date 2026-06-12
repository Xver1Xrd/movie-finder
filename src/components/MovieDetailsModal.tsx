'use client';

import { useEffect, useState } from 'react';
import type { Movie } from '@/types';
import { fetchTrailerUrl, fetchWatchProviders, getProviderLogoUrl, WatchProvider } from '@/lib/tmdb';
import { StarIcon, PlayIcon, XIcon } from '@/components/Icons';

export default function MovieDetailsModal({ movie, onClose }: {
  movie: Movie;
  onClose: () => void;
}) {
  const [trailerUrl, setTrailerUrl] = useState<string | null>(null);
  const [trailerLoading, setTrailerLoading] = useState(true);
  const [providers, setProviders] = useState<WatchProvider[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchTrailerUrl(movie.tmdb_id)
      .then((url) => { if (!cancelled) setTrailerUrl(url); })
      .finally(() => { if (!cancelled) setTrailerLoading(false); });
    fetchWatchProviders(movie.tmdb_id)
      .then((list) => { if (!cancelled) setProviders(list); });
    return () => { cancelled = true; };
  }, [movie.tmdb_id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md max-h-[90vh] overflow-y-auto scrollbar-thin bg-[#12121a] border border-[#1f1f2e] rounded-t-3xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative aspect-video w-full overflow-hidden">
          <img
            src={movie.poster_url}
            alt={movie.title}
            className="absolute inset-0 w-full h-full object-cover object-top"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#12121a] via-transparent to-transparent" />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-gray-300 hover:text-white transition-colors"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="space-y-1.5">
            <h2 className="text-xl font-bold text-white leading-tight">{movie.title}</h2>
            <div className="flex items-center gap-3 text-sm text-gray-400">
              <span>{movie.year}</span>
              <span className="flex items-center gap-1 text-yellow-400 font-semibold">
                <StarIcon className="w-3.5 h-3.5" />
                {movie.rating.toFixed(1)}
              </span>
            </div>
          </div>

          {movie.genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {movie.genres.map((g) => (
                <span key={g} className="text-xs bg-white/10 text-gray-300 px-2.5 py-1 rounded-full">{g}</span>
              ))}
            </div>
          )}

          {movie.overview ? (
            <p className="text-sm text-gray-300 leading-relaxed">{movie.overview}</p>
          ) : (
            <p className="text-sm text-gray-600">Описание отсутствует</p>
          )}

          {providers.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-gray-500 font-medium">Где смотреть</p>
              <div className="flex flex-wrap items-center gap-2">
                {providers.slice(0, 6).map((p) => (
                  <span key={p.provider_name} className="flex items-center gap-1.5 text-xs bg-white/5 text-gray-300 pl-1 pr-2.5 py-1 rounded-full">
                    <img src={getProviderLogoUrl(p.logo_path)} alt="" className="w-5 h-5 rounded-md" />
                    {p.provider_name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {trailerLoading ? (
            <p className="text-xs text-gray-600 animate-pulse">Поиск трейлера...</p>
          ) : trailerUrl ? (
            <a
              href={trailerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 bg-pink-600 hover:bg-pink-500 text-white text-sm font-bold rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-pink-600/20"
            >
              <PlayIcon className="w-4 h-4" />
              Смотреть трейлер
            </a>
          ) : (
            <p className="text-xs text-gray-600">Трейлер не найден</p>
          )}
        </div>
      </div>
    </div>
  );
}
