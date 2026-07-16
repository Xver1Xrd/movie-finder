'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import type { Movie } from '@/types';
import { StarIcon, InfoIcon } from '@/components/Icons';

const SWIPE_THRESHOLD = 120;

export default function MovieCard({ movie, onSwipe, onInfo }: {
  movie: Movie;
  onSwipe?: (direction: 'left' | 'right') => void;
  onInfo?: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const startPos = useRef({ x: 0, y: 0 });
  const currentPos = useRef({ x: 0, y: 0 });
  const dragging = useRef(false);
  const [style, setStyle] = useState({ transform: '', transition: '' });
  const [labels, setLabels] = useState<{ right: boolean; left: boolean }>({ right: false, left: false });

  const resetCard = useCallback(() => {
    dragging.current = false;
    setStyle({ transform: '', transition: 'transform 0.3s ease-out' });
    setLabels({ right: false, left: false });
    currentPos.current = { x: 0, y: 0 };
  }, []);

  const handleStart = useCallback((clientX: number, clientY: number) => {
    dragging.current = true;
    startPos.current = { x: clientX, y: clientY };
    currentPos.current = { x: 0, y: 0 };
    setStyle({ transform: 'scale(0.95)', transition: 'none' });
  }, []);

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!dragging.current) return;
    const dx = clientX - startPos.current.x;
    currentPos.current = { x: dx, y: 0 };
    const rot = dx * 0.08;
    setStyle({
      transform: `translate(${dx}px, 0px) rotate(${rot}deg) scale(0.95)`,
      transition: 'none',
    });
    setLabels({
      right: dx > 50,
      left: dx < -50,
    });
  }, []);

  const resetTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    return () => {
      resetTimers.current.forEach(clearTimeout);
    };
  }, []);

  const handleEnd = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;
    const { x } = currentPos.current;

    if (x > SWIPE_THRESHOLD) {
      setStyle({
        transform: `translate(600px, 0px) rotate(${x * 0.08}deg) scale(0.95)`,
        transition: 'transform 0.3s ease-out',
      });
      const t = setTimeout(() => { onSwipe?.('right'); resetCard(); }, 300);
      resetTimers.current.push(t);
    } else if (x < -SWIPE_THRESHOLD) {
      setStyle({
        transform: `translate(-600px, 0px) rotate(${x * 0.08}deg) scale(0.95)`,
        transition: 'transform 0.3s ease-out',
      });
      const t = setTimeout(() => { onSwipe?.('left'); resetCard(); }, 300);
      resetTimers.current.push(t);
    } else {
      resetCard();
    }
  }, [onSwipe, resetCard]);

  return (
    <div className="w-full max-w-sm mx-auto select-none">
      <div
        ref={cardRef}
        onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
        onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={(e) => { const t = e.touches[0]; handleStart(t.clientX, t.clientY); }}
        onTouchMove={(e) => { const t = e.touches[0]; handleMove(t.clientX, t.clientY); }}
        onTouchEnd={handleEnd}
        className="relative aspect-[2/3] w-full rounded-2xl overflow-hidden bg-[#0f0f1a] shadow-2xl cursor-grab active:cursor-grabbing will-change-transform"
        style={{
          transform: style.transform || 'scale(1)',
          transition: style.transition || 'transform 0.2s ease-out',
          touchAction: 'none',
        }}
      >
        <Image
          src={movie.poster_url}
          alt={movie.title}
          fill
          sizes="(max-width: 640px) 100vw, 384px"
          priority
          className="object-cover pointer-events-none"
          draggable={false}
        />

        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent pointer-events-none" />

        {onInfo && (
          <button
            onClick={onInfo}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-gray-300 hover:text-white transition-colors z-10"
            aria-label="Подробнее о фильме"
          >
            <InfoIcon className="w-5 h-5" />
          </button>
        )}

        {labels.right && (
          <div className="absolute top-6 left-6 -rotate-12 border-2 border-green-500 rounded-lg px-3 py-1.5 bg-green-500/10 backdrop-blur-sm">
            <span className="text-green-500 text-lg font-black tracking-wider">ДА</span>
          </div>
        )}
        {labels.left && (
          <div className="absolute top-6 right-6 rotate-12 border-2 border-red-500 rounded-lg px-3 py-1.5 bg-red-500/10 backdrop-blur-sm">
            <span className="text-red-500 text-lg font-black tracking-wider">НЕТ</span>
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-5 space-y-2 pointer-events-none">
          <div className="flex items-end gap-2">
            <h2 className="text-2xl font-bold text-white text-shadow">{movie.title}</h2>
            <span className="text-lg text-gray-300 text-shadow mb-0.5">{movie.year}</span>
            <span className="ml-auto flex items-center gap-1 text-sm font-semibold text-yellow-400 text-shadow">
              <StarIcon className="w-3.5 h-3.5" />
              {movie.rating.toFixed(1)}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {movie.genres.map((g) => (
              <span key={g} className="text-xs bg-white/10 backdrop-blur-sm text-gray-200 px-2.5 py-1 rounded-full">{g}</span>
            ))}
          </div>
          {movie.overview && (
            <p className="text-sm text-gray-300 text-shadow leading-relaxed line-clamp-2">{movie.overview}</p>
          )}
        </div>
      </div>
    </div>
  );
}
