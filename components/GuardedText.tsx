import React from 'react';
import { extractNumbers } from '@/lib/rules/numberGuard';

/** Renders text and marks every number the number guard could not find in the facts in red. */
export function GuardedText({ text, unsupported }: { text: string; unsupported: string[] }) {
  if (!unsupported.length) return <>{text}</>;
  const bad = new Set(unsupported);
  const found = extractNumbers(text).filter((n) => bad.has(n.raw));
  const parts: React.ReactNode[] = [];
  let i = 0;
  for (const n of found) {
    const start = text.indexOf(n.raw, n.index);
    if (start < i) continue;
    parts.push(text.slice(i, start));
    parts.push(<mark key={start} className="rounded bg-red-100 px-0.5 font-semibold text-red-700 ring-1 ring-red-300" title="Not found in the facts passed to the model">{n.raw}</mark>);
    i = start + n.raw.length;
  }
  parts.push(text.slice(i));
  return <>{parts}</>;
}
