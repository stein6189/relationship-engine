// All values marked ASSUMPTION are prototype settings, not LIQID facts.
export const SIM_TODAY = '2026-11-06';
export const PLAN_DATE = '2026-11-01';

export const RM_NAME = 'Jonas Weber';
export const RM_SLOTS = 20; // ASSUMPTION: case midpoint (15–25 meetings / month)
export const DIGITAL_CAP = 60; // ASSUMPTION
export const AUM_FEE = 0.0075; // ASSUMPTION: midpoint of 0.5–1.0%

export const RISK_WEIGHTS: Record<string, number> = {
  transfer_intent: 0.4,
  dissatisfaction: 0.15,
  login_drop: 0.1,
  withdrawal: 0.1,
  no_contact_long: 0.05,
  pm_frustration: 0.1,
}; // ASSUMPTION
export const RISK_CAP = 0.6;
export const SILENT_RISK_TYPES = ['login_drop', 'withdrawal', 'no_contact_long', 'dissatisfaction'];
export const CONTROL_SHARE = 0.1;
export const CONTROL_SEED = '2026-11';
export const CONTROL_MAX_AUM = 2_000_000;
export const AI_SIGNAL_MIN_CONFIDENCE = 0.6;

export const LENDING_VALUES = {
  cash: 0.9,
  money_market: 0.9,
  bond_etf: 0.8,
  equity_etf: 0.6,
  single_stock: 0.5,
  pm: 0,
} as const; // ASSUMPTION
export const LOMBARD_RATE = 0.045; // ASSUMPTION
export const LOMBARD_MIN = 25_000;
export const STRESS = { equity: -0.3, bond: -0.1 }; // ASSUMPTION
export const FLAT_TAX_RATE = 0.26375; // 25% + 5.5% solidarity surcharge, no church tax
export const EQUITY_FUND_PARTIAL_EXEMPTION = 0.3; // InvStG §20: 30% of gains on equity funds tax-free for private investors

export const QUAL = {
  minCommitment: 200_000,
  pmMaxShare: 0.2, // ASSUMPTION internal guardrail
  liquidityCover: 1.5, // ASSUMPTION
  productRiskClass: 6,
  fundTermYears: 10,
};

export const COSTS = {
  managementFee: 0.02,
  managementFeeLater: 0.015,
  admin: 0.0025,
  platform: 0.0075,
  subscription: 0,
  carry: 0.2,
  hurdle: 0.08,
}; // ASSUMPTION

export const MINUTES_SAVED = { brief: 40, documentation: 30, touchpoint: 6 }; // ASSUMPTION
