import type { Client } from './types';
import type { DemoState } from './state/store';
import { fundById } from './data';
import { eur, fmtDate } from './rules/format';
import { SIM_TODAY } from './rules/config';
import { factsFor } from './facts';
import { DATA_NOTES_ALBERS } from './notes';

export interface TimelineItem {
  id: string;
  date: string;
  kind: 'message' | 'note' | 'view' | 'event' | 'sent' | 'question' | 'request' | 'document';
  actor: 'client' | 'rm' | 'system' | 'ai';
  title: string;
  text?: string;
  seenByClient: boolean;
  seenByRm: boolean;
  /** Shown in the client app. RM notes and tracked behaviour (page views) never are. */
  clientVisible: boolean;
  upcoming?: boolean;
}

/** One relationship, one timeline: built from data + what happened in this demo session. */
export function timelineFor(c: Client, s: DemoState): TimelineItem[] {
  const out: TimelineItem[] = [];
  for (const it of c.items) {
    if (it.kind === 'rm_note') out.push({ id: it.id, date: it.date, kind: 'note', actor: 'rm', title: 'RM note', text: it.text, seenByClient: false, seenByRm: true, clientVisible: false });
    else out.push({ id: it.id, date: it.date, kind: 'message', actor: it.from === 'client' ? 'client' : 'rm', title: it.from === 'client' ? `Message from ${c.firstName}` : 'Message from Jonas', text: it.text, seenByClient: true, seenByRm: true, clientVisible: true });
  }
  c.appEvents.filter((e) => e.type === 'view').forEach((e, i) => out.push({ id: `view_${i}`, date: e.date, kind: 'view', actor: 'client', title: `Viewed “${e.detail}” in the app`, seenByClient: true, seenByRm: true, clientVisible: false }));
  for (const e of c.cashflows) {
    const f = fundById(e.fundId);
    const future = e.date > SIM_TODAY;
    if (future && e.date > '2027-03-31') continue;
    out.push({
      id: e.id, date: e.date, kind: 'event', actor: 'system', upcoming: future,
      title: `${e.type === 'call' ? 'Capital call' : 'Distribution'} · ${f?.name ?? e.fundId}`,
      text: `${eur(e.amountEur)}${e.status === 'indicative' ? ' (indicative)' : ''}${future ? ` · due ${fmtDate(e.date)}` : ''}`,
      seenByClient: true, seenByRm: true, clientVisible: true,
    });
  }
  if (c.lastProactiveContact) out.push({ id: 'last_contact', date: c.lastProactiveContact, kind: 'event', actor: 'rm', title: 'Last proactive RM conversation', seenByClient: true, seenByRm: true, clientVisible: true });
  if (c.id === 'albers') out.push({ id: 'notes', date: '2026-11-05', kind: 'note', actor: 'rm', title: 'Advisory meeting notes', text: DATA_NOTES_ALBERS.split('\n').slice(1).join(' '), seenByClient: false, seenByRm: true, clientVisible: false });
  for (const m of s.inbox[c.id] ?? []) out.push({ id: m.id, date: m.date, kind: m.kind === 'document' ? 'document' : 'sent', actor: 'rm', title: m.kind === 'document' ? `Document: ${m.subject}` : `Sent: ${m.subject}`, text: m.body, seenByClient: true, seenByRm: true, clientVisible: true });
  for (const q of s.qa[c.id] ?? []) out.push({ id: q.id, date: SIM_TODAY, kind: 'question', actor: 'client', title: `Asked in the app: “${q.q}”`, text: q.category === 'factual' ? `Answered by AI from ${c.firstName}’s data: ${q.a}` : q.category === 'advice' ? 'Passed to Jonas with a draft answer' : 'Out of scope — redirected', seenByClient: true, seenByRm: true, clientVisible: true });
  for (const r of s.requests.filter((x) => x.clientId === c.id)) out.push({ id: r.id, date: SIM_TODAY, kind: 'request', actor: 'client', title: r.kind === 'talk' ? 'Asked to talk to Jonas' : 'Question for Jonas', text: r.text, seenByClient: true, seenByRm: true, clientVisible: false });
  return out.sort((a, b) => b.date.localeCompare(a.date));
}

/** Everything a source id in an AI output can point to. */
export function sourceMap(c: Client): Record<string, string> {
  const m: Record<string, string> = {};
  for (const it of c.items) m[it.id] = `${it.kind === 'rm_note' ? 'RM note' : 'Client message'} ${fmtDate(it.date)}: “${it.text}”`;
  for (const f of factsFor(c.id)) m[f.id] = `${f.label}: ${f.value} (computed by code)`;
  m.cashflows = 'Fund cash-flow schedule (capital calls and distributions)';
  m.questionnaire = `Knowledge & experience questionnaire: private equity experience “${c.questionnaire.peExperience}”`;
  m.notes = 'Meeting notes 5 Nov 2026 (RM)';
  m.b_need = 'Stated need: €300,000';
  return m;
}
