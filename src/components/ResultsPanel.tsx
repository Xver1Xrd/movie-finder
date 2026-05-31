'use client';

import { RoomResults, MovieResult } from '@/types';
import { MedalIcon, StarIcon, FireIcon, ThumbsDownIcon, CheckIcon } from '@/components/Icons';

function thumbUrl(url: string, size: string): string {
  return url.replace(/\/w\d+/, `/${size}`);
}

function MovieResultCard({ result, rank, compact }: { result: MovieResult; rank: number; compact?: boolean }) {
  const isWinner = rank === 1;

  if (compact) {
    return (
      <div className="flex items-center gap-3 bg-[#12121a] rounded-xl px-3 py-2 border border-[#1f1f2e]">
        <img src={thumbUrl(result.movie.poster_url, 'w92')} alt="" className="w-8 h-11 object-cover rounded-lg flex-shrink-0" loading="lazy" />
        <div className="flex-1 min-w-0">
          <div className="text-sm text-white font-medium truncate">{result.movie.title}</div>
          <div className="text-xs text-gray-500">{result.movie.year}</div>
        </div>
        <div className="flex items-center gap-1.5 text-xs flex-shrink-0">
          {result.yes_count > 0 && (
            <span className="flex items-center gap-0.5 text-green-400 font-medium">
              <FireIcon className="w-3 h-3" /> {result.yes_count}
            </span>
          )}
          {result.vote_counts.dont_mind > 0 && (
            <span className="flex items-center gap-0.5 text-red-400 font-medium">
              <ThumbsDownIcon className="w-3 h-3" /> {result.vote_counts.dont_mind}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl overflow-hidden border transition-all ${
      isWinner
        ? 'border-yellow-500/50 bg-yellow-500/10 shadow-lg shadow-yellow-500/10'
        : 'border-[#1f1f2e] bg-[#12121a]'
    }`}>
      <div className="flex gap-4 p-4">
        <div className="relative w-20 flex-shrink-0">
          <img src={thumbUrl(result.movie.poster_url, 'w154')} alt={result.movie.title} className="w-20 h-28 object-cover rounded-xl" loading="lazy" />
          <div className={`absolute -top-3 -left-3 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black ${
            rank === 1 ? 'bg-yellow-500 text-black' : 'bg-[#1f1f2e] text-gray-500'
          }`}>
            {rank === 1 ? '1' : rank === 2 ? '2' : '3'}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className={`font-bold truncate ${isWinner ? 'text-xl text-white' : 'text-base text-gray-200'}`}>
                {result.movie.title}
              </h3>
              <p className="text-gray-500 text-sm">{result.movie.year}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <span className="flex items-center gap-1 text-sm font-semibold text-yellow-400">
                <StarIcon className="w-3.5 h-3.5" />
                {result.movie.rating.toFixed(1)}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {result.movie.genres.slice(0, 2).map((g) => (
              <span key={g} className="text-[10px] bg-[#0a0a0f] text-gray-500 px-2 py-0.5 rounded-full border border-[#1f1f2e]">{g}</span>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1.5 text-sm">
              <FireIcon className="w-4 h-4 text-green-400" />
              <span className="text-green-400 font-bold">{result.vote_counts.want}</span>
              <span className="text-gray-600 text-xs">Да</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <ThumbsDownIcon className="w-4 h-4 text-red-400" />
              <span className="text-red-400 font-bold">{result.vote_counts.dont_mind}</span>
              <span className="text-gray-600 text-xs">Нет</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResultsPanel({ results, isSolo }: { results: RoomResults; isSolo?: boolean }) {
  if (isSolo) {
    const yesMovies = results.top_movies.filter((r) => r.yes_count > 0);
    const noMovies = results.top_movies.filter((r) => r.yes_count === 0);

    return (
      <div className="w-full max-w-lg mx-auto space-y-4 px-4 py-6">
        <div className="text-center space-y-2 mb-2">
          <h1 className="text-2xl font-bold text-white">Ваши фильмы</h1>
          <p className="text-gray-500 text-sm">{results.top_movies.length} фильмов</p>
        </div>

        {yesMovies.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <FireIcon className="w-4 h-4 text-green-400" />
              <span className="text-sm font-semibold text-green-400">Понравились</span>
              <span className="text-xs text-gray-600">{yesMovies.length}</span>
            </div>
            <div className="space-y-2">
              {yesMovies.map((r, i) => (
                <MovieResultCard key={r.movie.id} result={r} rank={i + 1} compact />
              ))}
            </div>
          </div>
        )}

        {noMovies.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ThumbsDownIcon className="w-4 h-4 text-red-400" />
              <span className="text-sm font-semibold text-red-400">Не понравились</span>
              <span className="text-xs text-gray-600">{noMovies.length}</span>
            </div>
            <div className="space-y-2">
              {noMovies.map((r, i) => (
                <MovieResultCard key={r.movie.id} result={r} rank={i + 1} compact />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto space-y-6 px-4 py-6">
      <div className="text-center space-y-3">
        <div className="flex justify-center">
          <MedalIcon className="w-12 h-12 text-yellow-400" />
        </div>
        <h1 className="text-3xl font-black text-white">Победитель</h1>
        <p className="text-gray-500 text-sm max-w-xs mx-auto">
          <span className="font-semibold text-white">{results.winner.movie.title}</span>
          {' '}— {results.winner.yes_count} Да / {results.winner.vote_counts.dont_mind} Нет
        </p>
      </div>

      <div className="space-y-3">
        {results.top_movies.map((r, i) => (
          <MovieResultCard key={r.movie.id} result={r} rank={i + 1} />
        ))}
      </div>
    </div>
  );
}
