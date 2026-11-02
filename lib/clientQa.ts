/** Suggested questions in the client app and the cache key each maps to (cached mode / fallback). */
export const SUGGESTED: Record<string, { q: string; key: string }[]> = {
  keller: [
    { q: 'When is the next capital call and how much?', key: 'keller_next_call' },
    { q: 'Why is Atlas Growth negative?', key: 'keller_negative' },
    { q: 'Should I sell ETFs to pay the call?', key: 'keller_sell' },
  ],
  albers: [
    { q: 'What happens if I need the money earlier?', key: 'albers_early' },
  ],
};

export function cacheKeyFor(clientId: string, q: string): string {
  const t = q.toLowerCase();
  const exact = SUGGESTED[clientId]?.find((s) => s.q.toLowerCase() === t);
  if (exact) return exact.key;
  if (clientId === 'keller') {
    if (/\b(sell|borrow|loan|should i|invest|reinvest)\b/.test(t)) return 'keller_sell';
    if (/(negative|loss|minus|down|j-curve|why is atlas)/.test(t)) return 'keller_negative';
    if (/(capital call|next call|how much|when)/.test(t)) return 'keller_next_call';
  }
  if (clientId === 'albers' && /(earlier|early|need the money|get my money|lock)/.test(t)) return 'albers_early';
  return `${clientId}_other`;
}

export const ADVICE_REPLY = "That's a decision about your investments, so I've passed it to Jonas. He'll get back to you shortly.";
