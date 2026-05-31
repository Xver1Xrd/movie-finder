// Supabase Edge Function: calculate-results
// Invoked when voting ends to compute final results
// Deploy with: supabase functions deploy calculate-results

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.0';

const VOTE_WEIGHTS: Record<string, number> = {
  want: 2,
  dont_mind: 1,
  pizza: 0,
  seen: 0.5,
};

interface VoteRow {
  movie_id: string;
  vote_type: string;
}

interface MovieRow {
  id: string;
  title: string;
  year: number;
  poster_url: string;
  rating: number;
  genres: string[];
  overview: string;
  sort_order: number;
  trailer_url: string | null;
  streaming_platforms: string[] | null;
}

interface ParticipantCount {
  count: number;
}

serve(async (req: Request) => {
  try {
    const { room_id } = await req.json();

    if (!room_id) {
      return new Response(JSON.stringify({ error: 'room_id is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const [moviesRes, votesRes, participantsRes] = await Promise.all([
      supabase
        .from('movies')
        .select('*')
        .eq('room_id', room_id)
        .order('sort_order', { ascending: true }),
      supabase
        .from('votes')
        .select('movie_id, vote_type')
        .eq('room_id', room_id),
      supabase
        .from('participants')
        .select('id', { count: 'exact', head: true })
        .eq('room_id', room_id),
    ]);

    if (moviesRes.error) throw moviesRes.error;
    if (votesRes.error) throw votesRes.error;
    if (participantsRes.error) throw participantsRes.error;

    const movies = moviesRes.data as MovieRow[];
    const votes = votesRes.data as VoteRow[];
    const totalParticipants = (participantsRes.data as ParticipantCount[]).length;

    const results = movies.map((movie) => {
      const movieVotes = votes.filter((v) => v.movie_id === movie.id);

      const voteCounts = { want: 0, dont_mind: 0, pizza: 0, seen: 0 };
      let totalScore = 0;

      for (const v of movieVotes) {
        const vt = v.vote_type as keyof typeof voteCounts;
        if (vt in voteCounts) {
          voteCounts[vt] += 1;
          totalScore += VOTE_WEIGHTS[vt] || 0;
        }
      }

      const totalVotes = voteCounts.want + voteCounts.dont_mind;
      const agreementPercentage =
        totalParticipants > 0
          ? Math.round((totalVotes / totalParticipants) * 100)
          : 0;

      return {
        movie_id: movie.id,
        title: movie.title,
        year: movie.year,
        poster_url: movie.poster_url,
        rating: movie.rating,
        genres: movie.genres,
        overview: movie.overview,
        trailer_url: movie.trailer_url,
        streaming_platforms: movie.streaming_platforms,
        total_score: totalScore,
        vote_counts: voteCounts,
        want_count: voteCounts.want,
        agreement_percentage: agreementPercentage,
      };
    });

    results.sort((a, b) => {
      if (b.total_score !== a.total_score) return b.total_score - a.total_score;
      if (b.want_count !== a.want_count) return b.want_count - a.want_count;
      return Math.random() - 0.5;
    });

    const winner = results[0];
    const top3 = results.slice(0, 3);

    return new Response(
      JSON.stringify({
        winner,
        top_movies: top3,
        all_results: results,
        total_participants: totalParticipants,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
