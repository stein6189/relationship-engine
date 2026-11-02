import { clients } from './data';
import { daysBetween } from './rules/format';
import { SIM_TODAY } from './rules/config';

export const STAGES = ['Conversation held', 'Qualified', 'Documents', 'Signed', 'Funded'] as const;
export type Stage = (typeof STAGES)[number];

export interface Opportunity { clientId: string; product: string; amountEur: number; stage: Stage; stageSince: string; enteredConversation: string }

// Synthetic open opportunities in this book (deterministic: picked from the generated private markets clients).
const pmIds = clients.filter((c) => !c.persona && c.commitments.length > 0).slice(10, 18).map((c) => c.id);
const SEEDED: Omit<Opportunity, 'clientId'>[] = [
  { product: 'Meridian Buyout V', amountEur: 250000, stage: 'Conversation held', stageSince: '2026-10-28', enteredConversation: '2026-10-28' },
  { product: 'Meridian Buyout V', amountEur: 200000, stage: 'Qualified', stageSince: '2026-10-20', enteredConversation: '2026-10-09' },
  { product: 'Harbor Infrastructure II', amountEur: 300000, stage: 'Documents', stageSince: '2026-10-22', enteredConversation: '2026-09-30' },
  { product: 'Evergreen ELTIF', amountEur: 100000, stage: 'Documents', stageSince: '2026-10-30', enteredConversation: '2026-10-12' },
  { product: 'Meridian Buyout V', amountEur: 400000, stage: 'Signed', stageSince: '2026-10-25', enteredConversation: '2026-09-18' },
  { product: 'Second portfolio', amountEur: 150000, stage: 'Signed', stageSince: '2026-11-02', enteredConversation: '2026-10-06' },
  { product: 'Meridian Buyout V', amountEur: 250000, stage: 'Funded', stageSince: '2026-10-15', enteredConversation: '2026-09-05' },
  { product: 'Top-up', amountEur: 60000, stage: 'Funded', stageSince: '2026-10-31', enteredConversation: '2026-10-01' },
];
export const seededPipeline: Opportunity[] = SEEDED.map((o, i) => ({ ...o, clientId: pmIds[i] }));

export function albersStage(a: { audit?: unknown; attested: boolean; ack: boolean; signed: boolean; funded: boolean }): Stage {
  // Funding happens at first close (15 Dec 2026); a transfer instruction alone does not make the commitment funded.
  if (a.signed) return 'Signed';
  if (a.attested && a.ack) return 'Documents';
  if (a.attested) return 'Qualified';
  return 'Conversation held';
}

export function avgDaysToFunded(list: Opportunity[]) {
  const funded = list.filter((o) => o.stage === 'Funded');
  if (!funded.length) return null;
  return Math.round(funded.reduce((s, o) => s + daysBetween(o.enteredConversation, o.stageSince), 0) / funded.length);
}

export const daysInStage = (o: Opportunity) => daysBetween(o.stageSince, SIM_TODAY);
