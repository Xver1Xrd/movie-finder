-- Migration 006: RLS, завязанный на «кто», а не только на «что».
--
-- До этой миграции все политики были вида USING (true): у любого, кто знает
-- anon-ключ (он лежит в клиентском бандле — это нормально для Supabase), был
-- полный доступ на запись к любой комнате. В частности id голоса предсказуем
-- (participantId_movieId), а participant id читается публично, поэтому кто
-- угодно мог переименовать чужого участника, переписать чужой голос или
-- переключить статус чужой комнаты.
--
-- Решение: анонимная аутентификация Supabase (signInAnonymously). Каждому
-- участнику и каждой комнате присваивается auth_uid/host_auth_uid текущей
-- анонимной сессии, и политики UPDATE/INSERT проверяют auth.uid() наравне со
-- статусом комнаты.
--
-- ВАЖНО: перед выполнением этой миграции нужно включить Anonymous Sign-ins
-- в Supabase Dashboard → Authentication → Providers → Anonymous. Без этого
-- signInAnonymously() на клиенте будет падать, и запись в rooms/participants/
-- votes станет невозможна.
--
-- Данные, созданные до миграции, останутся с auth_uid/host_auth_uid = NULL —
-- такие старые комнаты уже нельзя будет обновлять (auth.uid() никогда не NULL
-- у аутентифицированного клиента), это ожидаемо для комнат, которые и так
-- живут не дольше 30 дней (см. миграцию 005).

ALTER TABLE participants ADD COLUMN auth_uid UUID;
ALTER TABLE rooms ADD COLUMN host_auth_uid UUID;

CREATE INDEX idx_participants_auth_uid ON participants(auth_uid);

-- === Rooms ===

DROP POLICY IF EXISTS "Anyone can create rooms" ON rooms;
CREATE POLICY "Host can create rooms" ON rooms
  FOR INSERT WITH CHECK (host_auth_uid = auth.uid());

DROP POLICY IF EXISTS "Host can update their room" ON rooms;
CREATE POLICY "Room participants can update room status" ON rooms
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM participants p WHERE p.room_id = rooms.id AND p.auth_uid = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM participants p WHERE p.room_id = rooms.id AND p.auth_uid = auth.uid())
  );

-- Триггер из миграции 003 ограничивал только допустимые переходы статуса.
-- Теперь он же проверяет, что setup→voting и completed→voting (запуск
-- голосования и финальный раунд) может выполнить только хост, а
-- voting→completed (завершение) — любой участник комнаты (иначе закрытая
-- вкладка хоста навсегда подвешивает комнату, см. фикс в vote/page.tsx).
CREATE OR REPLACE FUNCTION enforce_room_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.host_id IS DISTINCT FROM OLD.host_id
     OR NEW.host_auth_uid IS DISTINCT FROM OLD.host_auth_uid
     OR NEW.max_movies IS DISTINCT FROM OLD.max_movies
     OR NEW.invite_code IS DISTINCT FROM OLD.invite_code
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Only room status can be updated';
  END IF;

  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  IF (OLD.status = 'setup' AND NEW.status = 'voting')
     OR (OLD.status = 'completed' AND NEW.status = 'voting') THEN
    IF OLD.host_auth_uid IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'Only the host can start voting';
    END IF;
  ELSIF NOT (OLD.status = 'voting' AND NEW.status = 'completed') THEN
    RAISE EXCEPTION 'Invalid room status transition: % -> %', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- === Participants ===

DROP POLICY IF EXISTS "Anyone can join" ON participants;
CREATE POLICY "Anyone can join" ON participants
  FOR INSERT WITH CHECK (
    auth_uid = auth.uid()
    AND EXISTS (SELECT 1 FROM rooms r WHERE r.id = room_id AND r.status = 'setup')
    AND (SELECT COUNT(*) FROM participants p WHERE p.room_id = room_id) < 10
  );

DROP POLICY IF EXISTS "Participants can update themselves" ON participants;
CREATE POLICY "Participants can update themselves" ON participants
  FOR UPDATE USING (auth_uid = auth.uid()) WITH CHECK (auth_uid = auth.uid());

-- === Movies: только хост, и только пока комната в setup/completed ===

DROP POLICY IF EXISTS "Host can add movies" ON movies;
CREATE POLICY "Host can add movies" ON movies
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM rooms r
      WHERE r.id = room_id AND r.status IN ('setup', 'completed') AND r.host_auth_uid = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Host can delete movies" ON movies;
CREATE POLICY "Host can delete movies" ON movies
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM rooms r
      WHERE r.id = room_id AND r.status IN ('setup', 'completed') AND r.host_auth_uid = auth.uid()
    )
  );

-- === Votes: только от своего participant_id, и только в voting-комнате ===

DROP POLICY IF EXISTS "Participants can insert their own votes" ON votes;
CREATE POLICY "Participants can insert their own votes" ON votes
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM rooms r WHERE r.id = room_id AND r.status = 'voting')
    AND EXISTS (
      SELECT 1 FROM participants p
      WHERE p.id = participant_id AND p.room_id = votes.room_id AND p.auth_uid = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Participants can update their own votes" ON votes;
CREATE POLICY "Participants can update their own votes" ON votes
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM rooms r WHERE r.id = room_id AND r.status = 'voting')
    AND EXISTS (
      SELECT 1 FROM participants p
      WHERE p.id = participant_id AND p.room_id = votes.room_id AND p.auth_uid = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM rooms r WHERE r.id = room_id AND r.status = 'voting')
    AND EXISTS (
      SELECT 1 FROM participants p
      WHERE p.id = participant_id AND p.room_id = votes.room_id AND p.auth_uid = auth.uid()
    )
  );
