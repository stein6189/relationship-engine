import type { Client } from '../types';
import { freeCash } from './liquidity';
import { eur, fmtDate } from './format';

export interface DataConflict { field: string; crm: string; custodian: string; used: 'custodian'; action: string }

/** CRM vs custodian: the custodian (portfolio data) is the source of truth for money; a different CRM value is flagged, never used. */
export function dataConflicts(c: Client): DataConflict[] {
  const out: DataConflict[] = [];
  if (c.crmRecord && c.crmRecord.cashEur !== freeCash(c)) {
    out.push({
      field: 'Free cash', crm: `${eur(c.crmRecord.cashEur)} (updated ${fmtDate(c.crmRecord.updatedAt)})`, custodian: eur(freeCash(c)), used: 'custodian',
      action: 'The engine uses the custodian value. Update the CRM record.',
    });
  }
  return out;
}

/** Code checks what the AI read from a fund document against the cash-flow schedule. */
export function checkNotice(c: Client, read: { amountEur: number; dueDate: string }) {
  const call = c.cashflows.find((e) => e.type === 'call' && e.date === read.dueDate);
  return {
    scheduled: call ? { amountEur: call.amountEur, date: call.date } : null,
    amountMatches: !!call && call.amountEur === read.amountEur,
    dateMatches: !!call,
  };
}
