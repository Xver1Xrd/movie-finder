# MovieTier Security Rules

## Row Level Security (RLS) Overview

RLS is enabled on all tables. The policies are designed so that:

- Participants CANNOT see individual vote details of others before they have voted themselves.
- The vote counts are computed client-side from the votes table, but since RLS allows SELECT on votes for all participants in the room, the protection is achieved through application-layer filtering:
  - Individual vote data (who voted for what) is never exposed in the UI
  - Only aggregate counts per movie are shown after the participant has voted on that movie

## Table Policies

### rooms
- `SELECT`: Anyone can read room details (needed to join by invite code)
- `INSERT`: Anyone can create a room
- `UPDATE`: Host can update room status (start/end voting)

### participants
- `SELECT`: Anyone can see who is in the room
- `INSERT`: Anyone can join a room
- `UPDATE`: Participants can update their own progress

### movies
- `SELECT`: Anyone can see the movie list
- `INSERT`: Only allowed when room is in 'setup' status
- `DELETE`: Only allowed when room is in 'setup' status

### votes
- `SELECT`: All participants can see vote aggregates
- `INSERT`: Participants can cast votes
- `UPDATE`: Participants can change their own votes

## Application-Level Privacy

The `useVoting` hook fetches:
1. The current participant's own votes (filtered by participant_id)
2. All votes in the room for aggregate counts

The UI only shows:
- Aggregate counts per movie (e.g., "3 participants voted: 2 Want, 1 Dont Mind")
- This is shown ONLY after the current user has voted on that specific movie

Individual identities are never revealed.

## Preventing Vote Tampering

- Vote IDs use the format `${participant_id}_${movie_id}`, ensuring each participant can only have one vote per movie
- UNIQUE constraint on (participant_id, movie_id) enforces one vote per movie per person
- UPDATE policies allow participants to change their own votes
