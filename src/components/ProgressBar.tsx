'use client';

interface ProgressBarProps {
  current: number;
  total: number;
}

export default function ProgressBar({ current, total }: ProgressBarProps) {
  const pct = total > 0 ? (current / total) * 100 : 0;
  return (
    <div className="w-full max-w-sm mx-auto px-2">
      <div className="w-full h-1.5 bg-[#1f1f2e] rounded-full overflow-hidden">
        <div
          className="h-full bg-pink-600 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
