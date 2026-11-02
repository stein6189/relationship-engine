import type { SignalType } from './types';

export const SIGNAL_LABEL: Record<SignalType, string> = {
  capital_call_gap: 'Capital call gap',
  distribution_upcoming: 'Distribution coming',
  distribution_received: 'Distribution received',
  login_drop: 'App use dropped',
  withdrawal: 'Withdrawal',
  no_contact_long: 'Long silence',
  quarterly_progress: 'Quarterly update due',
  liquidity_need: 'Liquidity need',
  investment_interest: 'Investment interest',
  transfer_intent: 'Transfer intent',
  dissatisfaction: 'Dissatisfied',
  pm_frustration: 'Private markets worry',
  life_event: 'Life event',
  factual_question: 'Open question',
  prefers_low_contact: 'Prefers low contact',
};

export const SIGNAL_TONE: Partial<Record<SignalType, 'red' | 'amber' | 'teal' | 'blue' | 'slate'>> = {
  capital_call_gap: 'amber', liquidity_need: 'amber', transfer_intent: 'red', dissatisfaction: 'red', withdrawal: 'red', login_drop: 'red',
  investment_interest: 'teal', distribution_upcoming: 'teal', distribution_received: 'teal', life_event: 'blue', pm_frustration: 'amber',
};

export const TRIGGER_LABEL: Record<string, string> = {
  transfer_intent: 'Hard trigger: transfer intent', liquidity_need: 'Hard trigger: liquidity need ≥ €100k',
  capital_call_gap: 'Hard trigger: capital call gap', pm_interest: 'Hard trigger: private markets interest, likely eligible',
};
