// Личность игрока хранится в localStorage по комнате — переживает закрытие вкладки,
// поэтому в комнату можно вернуться по ссылке.

export interface RoomIdentity {
  participantId: string;
  name: string;
  isHost: boolean;
  mode: 'solo' | 'multi';
}

const keyFor = (roomId: string) => `mt_room_${roomId}`;

export function saveRoomIdentity(roomId: string, identity: RoomIdentity): void {
  try {
    localStorage.setItem(keyFor(roomId), JSON.stringify(identity));
  } catch {}
}

export function getRoomIdentity(roomId: string): RoomIdentity | null {
  try {
    const raw = localStorage.getItem(keyFor(roomId));
    if (raw) return JSON.parse(raw) as RoomIdentity;
  } catch {}
  // Совместимость со старыми сессиями, начатыми до перехода на localStorage
  const pid = sessionStorage.getItem('participant_id');
  if (!pid) return null;
  return {
    participantId: pid,
    name: sessionStorage.getItem('participant_name') || '',
    isHost: sessionStorage.getItem('is_host') === 'true',
    mode: sessionStorage.getItem('game_mode') === 'solo' ? 'solo' : 'multi',
  };
}
