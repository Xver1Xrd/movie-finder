-- MovieTier Database Schema
-- Run this in Supabase SQL Editor to set up the database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Rooms table
CREATE TABLE rooms (
  id TEXT PRIMARY KEY,
  host_id TEXT NOT NULL,
  max_movies INTEGER NOT NULL DEFAULT 80 CHECK (max_movies >= 1 AND max_movies <= 80),
  status TEXT NOT NULL DEFAULT 'setup' CHECK (status IN ('setup', 'voting', 'completed')),
  invite_code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rooms_invite_code ON rooms(invite_code);
CREATE INDEX idx_rooms_status ON rooms(status);

-- Participants table
CREATE TABLE participants (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_host BOOLEAN NOT NULL DEFAULT FALSE,
  current_movie_index INTEGER NOT NULL DEFAULT 0,
  is_ready BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_participants_room_id ON participants(room_id);

-- Movies table
CREATE TABLE movies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  tmdb_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  year INTEGER NOT NULL,
  poster_url TEXT NOT NULL,
  rating REAL NOT NULL DEFAULT 0,
  genres TEXT[] NOT NULL DEFAULT '{}',
  overview TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  trailer_url TEXT,
  streaming_platforms TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_movies_room_id ON movies(room_id);
CREATE INDEX idx_movies_sort_order ON movies(room_id, sort_order);

-- Votes table
CREATE TABLE votes (
  id TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  movie_id UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('want', 'dont_mind')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(participant_id, movie_id)
);

CREATE INDEX idx_votes_room_id ON votes(room_id);
CREATE INDEX idx_votes_participant_id ON votes(participant_id);
CREATE INDEX idx_votes_movie_id ON votes(movie_id);

-- Enable Row Level Security
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Rooms policies
CREATE POLICY "Anyone can read active rooms" ON rooms
  FOR SELECT USING (true);

CREATE POLICY "Anyone can create rooms" ON rooms
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Host can update their room" ON rooms
  FOR UPDATE USING (true) WITH CHECK (true);

-- Participants policies
CREATE POLICY "Anyone can read participants" ON participants
  FOR SELECT USING (true);

CREATE POLICY "Anyone can join" ON participants
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Participants can update themselves" ON participants
  FOR UPDATE USING (true) WITH CHECK (true);

-- Movies policies
CREATE POLICY "Anyone can read movies" ON movies
  FOR SELECT USING (true);

CREATE POLICY "Host can add movies" ON movies
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM rooms r
      WHERE r.id = room_id AND r.status = 'setup'
    )
  );

CREATE POLICY "Host can delete movies" ON movies
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM rooms r
      WHERE r.id = room_id AND r.status = 'setup'
    )
  );

-- Votes policies
CREATE POLICY "Participants can read votes in their room" ON votes
  FOR SELECT USING (true);

CREATE POLICY "Participants can insert their own votes" ON votes
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Participants can update their own votes" ON votes
  FOR UPDATE USING (true) WITH CHECK (true);

-- Enable real-time for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE participants;
ALTER PUBLICATION supabase_realtime ADD TABLE movies;
ALTER PUBLICATION supabase_realtime ADD TABLE votes;
