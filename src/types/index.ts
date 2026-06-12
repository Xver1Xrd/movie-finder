export type VoteType = 'want' | 'dont_mind';
export type RoomStatus = 'setup' | 'voting' | 'completed';

export interface Movie {
  id: string;
  room_id: string;
  tmdb_id: number;
  title: string;
  year: number;
  poster_url: string;
  rating: number;
  genres: string[];
  overview: string;
  sort_order: number;
  trailer_url?: string;
  streaming_platforms?: string[];
}

export interface Participant {
  id: string;
  room_id: string;
  name: string;
  is_host: boolean;
  is_ready: boolean;
  current_movie_index: number;
  created_at: string;
}

export interface Vote {
  id: string;
  participant_id: string;
  movie_id: string;
  room_id: string;
  vote_type: VoteType;
  created_at: string;
}

export interface Room {
  id: string;
  host_id: string;
  max_movies: number;
  status: RoomStatus;
  created_at: string;
  invite_code: string;
}

export interface VoteCount {
  want: number;
  dont_mind: number;
}

export interface MovieResult {
  movie: Movie;
  vote_counts: VoteCount;
  yes_count: number;
}

export interface RoomResults {
  top_movies: MovieResult[];
  winner: MovieResult;
  total_participants: number;
}

export const VOTE_LABELS: Record<VoteType, string> = {
  want: 'Да',
  dont_mind: 'Нет',
};

export const MAX_MOVIES = 80;
export const DEFAULT_MAX_MOVIES = 80;
export const MIN_MOVIES = 1;
export const MAX_PARTICIPANTS = 10;
