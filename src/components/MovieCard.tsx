'use client';

import { useRef, useState, useCallback } from 'react';
import type { Movie } from '@/types';
import { StarIcon } from '@/components/Icons';

export default function MovieCard({ movie, onSwipe, onSwipeUp }: {
  movie: Movie;
  onSwipe?: (direction: 'left' | 'right') => void;
  onSwipeUp?: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const startPos = useRef({ x: 0, y: 0 });
  const currentPos = useRef({ x: 0, y: 0 });
  const [style, setStyle] = useState({ transform: '', transition: '' });
  const [labels, setLabels] = useState<{ want: boolean; skip: boolean; up: boolean }>({ want: false, skip: false, up: false });

  const threshold = 120;
  const upThreshold = -80;

  const resetCard = useCallback(() => {
    setStyle({ transform: '', transition: 'transform 0.3s ease-out' });
    setLabels({ want: false, skip: false, up: false });
    currentPos.current = { x: 0, y: 0 };
  }, []);

  const handleStart = useCallback((clientX: number, clientY: number) => {
    startPos.current = { x: clientX, y: clientY };
    currentPos.current = { x: 0, y: 0 };
    setStyle({ transform: 'scale(0.95)', transition: 'none' });
  }, []);

  const handleMove = useCallback((clientX: number, clientY: number) => {
    const dx = clientX - startPos.current.x;
    const dy = clientY - startPos.current.y;
    currentPos.current = { x: dx, y: dy };
    const rot = dx * 0.08;
    setStyle({
      transform: `translate(${dx}px, ${dy}px) rotate(${rot}deg) scale(0.95)`,
      transition: 'none',
    });
    setLabels({
      want: dx > 50,
      skip: dx < -50,
      up: dy < -50 && Math.abs(dx) < 80,
    });
  }, []);

  const handleEnd = useCallback(() => {
    const { x, y } = currentPos.current;

    if (y < upThreshold && Math.abs(x) < 80) {
      setStyle({
        transform: `translate(0, -600px) rotate(${x * 0.08}deg) scale(0.95)`,
        transition: 'transform 0.3s ease-out',
      });
      setTimeout(() => { onSwipeUp?.(); resetCard(); }, 300);
    } else if (x > threshold) {
      setStyle({
        transform: `translate(600px, ${y}px) rotate(${x * 0.08}deg) scale(0.95)`,
        transition: 'transform 0.3s ease-out',
      });
      setTimeout(() => { onSwipe?.('right'); resetCard(); }, 300);
    } else if (x < -threshold) {
      setStyle({
        transform: `translate(-600px, ${y}px) rotate(${x * 0.08}deg) scale(0.95)`,
        transition: 'transform 0.3s ease-out',
      });
      setTimeout(() => { onSwipe?.('left'); resetCard(); }, 300);
    } else {
      resetCard();
    }
  }, [onSwipe, onSwipeUp, resetCard, threshold, upThreshold]);

  return (
    <div className="w-full max-w-sm mx-auto select-none">
      <div
        ref={cardRef}
        onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
        onMouseMove={(e) => { if (currentPos.current) handleMove(e.clientX, e.clientY); }}
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
        <img
          src={movie.poster_url}
          alt={movie.title}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          draggable={false}
        />

        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent pointer-events-none" />

        {labels.want && (
          <div className="absolute top-6 left-6 -rotate-12 border-2 border-green-500 rounded-lg px-3 py-1.5 bg-green-500/10 backdrop-blur-sm">
            <span className="text-green-500 text-lg font-black tracking-wider">ХОЧУ</span>
          </div>
        )}
        {labels.skip && (
          <div className="absolute top-6 right-6 rotate-12 border-2 border-red-500 rounded-lg px-3 py-1.5 bg-red-500/10 backdrop-blur-sm">
            <span className="text-red-500 text-lg font-black tracking-wider">НЕТ</span>
          </div>
        )}
        {labels.up && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 border-2 border-purple-500 rounded-lg px-3 py-1.5 bg-purple-500/10 backdrop-blur-sm">
            <span className="text-purple-500 text-lg font-black tracking-wider">ПЕРЕСМОТР</span>
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
