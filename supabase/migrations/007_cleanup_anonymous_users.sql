-- Migration 007: очистка старых анонимных auth-пользователей.
-- Миграция 006 завела signInAnonymously() на каждого посетителя — каждый такой
-- визит создаёт постоянную строку в auth.users. Без очистки эта таблица растёт
-- так же неограниченно, как раньше росли rooms (см. миграцию 005).

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

SELECT cron.schedule(
  'movietier-cleanup-anonymous-users',
  '30 4 * * *', -- каждый день в 04:30 UTC, через полчаса после чистки комнат
  $$ DELETE FROM auth.users WHERE is_anonymous = true AND created_at < NOW() - INTERVAL '30 days'; $$
);

-- Как и pg_cron в миграции 005, требует платного плана Supabase.
-- На бесплатном плане чистить auth.users нужно внешним cron через service-role ключ.
