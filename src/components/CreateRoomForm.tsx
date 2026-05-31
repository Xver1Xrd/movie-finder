'use client';

import { useState } from 'react';
import { UserIcon } from '@/components/Icons';

interface CreateRoomFormProps {
  onCreate: (name: string, maxMovies: number) => Promise<void>;
  loading: boolean;
}

export default function CreateRoomForm({ onCreate, loading }: CreateRoomFormProps) {
  const [name, setName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await onCreate(name.trim(), 80);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="relative">
        <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          required maxLength={30}
          className="w-full pl-11 pr-5 py-3.5 bg-[#12121a] border border-[#1f1f2e] rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-pink-500/50 transition-colors text-sm"
        />
      </div>
      <button type="submit" disabled={loading || !name.trim()}
        className="w-full py-3.5 bg-pink-600 disabled:opacity-40 text-white font-semibold rounded-xl transition-all active:scale-[0.98] text-sm">
        {loading ? 'Creating...' : 'Create Room'}
      </button>
    </form>
  );
}
