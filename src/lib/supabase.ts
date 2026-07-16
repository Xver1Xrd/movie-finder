import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Без этих двух переменных ничего в приложении не работает — падаем сразу с
// понятным сообщением вместо непрозрачного "supabaseUrl is required." из
// глубин supabase-js.
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Отсутствуют переменные окружения NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
    'Заполните .env.local (см. .env.local.example) и перезапустите приложение.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// RLS-политики (миграция 006) завязаны на auth.uid() — без анонимной сессии
// любая запись в rooms/participants/votes будет отклонена. Сессия создаётся
// один раз за браузер и переиспользуется благодаря персистентности supabase-js
// (хранится в localStorage). Требует включённого Anonymous Sign-ins в
// Supabase Dashboard → Authentication → Providers.
let authReady: Promise<string> | null = null;

export function ensureAuthSession(): Promise<string> {
  if (!authReady) {
    authReady = (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      let userId = sessionData.session?.user.id;
      if (!userId) {
        const { data, error } = await supabase.auth.signInAnonymously();
        if (error) throw error;
        userId = data.user?.id;
      }
      if (!userId) throw new Error('Не удалось создать анонимную сессию');
      return userId;
    })().catch((err) => {
      authReady = null; // не кэшируем неудачу — следующий вызов попробует снова
      throw err;
    });
  }
  return authReady;
}

