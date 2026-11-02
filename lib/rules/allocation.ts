import type { Allocation, Client, Signal } from '../types';
import {
  AI_SIGNAL_MIN_CONFIDENCE, CONTROL_MAX_AUM, CONTROL_SEED, CONTROL_SHARE, DIGITAL_CAP, RISK_CAP,
  RISK_WEIGHTS, RM_SLOTS, SILENT_RISK_TYPES,
} from './config';
import { daysBetween, eur, eurShort, fmtDate } from './format';
import { liquidityGap, upcoming } from './liquidity';

/** Signals computed from structured data — no AI involved. */
export function dataSignals(c: Client, today: string): Signal[] {
  const s: Signal[] = [];
  const gap = liquidityGap(c, today);
  if (gap.gapEur > 0) {
    s.push({ clientId: c.id, type: 'capital_call_gap', origin: 'data', confidence: 1, sourceIds: ['cashflows'],
      amountEur: gap.gapEur, dueDate: gap.firstDueDate,
      summary: `Capital call ${eur(gap.callsEur)} on ${fmtDate(gap.firstDueDate!)} · free cash ${eur(gap.freeCashEur)} → gap ${eur(gap.gapEur)}` });
  }
  for (const d of upcoming(c, today, 60, 'distribution')) {
    s.push({ clientId: c.id, type: 'distribution_upcoming', origin: 'data', confidence: d.status === 'confirmed' ? 1 : 0.7,
      sourceIds: [d.id], amountEur: d.amountEur, dueDate: d.date,
      summary: `${d.status === 'indicative' ? 'Indicative' : 'Confirmed'} distribution ${eur(d.amountEur)} on ${fmtDate(d.date)}` });
  }
  const recentDist = c.cashflows.find((e) => e.type === 'distribution' && daysBetween(e.date, today) >= 0 && daysBetween(e.date, today) <= 30);
  if (recentDist) s.push({ clientId: c.id, type: 'distribution_received', origin: 'data', confidence: 1, sourceIds: [recentDist.id],
    amountEur: recentDist.amountEur, summary: `Distribution received ${eur(recentDist.amountEur)}` });
  if (c.loginsPrev60d >= 4 && c.logins60d < 0.3 * c.loginsPrev60d)
    s.push({ clientId: c.id, type: 'login_drop', origin: 'data', confidence: 1, sourceIds: ['app_usage'], summary: `App use dropped (${c.logins60d} vs ${c.loginsPrev60d} logins)` });
  if (c.withdrawals90dEur > 0.1 * c.aumEur)
    s.push({ clientId: c.id, type: 'withdrawal', origin: 'data', confidence: 1, sourceIds: ['transactions'], amountEur: c.withdrawals90dEur, summary: `Withdrew ${eur(c.withdrawals90dEur)} in 90 days` });
  const since = c.lastProactiveContact ? daysBetween(c.lastProactiveContact, today) : 999;
  if (since > 270) s.push({ clientId: c.id, type: 'no_contact_long', origin: 'data', confidence: 1, sourceIds: ['crm'], summary: `No proactive contact for ${Math.round(since / 30)} months` });
  const sinceTouch = c.lastTouchpoint ? daysBetween(c.lastTouchpoint, today) : 999;
  if (sinceTouch > 90) s.push({ clientId: c.id, type: 'quarterly_progress', origin: 'data', confidence: 1, sourceIds: ['crm'], summary: 'Quarterly progress update due' });
  return s;
}

export function riskProbability(signals: Signal[], onlyTypes?: string[]) {
  const types = new Set(signals.filter((x) => x.origin === 'data' || x.confidence >= AI_SIGNAL_MIN_CONFIDENCE).map((x) => x.type));
  let p = 0;
  for (const t of types) if (RISK_WEIGHTS[t] && (!onlyTypes || onlyTypes.includes(t))) p += RISK_WEIGHTS[t];
  return Math.min(p, RISK_CAP);
}

const usable = (x: Signal) => x.origin === 'data' || x.confidence >= AI_SIGNAL_MIN_CONFIDENCE;

export function hardTrigger(c: Client, signals: Signal[]): string | null {
  const u = signals.filter(usable);
  if (u.some((x) => x.type === 'transfer_intent')) return 'transfer_intent';
  if (u.some((x) => x.type === 'liquidity_need' && (x.amountEur ?? 0) >= 100_000)) return 'liquidity_need';
  if (u.some((x) => x.type === 'capital_call_gap')) return 'capital_call_gap';
  if (u.some((x) => x.type === 'investment_interest' && x.topic === 'private_markets') && (c.aumEur >= 500_000 || c.statedInvestableEur >= 1_000_000))
    return 'pm_interest';
  return null;
}

