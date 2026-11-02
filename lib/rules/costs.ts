import { COSTS } from './config';

export interface CostRow {
  label: string;
  basis: string;
  pct: number | null;
  eurEarly: number | null;
  eurLate: number | null;
}

/** Ex-ante cost disclosure for Meridian Buyout V. NAV assumed = commitment for the years 6–10 illustration. */
export function exAnteCosts(commitmentEur: number) {
  const mgmt = commitmentEur * COSTS.managementFee;
  const mgmtLate = commitmentEur * COSTS.managementFeeLater;
  const admin = commitmentEur * COSTS.admin;
  const platform = commitmentEur * COSTS.platform;
  const totalEarly = mgmt + admin + platform;
  const totalLate = mgmtLate + admin + platform;
  const rows: CostRow[] = [
    { label: 'Fund management fee', basis: 'commitment (yrs 1–5), NAV (yrs 6–10)', pct: COSTS.managementFee, eurEarly: mgmt, eurLate: mgmtLate },
    { label: 'Fund admin & other', basis: 'commitment', pct: COSTS.admin, eurEarly: admin, eurLate: admin },
    { label: 'Platform fee', basis: 'commitment', pct: COSTS.platform, eurEarly: platform, eurLate: platform },
    { label: 'One-off subscription fee', basis: 'one-off', pct: COSTS.subscription, eurEarly: 0, eurLate: null },
    { label: 'Carried interest', basis: '20% of profits above 8% hurdle', pct: null, eurEarly: null, eurLate: null },
  ];
  return {
    rows,
    totalPctEarly: COSTS.managementFee + COSTS.admin + COSTS.platform,
    totalEarlyEur: totalEarly,
    totalLateEur: totalLate,
    tenYearTotalEur: 5 * totalEarly + 5 * totalLate,
    illustration: 'Illustration: at a gross return of 12% p.a., costs reduce the net return to about 9% p.a.',
  };
}
