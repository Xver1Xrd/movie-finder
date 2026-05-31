'use client';

import { useState } from 'react';
import { CopyIcon, CheckIcon } from '@/components/Icons';

interface InviteLinkProps {
  inviteCode: string;
  roomId: string;
}

export default function InviteLink({ inviteCode }: InviteLinkProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="bg-[#12121a] rounded-2xl p-4 border border-[#1f1f2e] space-y-3">
      <p className="text-xs font-medium text-gray-500 text-center">Invite code</p>
      <div className="flex items-center gap-3">
        <div className="flex-1 bg-[#0a0a0f] rounded-xl px-4 py-3 border border-[#1f1f2e]">
          <span className="text-2xl font-mono font-bold tracking-[0.3em] text-white text-center block">
            {inviteCode}
          </span>
        </div>
        <button
          onClick={copy}
          className="flex-shrink-0 w-12 h-12 rounded-xl bg-pink-600 flex items-center justify-center transition-all active:scale-95"
        >
          {copied ? <CheckIcon className="w-5 h-5 text-white" /> : <CopyIcon className="w-5 h-5 text-white" />}
        </button>
      </div>
    </div>
  );
}
