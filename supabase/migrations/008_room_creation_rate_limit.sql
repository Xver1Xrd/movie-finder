-- Migration 008: троттлинг создания комнат.
-- Раньше ничто не мешало одному браузеру создать тысячи пустых комнат за
-- секунды. С миграции 006 у каждой комнаты есть host_auth_uid — по нему и
-- ограничиваем: не больше 5 комнат от одной анонимной сессии за 10 минут.

CREATE OR REPLACE FUNCTION enforce_room_creation_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  recent_count INTEGER;
BEGIN
  IF NEW.host_auth_uid IS NOT NULL THEN
    SELECT COUNT(*) INTO recent_count
    FROM rooms
    WHERE host_auth_uid = NEW.host_auth_uid
      AND created_at > NOW() - INTERVAL '10 minutes';

    IF recent_count >= 5 THEN
      RAISE EXCEPTION 'Слишком много комнат создано недавно, подождите пару минут';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS room_creation_rate_limit ON rooms;
CREATE TRIGGER room_creation_rate_limit
  BEFORE INSERT ON rooms
  FOR EACH ROW
  EXECUTE FUNCTION enforce_room_creation_rate_limit();
