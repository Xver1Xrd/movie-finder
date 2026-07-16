'use client';

import { useRef, useCallback, useState } from 'react';

const MIN = 1960;
const MAX = new Date().getFullYear() + 1;

export default function YearRangeSlider({
  yearMin, yearMax, onChange,
}: {
  yearMin: number; yearMax: number;
  onChange: (min: number, max: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<'min' | 'max' | null>(null);

  const clamp = (v: number) => Math.max(MIN, Math.min(MAX, v));

  const getValueFromX = useCallback((clientX: number) => {
    if (!trackRef.current) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    const pct = (clientX - rect.left) / rect.width;
    return Math.round(MIN + pct * (MAX - MIN));
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent, handle: 'min' | 'max') => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragging.current = handle;

    const move = (ev: PointerEvent) => {
      if (!dragging.current) return;
      const v = clamp(getValueFromX(ev.clientX));
      if (dragging.current === 'min') {
        onChange(Math.min(v, yearMax - 1), yearMax);
      } else {
        onChange(yearMin, Math.max(v, yearMin + 1));
      }
    };

    const up = () => {
      dragging.current = null;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }, [yearMin, yearMax, onChange, getValueFromX]);

  const onTrackDown = useCallback((e: React.PointerEvent) => {
    if (dragging.current) return;
    const v = clamp(getValueFromX(e.clientX));
    const distMin = Math.abs(v - yearMin);
    const distMax = Math.abs(v - yearMax);
    const handle = distMin <= distMax ? 'min' : 'max';
    onPointerDown(e as unknown as React.PointerEvent, handle);
  }, [yearMin, yearMax, getValueFromX, onPointerDown]);

  const pctMin = ((yearMin - MIN) / (MAX - MIN)) * 100;
  const pctMax = ((yearMax - MIN) / (MAX - MIN)) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>Годы</span>
        <span className="font-mono">{yearMin} — {yearMax}</span>
      </div>
      <div
        ref={trackRef}
        className="relative h-7 flex items-center cursor-pointer select-none touch-none"
        onPointerDown={onTrackDown}
      >
        <div className="absolute left-0 right-0 h-1 bg-[#1f1f2e] rounded-full" />
        <div
          className="absolute h-1 bg-pink-600 rounded-full"
          style={{ left: `${pctMin}%`, width: `${pctMax - pctMin}%` }}
        />
        <div
          className="absolute w-5 h-5 rounded-full bg-white border-2 border-pink-600 -translate-x-1/2 cursor-grab active:cursor-grabbing hover:scale-110 transition-transform z-10 shadow-md"
          style={{ left: `${pctMin}%` }}
          onPointerDown={(e) => onPointerDown(e, 'min')}
        />
        <div
          className="absolute w-5 h-5 rounded-full bg-white border-2 border-pink-600 -translate-x-1/2 cursor-grab active:cursor-grabbing hover:scale-110 transition-transform z-10 shadow-md"
          style={{ left: `${pctMax}%` }}
          onPointerDown={(e) => onPointerDown(e, 'max')}
        />
      </div>
    </div>
  );
}
