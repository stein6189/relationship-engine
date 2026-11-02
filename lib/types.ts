export type AssetClass = 'equity_etf' | 'bond_etf' | 'cash' | 'money_market' | 'single_stock' | 'pm';

export interface Holding {
  assetClass: AssetClass;
  name: string;
  valueEur: number;
  unrealisedGainRatio?: number;
}

export interface Commitment {
  fundId: string;
  commitmentEur: number;
  calledEur: number;
  navEur: number;
}

export interface CashflowEvent {
  id: string;
  fundId: string;
  date: string; // ISO
  type: 'call' | 'distribution';
  amountEur: number;
  status: 'confirmed' | 'indicative';
}

export interface TextItem {
  id: string;
  date: string;
  kind: 'app_message' | 'rm_note' | 'email';
  from: 'client' | 'rm';
  text: string;
}

export interface AppEvent {
  date: string;
  type: 'view' | 'login' | 'question';
  detail: string;
}

export interface Client {
  id: string;
  name: string;
  firstName: string;
  age: number;
  occupation: string;
  persona: boolean;
  aumEur: number;
  holdings: Holding[];
  commitments: Commitment[];
  cashflows: CashflowEvent[];
  statedInvestableEur: number;
  riskClass: number;
  horizonYears: number;
  objectives: string[];
  goal?: string;
  ytdReturn: number; // fraction
  prefersLowContact: boolean;
  lastProactiveContact: string | null;
  lastTouchpoint: string | null;
  logins30d: number;
  logins60d: number;
  loginsPrev60d: number;
  withdrawals90dEur: number;
  appEvents: AppEvent[];
  items: TextItem[];
  questionnaire: { peExperience: 'none' | 'some' | 'extensive'; knowledgeScore: number; complete: boolean };
  documents: string[];
  extraFacts?: Record<string, string | number>;
}

export type SignalType =
  | 'capital_call_gap'
  | 'distribution_upcoming'
  | 'distribution_received'
  | 'login_drop'
  | 'withdrawal'
  | 'no_contact_long'
  | 'quarterly_progress'
  | 'liquidity_need'
  | 'investment_interest'
  | 'transfer_intent'
  | 'dissatisfaction'
  | 'pm_frustration'
  | 'life_event'
  | 'factual_question'
  | 'prefers_low_contact';

export interface Signal {
  clientId: string;
  type: SignalType;
  summary: string;
  amountEur?: number;
  dueDate?: string;
  topic?: string;
  confidence: number;
  sourceIds: string[];
  quote?: string;
  origin: 'data' | 'ai';
}

export type Lane = 'rm' | 'digital' | 'none';

export interface Allocation {
  clientId: string;
  lane: Lane;
  reason: string;
  priority: number;
  riskProbability: number;
  hardTrigger: string | null;
  controlGroup: boolean;
  overflow: boolean;
  signals: Signal[];
  churnReason?: string;
}

export interface Fact {
  id: string;
  label: string;
  value: string;
}
