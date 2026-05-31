# MovieTier

Свайпай фильмы и выбирай идеальный с друзьями или один.

## Запуск

```bash
npm install
npm run dev
```

Открой http://localhost:3000.

## Команды

| Команда | Описание |
|---------|----------|
| `npm run dev` | Запустить dev-сервер |
| `npm run build` | Собрать проект |
| `npm start` | Запустить собранный проект |
| `npm run lint` | Проверить код |

## Как пользоваться

- **Один** — пройди один: выбери категорию, жанры, годы, нажми «Начать»
- **Создать комнату** — создай комнату, поделись кодом с друзьями
- **Присоединиться** — введи код приглашения, чтобы присоединиться
- Все игроки нажимают «Нажми, когда готов» -> игра начинается
- Свайп **вправо** => Хочу, **влево** => Нет, **вверх** => Смотрел
- Кнопка **Пицца** для мемных/странных фильмов

## Категории

- **Фильмы** — TMDB Discover (movie)
- **Сериалы** — TMDB Discover (TV)
- **Аниме** — Jikan API (MyAnimeList), с фильтрацией по жанрам и годам
- **Мультфильмы** — TMDB Discover (movie) с жанром Animation

## Деплой

### GitHub

```bash
git init
git add .
git commit -m "init"
git remote add origin https://github.com/твой-username/movietier.git
git push -u origin main
```

### Vercel

1. Зальй репозиторий на GitHub
2. Зайди на https://vercel.com/new
3. Подключи GitHub-репозиторий
4. Добавь переменные окружения:
   - `NEXT_PUBLIC_SUPABASE_URL` — URL из Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Anon key из Supabase
   - `NEXT_PUBLIC_TMDB_API_KEY` — API ключ из https://www.themoviedb.org/settings/api
5. Нажми Deploy — всё, проект работает

Vercel сам определит Next.js и запустит сборку.

### Переменные окружения

Создай `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xwehasctbtcvximgemdq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=твой-ключ
NEXT_PUBLIC_TMDB_API_KEY=твой-ключ
```

## Нужен ли Go?

**Нет, текущая архитектура оптимальна.**

Проект построен на Next.js (App Router) + Supabase:

- **Next.js** — server components + client components. Вся бизнес-логика на клиенте (hooks: `useRoom`, `useVoting`) и в базе (RLS политики, realtime).
- **Supabase** — Postgres, realtime, авторизация (пока не используется).
- **Голосование** — использует Supabase Realtime: когда кто-то голосует, все участники видят это в реальном времени.

Переписывать на Go имело бы смысл, если бы:
1. Появилась сложная серверная логика (матчинг, очереди, WebSocket-комнаты)
2. Нужна была высокая нагрузка (1000+ одновременных комнат)
3. Появились фоновые задачи (обработка изображений, парсинг)

Для MVP и даже продакшена с десятками пользователей текущая архитектура **избыточна и не требует Go**. Если в будущем понадобится микросервис — его можно дописать на Go и подключить как API-route в Next.js.

## Идеи для развития

### Средний приоритет
- [ ] **История комнат** — сохранять результаты, показывать прошлые сессии
- [ ] **Профили пользователей** — регистрация, аватарки, статистика
- [ ] **Трейлеры** — показывать трейлер перед свайпом (уже есть TMDB endpoint)
- [ ] **Стриминговые платформы** — показывать где можно посмотреть (Кинопоиск, Okko, и т.д.)

### Высокий приоритет
- [ ] **Дополнительные источники** — Кинопоиск API, AniLibria для аниме
- [ ] **Режим «Своя подборка»** — вставить ссылку на список фильмов (Кинопоиск, MAL, IMDb)
- [ ] **Мобильное приложение** — обернуть в Expo/React Native
- [ ] **Турнирная сетка** — 16 фильмов, попарное голосование

### Архитектурные
- [ ] **SSR для страницы результатов** — результаты можно рендерить на сервере (уже готово, калькулятор в `scoring.ts`)
- [ ] **Кэширование TMDB** — подумать про Redis или кэш в Supabase, чтобы не дёргать TMDB каждый раз
- [ ] **Многоязычность** — i18n для англ/рус

## Технологии

- **Frontend:** Next.js 14 (App Router), Tailwind CSS
- **База:** Supabase (Postgres + Realtime)
- **API фильмов:** TMDB + Jikan (MyAnimeList)
- **Деплой:** Vercel (frontend + API routes), Supabase (база)

## Настройка базы данных Supabase

Перед первым запуском создай таблицы в Supabase:

1. Открой https://supabase.com/dashboard/project/xwehasctbtcvximgemdq/sql/new
2. Вставь и выполни этот SQL:

```sql
DROP TABLE IF EXISTS votes CASCADE;
DROP TABLE IF EXISTS movies CASCADE;
DROP TABLE IF EXISTS participants CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;

CREATE TABLE rooms (
  id TEXT PRIMARY KEY,
  host_id TEXT NOT NULL,
  max_movies INTEGER NOT NULL DEFAULT 80 CHECK (max_movies >= 1 AND max_movies <= 80),
  status TEXT NOT NULL DEFAULT 'setup' CHECK (status IN ('setup', 'voting', 'completed')),
  invite_code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rooms_invite_code ON rooms(invite_code);
CREATE INDEX idx_rooms_status ON rooms(status);

CREATE TABLE participants (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_host BOOLEAN NOT NULL DEFAULT FALSE,
  is_ready BOOLEAN NOT NULL DEFAULT FALSE,
  current_movie_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_participants_room_id ON participants(room_id);

CREATE TABLE movies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  tmdb_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  year INTEGER NOT NULL,
  poster_url TEXT NOT NULL,
  rating REAL NOT NULL DEFAULT 0,
  genres TEXT[] NOT NULL DEFAULT '{}',
  overview TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  trailer_url TEXT,
  streaming_platforms TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_movies_room_id ON movies(room_id);
CREATE INDEX idx_movies_sort_order ON movies(room_id, sort_order);

CREATE TABLE votes (
  id TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  movie_id UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('want', 'dont_mind', 'pizza', 'seen')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(participant_id, movie_id)
);

CREATE INDEX idx_votes_room_id ON votes(room_id);
CREATE INDEX idx_votes_participant_id ON votes(participant_id);
CREATE INDEX idx_votes_movie_id ON votes(movie_id);

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active rooms" ON rooms FOR SELECT USING (true);
CREATE POLICY "Anyone can create rooms" ON rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "Host can update their room" ON rooms FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can read participants" ON participants FOR SELECT USING (true);
CREATE POLICY "Anyone can join" ON participants FOR INSERT WITH CHECK (true);
CREATE POLICY "Participants can update themselves" ON participants FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can read movies" ON movies FOR SELECT USING (true);
CREATE POLICY "Host can add movies" ON movies FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM rooms r WHERE r.id = room_id AND r.status = 'setup'));
CREATE POLICY "Host can delete movies" ON movies FOR DELETE USING (EXISTS (SELECT 1 FROM rooms r WHERE r.id = room_id AND r.status = 'setup'));
CREATE POLICY "Participants can read votes in their room" ON votes FOR SELECT USING (true);
CREATE POLICY "Participants can insert their own votes" ON votes FOR INSERT WITH CHECK (true);
CREATE POLICY "Participants can update their own votes" ON votes FOR UPDATE USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE participants;
ALTER PUBLICATION supabase_realtime ADD TABLE movies;
ALTER PUBLICATION supabase_realtime ADD TABLE votes;
```
