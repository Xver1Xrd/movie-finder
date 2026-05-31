<picture>
  <source
    srcset="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white"
    media="(prefers-color-scheme: dark)"
  />
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white" />
</picture>
![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)
![TMDB](https://img.shields.io/badge/TMDB-01D277?style=for-the-badge&logo=themoviedatabase&logoColor=white)

---

# 🎬 Movie Finder

**Свайпай фильмы и выбирай идеальный с друзьями или один.**

Сервис для голосования за фильмы в реальном времени. Создай комнату, выбери категорию и годы, свайпай — алгоритм найдёт фильм, который понравится всем.

---

## Демо

**Live:** [movie-finder.vercel.app](https://movie-finder.vercel.app)

---

## Возможности

| | |
|---|---|
| 🎯 **Одиночный режим** | Выбери фильмы для себя без лишних шагов |
| 👥 **Мультиплеер** | До 4 игроков в комнате, голосование в реальном времени |
| 📱 **Mobile first** | Адаптивный дизайн, свайпы как в Tinder |
| 🎬 **4 категории** | Фильмы, сериалы, аниме, мультфильмы |
| 🎭 **Фильтр по жанрам** | Выбери конкретные жанры для подборки |
| 📅 **Диапазон лет** | От 1960 до 2026 с двумя ползунками |
| 🌐 **Русский язык** | Полностью на русском: интерфейс, описания, жанры |
| 🔄 **Real-time** | Голосования и статусы участников обновляются мгновенно |

---

## Стек

**Frontend**
- [Next.js 14](https://nextjs.org/) (App Router)
- [Tailwind CSS](https://tailwindcss.com/)
- TypeScript

**Backend**
- [Supabase](https://supabase.com/) (Postgres + Realtime)
- Row Level Security

**Источники данных**
- [TMDB](https://www.themoviedb.org/) — фильмы, сериалы, мультфильмы
- [Jikan API](https://jikan.moe/) — аниме (MyAnimeList)

**Инфраструктура**
- [Vercel](https://vercel.com/) — хостинг
- GitHub — репозиторий

---

## Быстрый старт

```bash
git clone https://github.com/Xver1Xrd/movie-finder
cd movie-finder
npm install
```

Создай `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xwehasctbtcvximgemdq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=твой-ключ
NEXT_PUBLIC_TMDB_API_KEY=твой-ключ
```

Запусти:

```bash
npm run dev
```

Открой [http://localhost:3000](http://localhost:3000).

---

## Как пользоваться

**Один**
1. Введи имя
2. Нажми «Один»
3. Выбери категорию, жанры, годы
4. Нажми «Начать» — и свайпай

**В компании**
1. Нажми «Создать комнату»
2. Отправь код друзьям
3. Когда все нажали «Нажми, когда готов» — игра начинается
4. После голосования — результаты с общим рейтингом

**Голосование**
| Действие | Результат |
|----------|-----------|
| Свайп вправо | Хочу |
| Свайп влево | Нет |
| Свайп вверх | Смотрел |
| Кнопка 🍕 | Пицца (мем) |

---

## Архитектура

```
┌─────────────┐     ┌──────────────┐     ┌──────────┐
│  Next.js    │────▶│   Supabase   │────▶│ Postgres │
│  (Vercel)   │◀────│  (Realtime)  │◀────│   + RLS  │
└─────────────┘     └──────────────┘     └──────────┘
       │
       ▼
┌─────────────┐
│   TMDB /    │
│ Jikan API   │
└─────────────┘
```

Вся логика на клиенте (хуки `useRoom`, `useVoting`) и в базе (RLS политики). Серверная часть не требуется — Supabase Realtime обеспечивает синхронизацию между участниками.

---

## Деплой на Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Xver1Xrd/movie-finder)

1. Нажми кнопку выше или зайди на [vercel.com/new](https://vercel.com/new)
2. Подключи GitHub-репозиторий
3. Добавь переменные окружения:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_TMDB_API_KEY`
4. Нажми **Deploy** — готово

---

## Переменные окружения

| Переменная | Обязательно | Описание |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | URL проекта Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Публичный anon-ключ Supabase |
| `NEXT_PUBLIC_TMDB_API_KEY` | ✅ | API-ключ от themoviedb.org |

---

## Команды

| Команда | Описание |
|---|---|
| `npm run dev` | Dev-сервер на :3000 |
| `npm run build` | Production сборка |
| `npm start` | Запуск собранного проекта |
| `npm run lint` | Проверка кода |

---

## Настройка Supabase

Создай таблицы в [SQL-редакторе Supabase](https://supabase.com/dashboard/project/xwehasctbtcvximgemdq/sql/new):

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

---

## Roadmap

### В разработке
- [x] Одиночный и мультиплеер режимы
- [x] 4 категории контента
- [x] Фильтрация по жанрам и годам
- [x] Аниме через Jikan API
- [x] Real-time голосование
- [x] Динамический фон на главной

### Планируется
- [ ] История комнат и результатов
- [ ] Трейлеры перед свайпом
- [ ] Интеграция с Кинопоиском
- [ ] Страница профиля со статистикой
- [ ] Турнирная сетка (16 фильмов, попарно)
- [ ] PWA (оффлайн-режим)
- [ ] Английская версия (i18n)

---

## Лицензия

MIT © [Xver1Xrd](https://github.com/Xver1Xrd)
