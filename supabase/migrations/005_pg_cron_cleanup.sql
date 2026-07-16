-- Migration 005: автоочистка старых комнат.
-- Комнаты и голоса никогда не удалялись — база растёт бесконечно.
-- Включаем pg_cron и раз в сутки удаляем комнаты старше 30 дней;
-- participants/movies/votes уходят каскадом по FK ON DELETE CASCADE.

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

SELECT cron.schedule(
  'movietier-cleanup-old-rooms',
  '0 4 * * *', -- каждый день в 04:00 UTC
  $$ DELETE FROM public.rooms WHERE created_at < NOW() - INTERVAL '30 days'; $$
);

-- Примечание: pg_cron доступен только на платных планах Supabase и должен быть
-- включён в Database → Extensions перед выполнением этой миграции. На бесплатном
-- плане замените на внешний cron (например, GitHub Actions по расписанию),
-- вызывающий `DELETE FROM rooms WHERE created_at < NOW() - INTERVAL '30 days'`.
