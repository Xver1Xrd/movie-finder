'use client';

import { VoteType } from '@/types';
import { FireIcon, ThumbsDownIcon, EyeIcon, PizzaIcon } from '@/components/Icons';

interface VoteButtonsProps {
  onVote: (type: VoteType) => void;
  selectedType: VoteType | null;
}

const buttons: Array<{ type: VoteType; color: string; bg: string; icon: React.ReactNode }> = [
  { type: 'want', color: 'text-green-400', bg: 'bg-green-500/20 border-green-500/30', icon: <FireIcon className="w-6 h-6" /> },
  { type: 'dont_mind', color: 'text-red-400', bg: 'bg-red-500/20 border-red-500/30', icon: <ThumbsDownIcon className="w-6 h-6" /> },
  { type: 'seen', color: 'text-purple-400', bg: 'bg-purple-500/20 border-purple-500/30', icon: <EyeIcon className="w-6 h-6" /> },
  { type: 'pizza', color: 'text-yellow-400', bg: 'bg-yellow-500/20 border-yellow-500/30', icon: <PizzaIcon className="w-6 h-6" /> },
];

export default function VoteButtons({ onVote, selectedType }: VoteButtonsProps) {
  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="flex items-center justify-center gap-4">
        {buttons.map(({ type, color, bg, icon }) => {
          const isSelected = selectedType === type;
          return (
            <button
              key={type}
              onClick={() => onVote(type)}
              className={`flex flex-col items-center gap-1 p-3 rounded-2xl transition-all active:scale-90 border ${
                isSelected ? `${bg} ${color} scale-110` : 'border-transparent text-gray-600 hover:text-gray-400'
              }`}
            >
              <span className="text-2xl">{icon}</span>
              <span className={`text-[10px] font-semibold ${isSelected ? color : 'text-gray-600'}`}>
                {type === 'want' ? 'Хочу' : type === 'dont_mind' ? 'Нет' : type === 'seen' ? 'Смотрел' : 'Пицца'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
