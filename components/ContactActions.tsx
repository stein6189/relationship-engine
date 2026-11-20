'use client';
import { useState } from 'react';
import clsx from 'clsx';

const ACTIONS: [string, string, string][] = [
  ['call', 'Call', 'would start a call from the RM\'s phone system and log it in the CRM'],
  ['meeting', 'Book meeting', 'would open the RM\'s calendar with free slots and send an invite'],
  ['link', 'Send booking link', 'would send the client a link to pick a time in the app'],
  ['message', 'Message', 'would open a message to the client, with an optional AI draft for the RM to edit'],
  ['note', 'Add note', 'would add a note to the CRM record'],
];

/** Placeholder actions for RM outreach. Prototype only: nothing is sent or booked. */
export function ContactActions({ name, compact }: { name: string; compact?: boolean }) {
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="mt-2" data-testid="contact-actions">
      <div className="flex flex-wrap gap-1">
        {ACTIONS.map(([id, label, what]) => (
          <button key={id} onClick={() => setMsg(`Prototype: “${label}” ${what} for ${name}.`)}
            className={clsx('rounded-md border border-slate-300 bg-white font-medium text-slate-700 hover:border-accent hover:text-accent', compact ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs')}
            data-testid={`action-${id}`}>{label}</button>
        ))}
      </div>
      {msg && <div className="mt-1 flex items-start justify-between gap-2 rounded-md bg-slate-50 px-2 py-1 text-[11px] text-slate-600" role="status">{msg}<button className="text-slate-400 hover:text-slate-600" onClick={() => setMsg(null)} aria-label="Close">✕</button></div>}
    </div>
  );
}
