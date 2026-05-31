-- Migration: Update vote_type CHECK constraint to only allow 'want' and 'dont_mind'
-- Remove 'pizza' and 'seen' vote types

ALTER TABLE votes DROP CONSTRAINT votes_vote_type_check;
ALTER TABLE votes ADD CONSTRAINT votes_vote_type_check CHECK (vote_type IN ('want', 'dont_mind'));
