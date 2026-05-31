'use client';

import { useState } from 'react';
import { LinkIcon, UserIcon } from '@/components/Icons';

interface JoinRoomFormProps {
  onJoin: (inviteCode: string, name: string) => Promise<void>;
  loading: boolean;
  error: string | null;
}

export default function JoinRoomForm({ onJoin, loading, error }: JoinRoomFormProps) {
  const [inviteCode, setInviteCode] = useState('');
  const [name, setName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim() || !name.trim()) return;
    await onJoin(inviteCode.trim(), name.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="relative">
        <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
        <input
          type="text"
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
          placeholder="Invite code"
          required
          maxLength={6}
          className="w-full pl-11 pr-5 py-3.5 bg-[#12121a] border border-[#1f1f2e] rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition-colors text-sm uppercase text-center tracking-widest font-mono"
        />
      </div>
      <div className="relative">
        <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          required maxLength={30}
          className="w-full pl-11 pr-5 py-3.5 bg-[#12121a] border border-[#1f1f2e] rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition-colors text-sm"
        />
      </div>
      {error && (
        <div className="text-red-400 text-xs text-center bg-red-400/10 py-2.5 px-4 rounded-xl">{error}</div>
      )}
      <button type="submit" disabled={loading || !inviteCode.trim() || !name.trim()}
        className="w-full py-3.5 bg-pink-600 disabled:opacity-40 text-white font-semibold rounded-xl transition-all active:scale-[0.98] text-sm">
        {loading ? 'Joining...' : 'Join Room'}
      </button>
    </form>
  );
}
