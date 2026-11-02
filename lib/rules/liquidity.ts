import type { Client, CashflowEvent } from '../types';
import { daysBetween } from './format';

export function freeCash(c: Client) {
  return c.holdings.filter((h) => h.assetClass === 'cash').reduce((s, h) => s + h.valueEur, 0);
}

export function upcoming(c: Client, today: string, days: number, type?: CashflowEvent['type']) {
  return c.cashflows
    .filter((e) => (!type || e.type === type))
    .filter((e) => {
      const d = daysBetween(today, e.date);
      return d >= 0 && d <= days;
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

export interface GapResult {
  callsEur: number;
  freeCashEur: number;
  confirmedDistributionsEur: number;
  gapEur: number;
  firstDueDate?: string;
  steps: { label: string; valueEur: number }[];
}

/** gap = Σ calls due in next 90 days − free cash − confirmed distributions before each call's due date */
export function liquidityGap(c: Client, today: string): GapResult {
  const calls = upcoming(c, today, 90, 'call');
  const callsEur = calls.reduce((s, e) => s + e.amountEur, 0);
  const lastDue = calls.length ? calls[calls.length - 1].date : today;
  const confirmed = c.cashflows
    .filter((e) => e.type === 'distribution' && e.status === 'confirmed')
    .filter((e) => daysBetween(today, e.date) >= 0 && e.date <= lastDue)
    .reduce((s, e) => s + e.amountEur, 0);
  const cash = freeCash(c);
  const gapEur = Math.max(0, callsEur - cash - confirmed);
  return {
    callsEur,
    freeCashEur: cash,
    confirmedDistributionsEur: confirmed,
    gapEur,
    firstDueDate: calls[0]?.date,
    steps: [
      { label: 'Capital calls due in the next 90 days', valueEur: callsEur },
      { label: 'minus free cash on the platform', valueEur: -cash },
      { label: 'minus confirmed distributions before the due date', valueEur: -confirmed },
      { label: 'Liquidity gap', valueEur: gapEur },
    ],
  };
}
