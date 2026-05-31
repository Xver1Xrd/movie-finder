'use client';

import { RoomResults, VOTE_LABELS, MovieResult } from '@/types';
import { MedalIcon, StarIcon, FireIcon, ThumbsDownIcon, EyeIcon, PizzaIcon, CheckIcon } from '@/components/Icons';

const VOTE_ICONS: Record<string, React.ReactNode> = {
  want: <FireIcon className="w-5 h-5" />,
  dont_mind: <ThumbsDownIcon className="w-5 h-5" />,
  seen: <EyeIcon className="w-5 h-5" />,
  pizza: <PizzaIcon className="w-5 h-5" />,
};

function AgreementBadge({ pct }: { pct: number }) {
  if (pct < 50) return null;
  const colors = pct >= 100 ? 'bg-green-500/20 text-green-400 border-green-500/30'
    : pct >= 75 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
    : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${colors}`}>
      {pct >= 100 ? 'Все хотят!' : `${pct}%`}
    </span>
  );
}

function MovieResultCard({ result, rank }: { result: MovieResult; rank: number }) {
  const isWinner = rank === 1;
  const medals = ['', '1', '2', '3'];

  return (
    <div className={`rounded-2xl overflow-hidden border transition-all ${
      isWinner
        ? 'border-yellow-500/50 bg-yellow-500/10 shadow-lg shadow-yellow-500/10'
        : 'border-[#1f1f2e] bg-[#12121a]'
    }`}>
      <div className="flex gap-4 p-4">
        <div className="relative w-20 flex-shrink-0">
          <img src={result.movie.poster_url} alt={result.movie.title} className="w-20 h-28 object-cover rounded-xl" />
          <div className={`absolute -top-3 -left-3 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black ${
            rank === 1 ? 'bg-yellow-500 text-black' : 'bg-[#1f1f2e] text-gray-500'
          }`}>
            {medals[rank]}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className={`font-bold truncate flex items-center gap-2 ${isWinner ? 'text-xl text-white' : 'text-base text-gray-200'}`}>
                {result.movie.title}
                <AgreementBadge pct={result.agreement_percentage} />
              </h3>
              <p className="text-gray-500 text-sm">{result.movie.year}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <div className={`font-black ${isWinner ? 'text-3xl text-yellow-400' : 'text-lg text-gray-400'}`}>
                {result.total_score.toFixed(0)}
              </div>
              <div className="text-xs text-gray-600">оч.</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {result.movie.genres.slice(0, 2).map((g) => (
              <span key={g} className="text-[10px] bg-[#0a0a0f] text-gray-500 px-2 py-0.5 rounded-full border border-[#1f1f2e]">{g}</span>
            ))}
          </div>
          <div className="flex items-center gap-3 mt-2 text-xs">
            <span className="text-green-400 font-medium">↑ {result.agreement_percentage}%</span>
            <span className="text-gray-600 flex items-center gap-0.5">
              <StarIcon className="w-3 h-3" />
              {result.movie.rating.toFixed(1)}
            </span>
          </div>
        </div>
      </div>

      {isWinner && (
        <div className="px-4 pb-4 space-y-3">
          <div className="border-t border-yellow-500/20 pt-3">
            <div className="grid grid-cols-4 gap-2">
              {(Object.entries(result.vote_counts) as [keyof typeof result.vote_counts, number][]).map(([type, count]) => (
                <div key={type} className="text-center bg-[#0a0a0f] rounded-xl py-2 px-1 border border-[#1f1f2e]">
                  <div className="flex justify-center mb-1">{VOTE_ICONS[type]}</div>
                  <div className="text-lg font-bold text-white">{count}</div>
                  <div className="text-[10px] text-gray-500">{VOTE_LABELS[type as keyof typeof VOTE_LABELS]}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ResultsPanel({ results }: { results: RoomResults }) {
  const unanimous = results.top_movies.filter((r) => r.agreement_percentage >= 100);

  return (
    <div className="w-full max-w-lg mx-auto space-y-6 px-4 py-6">
      <div className="text-center space-y-3">
        <div className="flex justify-center">
          <MedalIcon className="w-12 h-12 text-yellow-400" />
        </div>
        <h1 className="text-3xl font-black text-white">Победитель</h1>
        <p className="text-gray-500 text-sm max-w-xs mx-auto">
          <span className="font-semibold text-white">{results.winner.movie.title}</span> — {results.winner.total_score.toFixed(0)} очков
        </p>
      </div>

      {unanimous.length > 0 && results.total_participants > 1 && (
        <div className="bg-green-500/5 border border-green-500/20 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-green-400 text-sm font-semibold">
            <CheckIcon className="w-4 h-4" />
            Все согласны
          </div>
          <div className="flex flex-wrap gap-2">
            {unanimous.map((r) => (
              <div key={r.movie.id} className="flex items-center gap-2 bg-[#0a0a0f] rounded-xl px-3 py-1.5 border border-[#1f1f2e]">
                <img src={r.movie.poster_url} alt="" className="w-6 h-8 object-cover rounded" />
                <span className="text-xs text-gray-300 font-medium">{r.movie.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {results.top_movies.map((r, i) => (
          <MovieResultCard key={r.movie.id} result={r} rank={i + 1} />
        ))}
      </div>
    </div>
  );
}
