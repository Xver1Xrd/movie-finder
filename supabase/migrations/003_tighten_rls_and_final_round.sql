-- Migration 003: ужесточение RLS-политик + поддержка финального раунда.
-- ОБЯЗАТЕЛЬНО выполнить в SQL Editor Supabase: без неё не работает
-- финальный раунд при ничьей (вставка/удаление фильмов из завершённой комнаты).

-- === Movies: разрешаем операции и в setup, и в completed (финальный раунд) ===

DROP POLICY IF EXISTS "Host can add movies" ON movies;
CREATE POLICY "Host can add movies" ON movies
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM rooms r
      WHERE r.id = room_id AND r.status IN ('setup', 'completed')
    )
  );

DROP POLICY IF EXISTS "Host can delete movies" ON movies;
CREATE POLICY "Host can delete movies" ON movies
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM rooms r
      WHERE r.id = room_id AND r.status IN ('setup', 'completed')
    )
  );

-- === Participants: вход только пока комната в setup и не заполнена ===

DROP POLICY IF EXISTS "Anyone can join" ON participants;
CREATE POLICY "Anyone can join" ON participants
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM rooms r
      WHERE r.id = room_id AND r.status = 'setup'
    )
    AND (SELECT COUNT(*) FROM participants p WHERE p.room_id = room_id) < 10
  );

-- === Votes: голосовать можно только в активной комнате и только её участникам ===

DROP POLICY IF EXISTS "Participants can insert their own votes" ON votes;
CREATE POLICY "Participants can insert their own votes" ON votes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM rooms r
      WHERE r.id = room_id AND r.status = 'voting'
    )
    AND EXISTS (
      SELECT 1 FROM participants p
      WHERE p.id = participant_id AND p.room_id = votes.room_id
    )
  );

DROP POLICY IF EXISTS "Participants can update their own votes" ON votes;
CREATE POLICY "Participants can update their own votes" ON votes
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM rooms r
      WHERE r.id = room_id AND r.status = 'voting'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rooms r
      WHERE r.id = room_id AND r.status = 'voting'
    )
  );

-- === Rooms: запрещаем менять что-либо кроме статуса, и только по допустимым переходам ===
-- (Без аутентификации нельзя проверить «кто» меняет, но можно ограничить «что».)

CREATE OR REPLACE FUNCTION enforce_room_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Менять можно только status
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.host_id IS DISTINCT FROM OLD.host_id
     OR NEW.max_movies IS DISTINCT FROM OLD.max_movies
     OR NEW.invite_code IS DISTINCT FROM OLD.invite_code
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Only room status can be updated';
  END IF;

  -- Допустимые переходы: setup→voting, voting→completed, completed→voting (финальный раунд)
  IF NOT (
    (OLD.status = 'setup' AND NEW.status = 'voting')
    OR (OLD.status = 'voting' AND NEW.status = 'completed')
    OR (OLD.status = 'completed' AND NEW.status = 'voting')
    OR (OLD.status = NEW.status)
  ) THEN
    RAISE EXCEPTION 'Invalid room status transition: % -> %', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS room_update_guard ON rooms;
CREATE TRIGGER room_update_guard
  BEFORE UPDATE ON rooms
  FOR EACH ROW
  EXECUTE FUNCTION enforce_room_update();

