-- Migration 004: атомарный запуск финального раунда.
-- Раньше startFinalRound делал 3 отдельных запроса (insert финалистов → delete
-- старых фильмов → update статуса комнаты) с клиента: сбой между шагами мог
-- оставить комнату с задвоенным списком фильмов или без статуса «voting».
-- Функция оборачивает всё в одну транзакцию Postgres.

CREATE OR REPLACE FUNCTION start_final_round(p_room_id TEXT, p_finalists JSONB)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  old_movie_ids UUID[];
BEGIN
  IF jsonb_array_length(p_finalists) < 2 THEN
    RAISE EXCEPTION 'start_final_round requires at least 2 finalists';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM rooms WHERE id = p_room_id AND status = 'completed') THEN
    RAISE EXCEPTION 'Final round can only start from a completed room';
  END IF;

  SELECT array_agg(id) INTO old_movie_ids FROM movies WHERE room_id = p_room_id;

  INSERT INTO movies (room_id, tmdb_id, title, year, poster_url, rating, genres, overview, sort_order)
  SELECT
    p_room_id,
    (elem->>'tmdb_id')::INTEGER,
    elem->>'title',
    (elem->>'year')::INTEGER,
    elem->>'poster_url',
    COALESCE((elem->>'rating')::REAL, 0),
    ARRAY(SELECT jsonb_array_elements_text(elem->'genres')),
    COALESCE(elem->>'overview', ''),
    (ord - 1)::INTEGER
  FROM jsonb_array_elements(p_finalists) WITH ORDINALITY AS t(elem, ord);

  IF old_movie_ids IS NOT NULL THEN
    DELETE FROM movies WHERE id = ANY(old_movie_ids);
  END IF;

  UPDATE rooms SET status = 'voting' WHERE id = p_room_id;
END;
$$;

-- SECURITY INVOKER (по умолчанию) — функция выполняется с правами вызывающей роли,
-- поэтому все существующие RLS-политики (и будущие, завязанные на auth.uid())
-- продолжают применяться к каждому шагу внутри неё.

GRANT EXECUTE ON FUNCTION start_final_round(TEXT, JSONB) TO anon, authenticated;
