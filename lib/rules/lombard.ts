import type { Client } from '../types';
import { LENDING_VALUES, LOMBARD_RATE, STRESS, FLAT_TAX_RATE, AUM_FEE, LOMBARD_MIN } from './config';

const shock = (assetClass: string) =>
  assetClass === 'equity_etf' || assetClass === 'single_stock' ? STRESS.equity : assetClass === 'bond_etf' ? STRESS.bond : 0;

/** Pledgeable assets exclude the cash needed for the call itself: we lend against securities only. */
const pledgeable = (c: Client) => c.holdings.filter((h) => h.assetClass !== 'cash' && h.assetClass !== 'pm');

export function creditLine(c: Client) {
  return pledgeable(c).reduce((s, h) => s + h.valueEur * LENDING_VALUES[h.assetClass], 0);
}

export function stressedCreditLine(c: Client) {
  return pledgeable(c).reduce((s, h) => s + h.valueEur * (1 + shock(h.assetClass)) * LENDING_VALUES[h.assetClass], 0);
}

export function interestCost(loanEur: number, months: number, rate = LOMBARD_RATE) {
  return (loanEur * rate * months) / 12;
}

export function bridgeOption(c: Client, loanEur: number, months: number) {
  const line = creditLine(c);
  const stressed = stressedCreditLine(c);
  return {
    eligible: loanEur >= LOMBARD_MIN && loanEur <= line,
    creditLineEur: line,
    stressedLineEur: stressed,
    coveredUnderStress: loanEur <= stressed,
    topUpEur: Math.max(0, loanEur - stressed),
    interestEur: interestCost(loanEur, months),
    rate: LOMBARD_RATE,
    months,
  };
}

export function sellOption(c: Client, amountEur: number) {
  const equity = c.holdings.find((h) => h.assetClass === 'equity_etf');
  const gainRatio = equity?.unrealisedGainRatio ?? 0;
  const realisedGain = amountEur * gainRatio;
  return {
    realisedGainEur: realisedGain,
    taxEur: realisedGain * FLAT_TAX_RATE,
    aumChangeEur: -amountEur,
    feeLostPaEur: amountEur * AUM_FEE,
  };
}

export function transferOption(amountEur: number) {
  return { costEur: 0, aumChangeEur: amountEur, feeGainPaEur: amountEur * AUM_FEE };
}
