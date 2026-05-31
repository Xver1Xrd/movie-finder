'use client';

import { useRef, useState, useCallback } from 'react';
import type { Movie } from '@/types';
import { StarIcon } from '@/components/Icons';

interface MovieCardProps {
  movie: Movie;
  onSwipe?: (direction: 'left' | 'right') => void;
  onSwipeUp?: () => void;
}

export default function MovieCard({ movie, onSwipe, onSwipeUp }: MovieCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [dragX, setDragX] = useState(0);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [exitX, setExitX] = useState(0);
  const [exitY, setExitY] = useState(0);
  const [exiting, setExiting] = useState(false);

  const startPos = useRef({ x: 0, y: 0 });

  const handleStart = useCallback((clientX: number, clientY: number) => {
    if (exiting) return;
    startPos.current = { x: clientX, y: clientY };
    setIsDragging(true);
  }, [exiting]);

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging || exiting) return;
    const dx = clientX - startPos.current.x;
    const dy = clientY - startPos.current.y;
    setDragX(dx);
    setDragY(dy);
  }, [isDragging, exiting]);

  const handleEnd = useCallback(() => {
    if (!isDragging || exiting) return;
    setIsDragging(false);

    const threshold = 120;
    const upThreshold = -80;

    if (dragY < upThreshold && Math.abs(dragX) < 80) {
      setExiting(true);
      setExitY(-600);
      setTimeout(() => { onSwipeUp?.(); resetCard(); }, 300);
    } else if (dragX > threshold) {
      setExiting(true);
      setExitX(600);
      setTimeout(() => { onSwipe?.('right'); resetCard(); }, 300);
    } else if (dragX < -threshold) {
      setExiting(true);
      setExitX(-600);
      setTimeout(() => { onSwipe?.('left'); resetCard(); }, 300);
    } else {
      setDragX(0);
      setDragY(0);
    }
  }, [isDragging, exiting, dragX, dragY, onSwipe, onSwipeUp]);

  const resetCard = () => {
    setDragX(0);
    setDragY(0);
    setExitX(0);
    setExitY(0);
    setExiting(false);
  };

  const rotation = dragX * 0.08;

  return (
    <div className="w-full max-w-sm mx-auto select-none">
      <div
        ref={cardRef}
        onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
        onMouseMove={(e) => isDragging && handleMove(e.clientX, e.clientY)}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={(e) => { const t = e.touches[0]; handleStart(t.clientX, t.clientY); }}
        onTouchMove={(e) => { const t = e.touches[0]; handleMove(t.clientX, t.clientY); }}
        onTouchEnd={handleEnd}
        className="relative aspect-[2/3] w-full rounded-2xl overflow-hidden bg-[#0f0f1a] shadow-2xl transition-shadow duration-200 cursor-grab active:cursor-grabbing"
        style={{
          transform: exiting
            ? `translate(${exitX}px, ${exitY}px) rotate(${rotation}deg) scale(0.95)`
            : `translate(${dragX}px, ${dragY}px) rotate(${rotation}deg) scale(${isDragging ? 0.95 : 1})`,
          transition: exiting ? 'transform 0.3s ease-out' : isDragging ? 'none' : 'transform 0.3s ease-out',
        }}
      >
        <img
          src={movie.poster_url}
          alt={movie.title}
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />

        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent" />

        {isDragging && dragX > 50 && (
          <div className="absolute top-6 left-6 -rotate-12 border-2 border-green-500 rounded-lg px-3 py-1.5">
            <span className="text-green-500 text-lg font-black tracking-wider">ХОЧУ</span>
          </div>
        )}
        {isDragging && dragX < -50 && (
          <div className="absolute top-6 right-6 rotate-12 border-2 border-red-500 rounded-lg px-3 py-1.5">
            <span className="text-red-500 text-lg font-black tracking-wider">НЕТ</span>
          </div>
        )}
        {isDragging && dragY < -50 && Math.abs(dragX) < 80 && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 border-2 border-purple-500 rounded-lg px-3 py-1.5">
            <span className="text-purple-500 text-lg font-black tracking-wider">ПЕРЕСМОТР</span>
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-5 space-y-2">
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
