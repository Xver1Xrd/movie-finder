-- Migration 009: rate limit для /api/tmdb на общем сторе вместо памяти процесса.
-- In-memory Map в route.ts не защищает от нагрузки на serverless-платформах —
-- у каждого холодного старта/региона свой процесс со своей картой. Считаем
-- запросы в Postgres, который у нас уже есть, через SECURITY DEFINER функцию:
-- сама таблица недоступна анонимному ключу напрямую, только через неё.

CREATE TABLE IF NOT EXISTS api_rate_limits (
  key TEXT PRIMARY KEY,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  request_count INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE api_rate_limits ENABLE ROW LEVEL SECURITY;
-- Политик намеренно нет: доступ только через check_and_increment_rate_limit().

CREATE OR REPLACE FUNCTION check_and_increment_rate_limit(
  p_key TEXT,
  p_window_seconds INTEGER,
  p_max_requests INTEGER
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count INTEGER;
BEGIN
  INSERT INTO api_rate_limits (key, window_start, request_count)
  VALUES (p_key, NOW(), 1)
  ON CONFLICT (key) DO UPDATE SET
    request_count = CASE
      WHEN api_rate_limits.window_start < NOW() - (p_window_seconds || ' seconds')::INTERVAL
        THEN 1
      ELSE api_rate_limits.request_count + 1
    END,
    window_start = CASE
      WHEN api_rate_limits.window_start < NOW() - (p_window_seconds || ' seconds')::INTERVAL
        THEN NOW()
      ELSE api_rate_limits.window_start
    END
  RETURNING request_count INTO current_count;

  RETURN current_count <= p_max_requests;
END;
$$;

GRANT EXECUTE ON FUNCTION check_and_increment_rate_limit(TEXT, INTEGER, INTEGER) TO anon, authenticated;

-- Иначе таблица растёт на каждый уникальный IP навсегда
SELECT cron.schedule(
  'movietier-cleanup-rate-limits',
  '0 * * * *', -- раз в час
  $$ DELETE FROM api_rate_limits WHERE window_start < NOW() - INTERVAL '1 hour'; $$
);
