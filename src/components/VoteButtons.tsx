'use client';

import { VoteType } from '@/types';
import { FireIcon, ThumbsDownIcon } from '@/components/Icons';

interface VoteButtonsProps {
  onVote: (type: VoteType) => void;
  selectedType: VoteType | null;
}

const buttons: Array<{ type: VoteType; color: string; bg: string; icon: React.ReactNode; label: string }> = [
  { type: 'want', color: 'text-green-400', bg: 'bg-green-500/20 border-green-500/30', icon: <FireIcon className="w-6 h-6" />, label: 'Да' },
  { type: 'dont_mind', color: 'text-red-400', bg: 'bg-red-500/20 border-red-500/30', icon: <ThumbsDownIcon className="w-6 h-6" />, label: 'Нет' },
];

export default function VoteButtons({ onVote, selectedType }: VoteButtonsProps) {
  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="flex items-center justify-center gap-8">
        {buttons.map(({ type, color, bg, icon, label }) => {
          const isSelected = selectedType === type;
          return (
            <button
              key={type}
              onClick={() => onVote(type)}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all active:scale-90 border ${
                isSelected ? `${bg} ${color} scale-110` : 'border-transparent text-gray-600 hover:text-gray-400'
              }`}
            >
              <span className="text-3xl">{icon}</span>
              <span className={`text-sm font-bold ${isSelected ? color : 'text-gray-600'}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
