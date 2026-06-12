'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Room, Participant, Movie, MAX_PARTICIPANTS } from '@/types';
import { nanoid } from 'nanoid';

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function useRoom(roomId?: string) {
  const [room, setRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomId) {
      setLoading(false);
      return;
    }

    const fetchRoom = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('rooms')
          .select('*')
          .eq('id', roomId)
          .single();

        if (fetchError) throw fetchError;
        setRoom(data as Room);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load room');
      } finally {
        setLoading(false);
      }
    };

    fetchRoom();

    const roomSub = supabase
      .channel(`room-detail:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rooms',
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          setRoom(payload.new as Room);
        }
      )
      .subscribe();

    const participantSub = supabase
      .channel(`participants:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'participants',
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          fetchParticipants();
        }
      )
      .subscribe();

    fetchParticipants();

    return () => {
      supabase.removeChannel(roomSub);
      supabase.removeChannel(participantSub);
    };
  }, [roomId]);

  const fetchParticipants = async () => {
    if (!roomId) return;
    const { data } = await supabase
      .from('participants')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });
    if (data) setParticipants(data as Participant[]);
  };

  const createRoom = useCallback(async (hostName: string, maxMovies: number) => {
    const hostId = nanoid();
    const inviteCode = generateCode();
    const roomId = nanoid(12);

    const { data: roomData, error: roomError } = await supabase
      .from('rooms')
      .insert({
        id: roomId,
        host_id: hostId,
        max_movies: maxMovies,
        status: 'setup',
        invite_code: inviteCode,
      })
      .select()
      .single();

    if (roomError) throw roomError;

    const { error: participantError } = await supabase.from('participants').insert({
      id: hostId,
      room_id: roomId,
      name: hostName,
      is_host: true,
      current_movie_index: 0,
    });

    if (participantError) throw participantError;

    return { room: roomData as Room, hostId, participantId: hostId };
  }, []);

  const joinRoom = useCallback(async (inviteCode: string, name: string) => {
    const { data: roomData, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('invite_code', inviteCode.toUpperCase())
      .single();

    if (roomError || !roomData) throw new Error('Комната не найдена. Проверьте код.');
    if (roomData.status !== 'setup') throw new Error('Голосование уже началось');

    const { count } = await supabase
      .from('participants')
      .select('id', { count: 'exact', head: true })
      .eq('room_id', roomData.id);

    if (count && count >= MAX_PARTICIPANTS) {
      throw new Error(`Комната заполнена (макс. ${MAX_PARTICIPANTS} игрока)`);
    }

    const participantId = nanoid();
    const { error: participantError } = await supabase.from('participants').insert({
      id: participantId,
      room_id: roomData.id,
      name,
      is_host: false,
      current_movie_index: 0,
    });

    if (participantError) throw participantError;

    return { room: roomData as Room, participantId };
  }, []);

  // Вход по прямой ссылке на комнату (без кода приглашения)
  const joinRoomById = useCallback(async (targetRoomId: string, name: string) => {
    const { data: roomData, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', targetRoomId)
      .single();

    if (roomError || !roomData) throw new Error('Комната не найдена');
    if (roomData.status !== 'setup') throw new Error('Голосование уже началось');

    const { count } = await supabase
      .from('participants')
      .select('id', { count: 'exact', head: true })
      .eq('room_id', targetRoomId);

    if (count && count >= MAX_PARTICIPANTS) {
      throw new Error(`Комната заполнена (макс. ${MAX_PARTICIPANTS} игроков)`);
    }

    const participantId = nanoid();
    const { error: participantError } = await supabase.from('participants').insert({
      id: participantId,
      room_id: targetRoomId,
      name,
      is_host: false,
      current_movie_index: 0,
    });

    if (participantError) throw participantError;

    return { room: roomData as Room, participantId };
  }, []);

  const setReady = useCallback(async (participantId: string, ready: boolean) => {
    const { error } = await supabase
      .from('participants')
      .update({ is_ready: ready })
      .eq('id', participantId);
    if (error) throw error;
  }, []);

  const startVoting = useCallback(async () => {
    if (!roomId) return;
    const { error } = await supabase
      .from('rooms')
      .update({ status: 'voting' })
      .eq('id', roomId);
    if (error) throw error;
  }, [roomId]);

  const endVoting = useCallback(async () => {
    if (!roomId) return;
    const { error } = await supabase
      .from('rooms')
      .update({ status: 'completed' })
      .eq('id', roomId);
    if (error) throw error;
  }, [roomId]);

  // Финальный раунд при ничьей: финалисты вставляются свежими строками,
  // все старые фильмы (и их голоса — каскадом) удаляются, комната возвращается в голосование
  const startFinalRound = useCallback(async (allMovies: Movie[], finalists: Movie[]) => {
    if (!roomId || finalists.length < 2) return;

    const inserts = finalists.map((m, i) => ({
      room_id: roomId,
      tmdb_id: m.tmdb_id,
      title: m.title,
      year: m.year,
      poster_url: m.poster_url,
      rating: m.rating,
      genres: m.genres,
      overview: m.overview,
      sort_order: i,
    }));
    const { error: insertError } = await supabase.from('movies').insert(inserts);
    if (insertError) throw insertError;

    const { error: deleteError } = await supabase
      .from('movies')
      .delete()
      .in('id', allMovies.map((m) => m.id));
    if (deleteError) throw deleteError;

    const { error: statusError } = await supabase
      .from('rooms')
      .update({ status: 'voting' })
      .eq('id', roomId);
    if (statusError) throw statusError;
  }, [roomId]);

  return {
    room,
    participants,
    loading,
    error,
    createRoom,
    joinRoom,
    joinRoomById,
    setReady,
    startVoting,
    endVoting,
    startFinalRound,
    fetchParticipants,
  };
}
