import type { DemoState } from './state/store';
import { fundById } from './data';
import { ALBERS_COMMITMENT } from './facts';
import { eur, fmtDate } from './rules/format';

export type StepState = 'done' | 'open' | 'locked';
export interface Step { n: number; title: string; who: string; state: StepState; detail: string }

const mbo5 = () => fundById('mbo5')!;
export const firstCallEur = () => ALBERS_COMMITMENT * (mbo5().firstCallPct ?? 0.2);
export const firstClose = () => mbo5().firstClose!;

/** The MiFID II order: qualification (RM) → suitability + costs acknowledged (client) → documents → e-signature → funding. */
export function subscriptionSteps(a: DemoState['albers']): Step[] {
  const qual = a.attested;
  const delivered = !!a.audit;
  const docsReady = qual && a.ack;
  return [
    { n: 1, title: 'Investor qualification', who: 'Rules + AI check + RM attestation', state: qual ? 'done' : 'open', detail: qual ? 'Rules passed · contradiction reviewed · RM attested' : 'Only the RM can complete this step' },
    { n: 2, title: 'Suitability statement + cost disclosure', who: 'RM sends · client reads', state: a.ack ? 'done' : delivered ? 'open' : 'locked', detail: a.ack ? 'Client confirmed “I have read and understood”' : delivered ? 'Delivered to the app · waiting for the client' : 'Waiting for RM approval of the documentation' },
    { n: 3, title: 'Subscription documents', who: 'Pre-filled from client data', state: docsReady ? 'done' : 'locked', detail: docsReady ? 'Pre-filled and ready to sign' : 'Prepared once steps 1–2 are done' },
    { n: 4, title: 'E-signature', who: 'Client in the app', state: a.signed ? 'done' : docsReady ? 'open' : 'locked', detail: a.signed ? 'Signed' : docsReady ? 'Ready to sign in the app' : 'Locked until steps 1–3 are done' },
    { n: 5, title: 'Funding', who: 'Client transfers first call', state: a.funded ? 'done' : a.signed ? 'open' : 'locked', detail: `First capital call ${eur(firstCallEur())} at first close on ${fmtDate(firstClose())}${a.funded ? ' · transfer instructed' : ''}` },
  ];
}

export function prefilledFields(a: { audit?: unknown; attested: boolean }) {
  return PREFILLED_FIELDS.map((f) => f.source === 'approved advice record' && !a.audit ? { ...f, value: 'pending advice approval' } : f.source === 'qualification step' && !a.attested ? { ...f, value: 'pending RM qualification' } : f);
}

export const PREFILLED_FIELDS = [
  { field: 'Full name', value: 'Claudia Albers', source: 'client record' },
  { field: 'Address', value: 'Munich (on file)', source: 'client record' },
  { field: 'Tax ID', value: '•••• •••• 4471', source: 'client record' },
  { field: 'Commitment', value: '€200,000', source: 'approved advice record' },
  { field: 'Investor category', value: 'Semi-professional investor', source: 'qualification step' },
  { field: 'Risk declaration', value: 'signed 5 Nov 2026', source: 'documents' },
  { field: 'Account for capital calls', value: 'Cash account with us', source: 'client record' },
];