export function priority(c: Client, signals: Signal[], today: string) {
  const u = signals.filter(usable);
  const opportunity = u.filter((x) => x.type === 'distribution_upcoming').reduce((s, x) => s + (x.amountEur ?? 0), 0) +
    (u.some((x) => x.type === 'investment_interest') ? Math.min(0.2 * Math.max(0, c.statedInvestableEur - c.aumEur), 500_000) : 0);
  const risk = c.aumEur * riskProbability(signals);
  const need = u.filter((x) => x.type === 'liquidity_need' || x.type === 'capital_call_gap').reduce((s, x) => s + (x.amountEur ?? 0), 0);
  const due = u.map((x) => x.dueDate).filter(Boolean).map((d) => daysBetween(today, d!)).filter((d) => d >= 0);
  const minDue = due.length ? Math.min(...due) : Infinity;
  const urgency = minDue <= 30 ? 1.5 : minDue <= 60 ? 1.2 : 1;
  return { value: (opportunity + risk + need) * urgency, opportunity, risk, need, urgency };
}

// Seeded PRNG for the control-group draw
function hashSeed(s: string) {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) { h = Math.imul(h ^ s.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  return h >>> 0;
}
export function seededRandom(seed: string) {
  let a = hashSeed(seed);
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const advisoryTypes = ['investment_interest', 'liquidity_need', 'dissatisfaction', 'transfer_intent', 'capital_call_gap', 'life_event'];
const informationalTypes = ['distribution_received', 'distribution_upcoming', 'pm_frustration', 'factual_question', 'quarterly_progress', 'no_contact_long'];

function reasonFor(c: Client, signals: Signal[], trigger: string | null) {
  const u = signals.filter(usable);
  const pick = (t: string) => u.find((x) => x.type === t);
  const order = trigger ? [trigger === 'pm_interest' ? 'investment_interest' : trigger] : [];
  for (const t of [...order, 'capital_call_gap', 'liquidity_need', 'transfer_intent', 'investment_interest', 'dissatisfaction', 'life_event',
    'distribution_upcoming', 'distribution_received', 'pm_frustration', 'factual_question', 'login_drop', 'withdrawal', 'no_contact_long', 'quarterly_progress']) {
    const s = pick(t);
    if (s) return s.summary;
  }
  return c.prefersLowContact ? 'Prefers low contact; recently in touch' : 'Recently in touch; nothing new this month';
}

export function churnHypothesis(signals: Signal[]): string | undefined {
  const t = new Set(signals.filter(usable).map((x) => x.type));
  if (t.has('transfer_intent') || t.has('dissatisfaction')) return 'better offer elsewhere';
  if (t.has('liquidity_need')) return 'liquidity need';
  if (t.has('pm_frustration')) return 'private markets frustration';
  if (t.has('no_contact_long') || t.has('login_drop')) return 'neglect';
  if (t.has('withdrawal')) return 'unknown';
  return undefined;
}

export interface PlanInput { clients: Client[]; aiSignals: Record<string, Signal[]>; today: string; overrides?: Record<string, 'rm' | 'digital' | 'none'>; escalations?: string[] }

export function allocate({ clients, aiSignals, today, overrides = {}, escalations = [] }: PlanInput): Allocation[] {
  const base = clients.map((c) => {
    const signals = [...dataSignals(c, today), ...(aiSignals[c.id] ?? [])];
    const trig = hardTrigger(c, signals);
    return { c, signals, trig, prio: priority(c, signals, today).value, risk: riskProbability(signals), silentRisk: riskProbability(signals, SILENT_RISK_TYPES) };
  });

  // Control group: silent risk only, no hard trigger, AUM ≤ €2m, never personas
  const candidates = base.filter((b) => b.silentRisk >= 0.15 && !b.trig && b.c.aumEur <= CONTROL_MAX_AUM && !b.c.persona)
    .sort((a, b) => a.c.id.localeCompare(b.c.id));
  const rnd = seededRandom(CONTROL_SEED);
  const shuffled = candidates.map((b) => ({ b, r: rnd() })).sort((x, y) => x.r - y.r).map((x) => x.b);
  const control = new Set(shuffled.slice(0, Math.ceil(candidates.length * CONTROL_SHARE)).map((b) => b.c.id));

  const result = new Map<string, Allocation>();
  const mk = (b: (typeof base)[number], lane: Allocation['lane'], extra: Partial<Allocation> = {}): Allocation => ({
    clientId: b.c.id, lane, reason: reasonFor(b.c, b.signals, b.trig), priority: b.prio, riskProbability: b.risk,
    hardTrigger: b.trig, controlGroup: control.has(b.c.id), overflow: false, signals: b.signals,
    churnReason: b.risk >= 0.15 ? churnHypothesis(b.signals) : undefined, ...extra,
  });

  const pool = base.filter((b) => !control.has(b.c.id));
  // 1. hard triggers
  const hard = pool.filter((b) => b.trig).sort((a, b) => b.prio - a.prio);
  hard.slice(0, RM_SLOTS).forEach((b) => result.set(b.c.id, mk(b, 'rm')));
  hard.slice(RM_SLOTS).forEach((b) => result.set(b.c.id, mk(b, 'digital', { overflow: true, reason: 'Overflow — RM to review: ' + reasonFor(b.c, b.signals, b.trig) })));
  // 2. remaining slots by priority where an advice need exists
  const advice = pool.filter((b) => !result.has(b.c.id) && b.signals.some((x) => usable(x) && advisoryTypes.includes(x.type)))
    .sort((a, b) => b.prio - a.prio || (a.c.lastProactiveContact ?? '').localeCompare(b.c.lastProactiveContact ?? ''));
  let rmCount = [...result.values()].filter((a) => a.lane === 'rm').length;
  for (const b of advice) { if (rmCount >= RM_SLOTS) break; result.set(b.c.id, mk(b, 'rm')); rmCount++; }
  // 3. control group → digital
  base.filter((b) => control.has(b.c.id)).forEach((b) => result.set(b.c.id, mk(b, 'digital', { reason: 'Control group — digital only (3-month test). ' + reasonFor(b.c, b.signals, null) })));
  // 2b. capacity left: annual review overdue for the largest uncovered relationships
  const reviews = pool.filter((b) => !result.has(b.c.id) && b.signals.some((x) => x.type === 'no_contact_long') && !b.c.prefersLowContact)
    .sort((a, b) => b.c.aumEur - a.c.aumEur);
  for (const b of reviews) { if (rmCount >= RM_SLOTS) break; result.set(b.c.id, mk(b, 'rm', { reason: 'Annual review overdue · ' + reasonFor(b.c, b.signals, null) })); rmCount++; }
  // 4. digital lane — tiers: escalation > advice need without RM slot > time-sensitive info > agreed quarterly update > quarterly due > long silence
  const esc = new Set(escalations);
  const has = (b: (typeof base)[number], types: string[]) => b.signals.some((x) => usable(x) && types.includes(x.type));
  const lowContact = (b: (typeof base)[number]) => b.c.prefersLowContact || has(b, ['prefers_low_contact']);
  const tier = (b: (typeof base)[number]) =>
    esc.has(b.c.id) ? 0 : has(b, advisoryTypes) ? 1 : has(b, ['distribution_received', 'distribution_upcoming', 'pm_frustration', 'factual_question']) ? 2
      : has(b, ['quarterly_progress']) && lowContact(b) ? 3 : has(b, ['quarterly_progress']) ? 4 : has(b, ['no_contact_long']) ? 5 : 9;
  const digitalCands = pool.filter((b) => !result.has(b.c.id) && tier(b) < 9)
    .sort((a, b) => tier(a) - tier(b) || b.prio - a.prio || b.c.aumEur - a.c.aumEur);
  let digitalCount = [...result.values()].filter((a) => a.lane === 'digital').length;
  for (const b of digitalCands) {
    if (digitalCount >= DIGITAL_CAP) { result.set(b.c.id, mk(b, 'none', { reason: `Over digital capacity (${DIGITAL_CAP}) — first in line next month · ` + reasonFor(b.c, b.signals, null) })); continue; }
    result.set(b.c.id, mk(b, 'digital', esc.has(b.c.id) ? { reason: 'Escalation — client asked to talk. ' + reasonFor(b.c, b.signals, null) } : {})); digitalCount++;
  }
  // 5. no action
  base.filter((b) => !result.has(b.c.id)).forEach((b) => result.set(b.c.id, mk(b, 'none')));

  // RM overrides (logged in UI state)
  for (const [id, lane] of Object.entries(overrides)) { const a = result.get(id); if (a) result.set(id, { ...a, lane }); }
  return clients.map((c) => result.get(c.id)!);
}

export function reasonShort(a: Allocation) { return a.reason; }
export const laneLabel = { rm: 'RM conversation', digital: 'Digital touchpoint', none: 'No action this month' } as const;
export { eurShort };
