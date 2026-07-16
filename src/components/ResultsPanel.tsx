'use client';

import Image from 'next/image';
import { RoomResults, MovieResult } from '@/types';
import { MedalIcon, StarIcon, FireIcon, ThumbsDownIcon, CheckIcon } from '@/components/Icons';

function thumbUrl(url: string, size: string): string {
  return url.replace(/\/w\d+/, `/${size}`);
}

function MovieResultCard({ result, rank, compact }: { result: MovieResult; rank: number; compact?: boolean }) {
  const isWinner = rank === 1;

  if (compact) {
    return (
      <div className={`group relative aspect-[2/3] rounded-2xl overflow-hidden bg-[#0a0a0f] border-2 transition-all hover:shadow-xl hover:-translate-y-1 ${
        result.yes_count > 0
          ? 'border-green-500/40 shadow-green-500/10'
          : 'border-red-500/30 shadow-red-500/5'
      }`}>
        <Image
          src={thumbUrl(result.movie.poster_url, 'w342')}
          alt={result.movie.title}
          fill
          sizes="(max-width: 640px) 50vw, 33vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-3 space-y-1.5">
          <p className="text-sm font-bold text-white leading-tight truncate">{result.movie.title}</p>
          <p className="text-[10px] text-gray-400">{result.movie.year}</p>
          <div className="flex items-center gap-2 pt-0.5">
            {result.yes_count > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-green-400 bg-green-500/15 px-2 py-0.5 rounded-full">
                <FireIcon className="w-2.5 h-2.5" /> Да
              </span>
            )}
            {result.vote_counts.dont_mind > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-red-400 bg-red-500/15 px-2 py-0.5 rounded-full">
                <ThumbsDownIcon className="w-2.5 h-2.5" /> Нет
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`group relative aspect-[2/3] rounded-2xl overflow-hidden bg-[#0a0a0f] border-2 transition-all hover:shadow-xl hover:-translate-y-1 ${
      isWinner
        ? 'border-yellow-500/60 shadow-lg shadow-yellow-500/15'
        : 'border-[#1f1f2e] hover:border-pink-600/40'
    }`}>
      <Image
        src={thumbUrl(result.movie.poster_url, 'w342')}
        alt={result.movie.title}
        fill
        sizes="(max-width: 640px) 50vw, 33vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent" />

      <div className={`absolute -top-2 -left-2 w-8 h-8 rounded-full flex items-center justify-center text-xs font-black z-10 shadow-lg ${
        rank === 1 ? 'bg-yellow-500 text-black' : 'bg-[#1f1f2e] text-gray-400'
      }`}>
        {rank}
      </div>

      <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-[10px] font-semibold text-yellow-400 z-10">
        <StarIcon className="w-2.5 h-2.5" />
        {result.movie.rating.toFixed(1)}
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-3.5 space-y-2">
        <h3 className={`font-bold leading-tight truncate ${isWinner ? 'text-base text-white' : 'text-sm text-gray-100'}`}>
          {result.movie.title}
        </h3>
        <div className="flex items-center gap-2 text-[10px] text-gray-400">
          <span>{result.movie.year}</span>
          {result.movie.genres.slice(0, 2).map((g) => (
            <span key={g} className="bg-white/10 px-1.5 py-0.5 rounded-full">{g}</span>
          ))}
        </div>
        <div className="flex items-center gap-3 pt-0.5">
          <div className="flex items-center gap-1.5">
            <FireIcon className="w-3.5 h-3.5 text-green-400" />
            <span className="text-xs font-bold text-green-400">{result.vote_counts.want}</span>
            <span className="text-[9px] text-gray-500">Да</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ThumbsDownIcon className="w-3.5 h-3.5 text-red-400" />
            <span className="text-xs font-bold text-red-400">{result.vote_counts.dont_mind}</span>
            <span className="text-[9px] text-gray-500">Нет</span>
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
      <div className="w-full max-w-lg mx-auto px-4 py-6">
        <div className="text-center space-y-2 mb-5">
          <h1 className="text-2xl font-bold text-white">Ваши фильмы</h1>
          <p className="text-gray-500 text-sm">{results.top_movies.length} фильмов</p>
        </div>

        {yesMovies.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <FireIcon className="w-4 h-4 text-green-400" />
              <span className="text-sm font-semibold text-green-400">Понравились</span>
              <span className="text-xs text-gray-600">{yesMovies.length}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
    <div className="w-full max-w-lg mx-auto px-4 py-6">
      <div className="text-center space-y-3 mb-6">
        <div className="flex justify-center">
          <MedalIcon className="w-12 h-12 text-yellow-400" />
        </div>
        <h1 className="text-3xl font-black text-white">Победитель</h1>
        <p className="text-gray-500 text-sm max-w-xs mx-auto">
          <span className="font-semibold text-white">{results.winner.movie.title}</span>
          {' '}— {results.winner.yes_count} Да / {results.winner.vote_counts.dont_mind} Нет
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {results.top_movies.map((r, i) => (
          <MovieResultCard key={r.movie.id} result={r} rank={i + 1} />
        ))}
      </div>
    </div>
  );
}
