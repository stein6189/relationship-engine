import type { Client } from './types';
import type { DemoState } from './state/store';
import { dataConflicts } from './rules/consistency';
import { fmtDate } from './rules/format';

export interface OpenItem { text: string; source: string }

/** Open items carried over from earlier contacts and from the current state — computed in code, shown in the brief and passed to the model. */
export function openItems(c: Client, s: DemoState): OpenItem[] {
  const out: OpenItem[] = [];
  const answered = (s.qa[c.id] ?? []).length > 0;
  if (c.id === 'albers') {
    const a = s.albers;
    if (!a.questionnaireUpdated) out.push({ text: 'Questionnaire still says “no private equity experience”; notes say angel investor. Update before qualification.', source: 'questionnaire' });
    if (!a.audit) out.push({ text: 'Suitability statement and cost disclosure from the meeting are not sent yet.', source: 'notes' });
    else if (!a.ack) out.push({ text: 'Claudia has not yet confirmed that she read the statement and the costs.', source: 'app' });
    if (a.signed && !a.funded) out.push({ text: 'Signed. First capital call of €40,000 due at first close.', source: 'app' });
  }
  if (c.id === 'keller') {
    const k = s.keller;
    const call = c.cashflows.find((e) => e.type === 'call' && e.status === 'confirmed' && e.date >= '2026-11-20');
    if (call && !k.messageApproved) out.push({ text: `Capital call due ${fmtDate(call.date)}: no option agreed yet to cover the gap.`, source: 'cashflows' });
    if (k.messageApproved && !k.clientConfirmed) out.push({ text: 'Proposal sent to Thomas; waiting for his answer.', source: 'app' });
    if (!answered) out.push({ text: 'Two questions about the Atlas Growth V loss (30 Sep, 19 Oct) have no personal answer yet.', source: 'keller_msg_2026-10-19' });
  }
  if (c.id === 'berger' && !answered) out.push({ text: 'Support question about withdrawing about €300,000 has no personal answer yet.', source: 'berger_chat_2026-10-21' });
  for (const d of dataConflicts(c)) out.push({ text: `Data check: ${d.field} differs between CRM (${d.crm}) and custodian (${d.custodian}). ${d.action}`, source: 'crm' });
  for (const r of s.requests.filter((x) => x.clientId === c.id && !x.done)) out.push({ text: `Open request from the app: “${r.text}”`, source: 'app' });
  return out;
}
