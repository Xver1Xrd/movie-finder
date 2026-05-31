# MovieTier

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=nextdotjs)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18-blue?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?logo=supabase)](https://supabase.com/)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-black?logo=vercel)](https://vercel.com/)
[![TMDB](https://img.shields.io/badge/TMDB-API-01b4e4?logo=themoviedatabase)](https://www.themoviedb.org/)
[![Jikan](https://img.shields.io/badge/Jikan-API-f5c518?logo=aniDB)](https://jikan.moe/)

**[Демо на Vercel](https://movie-finder-gules-nine.vercel.app/)**

Совместный выбор фильмов с друзьями — swipe-style тир-лист, где каждый участник голосует, а результат показывает общий рейтинг.

---

## Возможности

- **Соло-режим** — голосуй за фильмы в одиночку
- **Мультиплеер-комнаты** — создавай комнату, приглашай друзей по ссылке
- **Темы контента**: фильмы, сериалы, аниме, мультфильмы
- **Диапазон лет** и **жанры** — настраивается ведущим
- **4 типа голоса**:
  - `want` — 2.0 балла
  - `dont_mind` — 1.0 балл
  - `seen` — 0.5 балла
  - `pizza` — 0.0 баллов
- **Результаты в реальном времени** — тир-лист по итогам голосования
- **Realtime** — обновления через Supabase без перезагрузки
- **RLS** — защита на уровне базы данных

---

## Технологии

| Слой | Технологии |
|------|-----------|
| Frontend | Next.js 14, React 18, TypeScript |
| Стили | Tailwind CSS 3.4 |
| Backend | Supabase (Postgres + Realtime + RLS) |
| API | TMDB, Jikan (MyAnimeList) |
| Деплой | Vercel |

---

## Архитектура

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Next.js    │────▶│   Supabase   │────▶│   Postgres   │
│   (Vercel)   │◀────│  (Realtime)  │◀────│   + RLS      │
└──────────────┘     └──────────────┘     └──────────────┘
        │
        ▼
┌──────────────┐
│   TMDB /     │
│ Jikan API    │
└──────────────┘
```

---

## Интеграции

- **[TMDB](https://developer.themoviedb.org/)** — фильмы и сериалы, постеры, жанры
- **[Jikan API](https://docs.api.jikan.moe/)** — аниме и жанры
- **[Supabase](https://supabase.com/)** — авторизация, комнаты, голоса, realtime подписки

---

## Структура проекта

```
├── src/
│   ├── app/              # App Router (pages, layout, globals)
│   │   └── room/
│   │       └── [roomId]/
│   │           ├── page.tsx      # Lobby
│   │           ├── vote/page.tsx # Голосование
│   │           └── results/      # Результаты
│   ├── components/       # UI-компоненты
│   │   ├── CreateRoomForm.tsx
│   │   ├── MovieCard.tsx
│   │   ├── VoteButtons.tsx
│   │   ├── ResultsPanel.tsx
│   │   └── ...
│   ├── hooks/            # useRoom, useVoting
│   ├── lib/              # TMDB, Jikan, Supabase, scoring
│   └── types/            # TypeScript типы
├── supabase/
│   ├── migrations/
│   │   └── 001_schema.sql
│   └── functions/
│       └── calculate-results/
└── package.json
```
