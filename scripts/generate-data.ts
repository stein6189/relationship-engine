/* Deterministic synthetic data for the Relationship Engine prototype.
 * Run: npm run generate-data. Seed: "liqid-case". All data is invented. */
import fs from 'fs';
import path from 'path';
import type { Client, Holding, Commitment, CashflowEvent, TextItem, Signal } from '../lib/types';
import { seededRandom, allocate } from '../lib/rules/allocation';
import { SIM_TODAY } from '../lib/rules/config';
import { addDays } from '../lib/rules/format';

const rnd = seededRandom('liqid-case');
const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
const between = (a: number, b: number) => a + rnd() * (b - a);
const round = (n: number, to = 1000) => Math.round(n / to) * to;
const normal = () => { let u = 0, v = 0; while (u === 0) u = rnd(); while (v === 0) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

const FIRST_F = ['Anna', 'Katrin', 'Julia', 'Stefanie', 'Nicole', 'Sandra', 'Christina', 'Birgit', 'Petra', 'Laura', 'Miriam', 'Eva', 'Franziska', 'Johanna', 'Lena', 'Susanne', 'Andrea', 'Verena', 'Carolin', 'Ines'];
const FIRST_M = ['Michael', 'Thomas', 'Andreas', 'Stefan', 'Markus', 'Christian', 'Martin', 'Frank', 'Jan', 'Tobias', 'Florian', 'Sebastian', 'Alexander', 'Matthias', 'Philipp', 'Daniel', 'Oliver', 'Jens', 'Felix', 'Moritz'];
const LAST = ['Müller', 'Schmidt', 'Schneider', 'Fischer', 'Meyer', 'Wagner', 'Becker', 'Schulz', 'Koch', 'Richter', 'Klein', 'Wolf', 'Neumann', 'Schwarz', 'Zimmermann', 'Braun', 'Krüger', 'Hartmann', 'Lange', 'Werner', 'Krause', 'Lehmann', 'Köhler', 'Maier', 'Huber', 'Kaiser', 'Fuchs', 'Peters', 'Lang', 'Scholz', 'Möller', 'Weiß', 'Jung', 'Hahn', 'Vogel', 'Friedrich', 'Keller2', 'Günther', 'Frank', 'Roth'];
const OCC = ['Entrepreneur', 'Managing director', 'Physician', 'Lawyer', 'Founder after exit', 'Executive', 'Heir', 'Dentist', 'Architect', 'Tax advisor', 'Engineer', 'Partner at a consultancy'];

const FUNDS = [
  { id: 'mbo4', name: 'Meridian Buyout IV', type: 'AIF · buyout', vintage: 2021, status: 'harvesting', minCommitment: 200000, termYears: 10, sri: 6 },
  { id: 'ag5', name: 'Atlas Growth V', type: 'AIF · growth', vintage: 2024, status: 'investing', minCommitment: 200000, termYears: 10, sri: 6 },
  { id: 'hi2', name: 'Harbor Infrastructure II', type: 'AIF · infrastructure', vintage: 2022, status: 'investing', minCommitment: 200000, termYears: 12, sri: 5 },
  { id: 'mbo5', name: 'Meridian Buyout V', type: 'AIF · buyout', vintage: 2026, status: 'open for subscription', minCommitment: 200000, termYears: 10, sri: 6, firstCallPct: 0.2, firstClose: '2026-12-15' },
  { id: 'epm', name: 'Evergreen Private Markets ELTIF', type: 'ELTIF · evergreen', vintage: 2025, status: 'open', minCommitment: 10000, termYears: 0, sri: 5 },
];

// ---------- Personas (exact values from DATA.md) ----------
const personas: Client[] = [
  {
    id: 'albers', name: 'Claudia Albers', firstName: 'Claudia', age: 47, occupation: 'Partner at a law firm, Munich', persona: true,
    aumEur: 900000,
    holdings: [
      { assetClass: 'equity_etf', name: 'Global equity ETFs', valueEur: 540000, unrealisedGainRatio: 0.28 },
      { assetClass: 'bond_etf', name: 'Euro bond ETFs', valueEur: 315000 },
      { assetClass: 'cash', name: 'Cash', valueEur: 45000 },
    ],
    commitments: [], cashflows: [], statedInvestableEur: 3000000, riskClass: 6, horizonYears: 15,
    objectives: ['long-term growth', 'diversify beyond listed markets'], ytdReturn: 0.071,
    prefersLowContact: false, lastProactiveContact: '2025-12-02', lastTouchpoint: '2026-08-15',
    logins30d: 9, logins60d: 14, loginsPrev60d: 10, withdrawals90dEur: 0,
    appEvents: [
      { date: '2026-10-03', type: 'view', detail: 'Private markets page' }, { date: '2026-10-08', type: 'view', detail: 'Private markets page' },
      { date: '2026-10-19', type: 'view', detail: 'Private markets page' }, { date: '2026-10-24', type: 'view', detail: 'Private markets page' },
    ],
    items: [
      { id: 'albers_note_2025-12-02', date: '2025-12-02', kind: 'rm_note', from: 'rm', text: "Mentioned she was an angel investor, sold a startup stake in 2019. Interested in 'real economy' investments." },
      { id: 'albers_msg_2026-10-08', date: '2026-10-08', kind: 'app_message', from: 'client', text: 'I keep reading about private equity. Is that something that would make sense for me at some point?' },
      { id: 'albers_msg_2026-10-24', date: '2026-10-24', kind: 'app_message', from: 'client', text: 'Also — what happens if I need the money earlier?' },
    ],
    questionnaire: { peExperience: 'none', knowledgeScore: 7, complete: true },
    documents: ['ID verified', 'MiFID questionnaire 2026-10-30', 'Risk declaration (semi-professional) 2026-11-05'],
    extraFacts: { bankDepositsEur: 1400000, houseBankSecuritiesEur: 700000, meetingDate: '2026-11-05' },
  },
  {
    id: 'keller', name: 'Dr. Thomas Keller', firstName: 'Thomas', age: 52, occupation: 'Founder and managing director, mechanical engineering company (holding: Keller Beteiligungs GmbH)', persona: true,
    aumEur: 1100000,
    holdings: [
      { assetClass: 'equity_etf', name: 'Global equity ETFs', valueEur: 520000, unrealisedGainRatio: 0.35 },
      { assetClass: 'bond_etf', name: 'Euro bond ETFs', valueEur: 190000 },
      { assetClass: 'cash', name: 'Cash', valueEur: 40000 },
      { assetClass: 'pm', name: 'Private markets (NAV)', valueEur: 350000 },
    ],
    commitments: [
      { fundId: 'mbo4', commitmentEur: 300000, calledEur: 255000, navEur: 260000 },
      { fundId: 'ag5', commitmentEur: 400000, calledEur: 100000, navEur: 90000 },
    ],
    cashflows: [
      { id: 'kel_ag5_call_2025-06', fundId: 'ag5', date: '2025-06-02', type: 'call', amountEur: 60000, status: 'confirmed' },
      { id: 'kel_ag5_call_2026-02', fundId: 'ag5', date: '2026-02-02', type: 'call', amountEur: 40000, status: 'confirmed' },
      { id: 'kel_ag5_call_2026-12', fundId: 'ag5', date: '2026-12-01', type: 'call', amountEur: 150000, status: 'confirmed' },
      { id: 'kel_mbo4_dist_2027-02', fundId: 'mbo4', date: '2027-02-15', type: 'distribution', amountEur: 180000, status: 'indicative' },
      { id: 'kel_ag5_call_2027-06', fundId: 'ag5', date: '2027-06-01', type: 'call', amountEur: 80000, status: 'indicative' },
      { id: 'kel_mbo4_dist_2027-09', fundId: 'mbo4', date: '2027-09-15', type: 'distribution', amountEur: 60000, status: 'indicative' },
    ],
    statedInvestableEur: 4100000, riskClass: 6, horizonYears: 12, objectives: ['long-term growth', 'keep liquidity for the company'], ytdReturn: 0.054,
    prefersLowContact: false, lastProactiveContact: '2026-06-05', lastTouchpoint: '2026-09-10',
    logins30d: 6, logins60d: 11, loginsPrev60d: 9, withdrawals90dEur: 0,
    appEvents: [{ date: '2026-09-30', type: 'view', detail: 'Atlas Growth V detail' }, { date: '2026-10-19', type: 'view', detail: 'Atlas Growth V detail' }],
    items: [
      { id: 'keller_msg_2026-09-30', date: '2026-09-30', kind: 'app_message', from: 'client', text: 'Why is Atlas Growth showing a loss? I thought this was a good fund.' },
      { id: 'keller_msg_2026-10-19', date: '2026-10-19', kind: 'app_message', from: 'client', text: 'Is the Atlas number still negative? Should I be worried?' },
    ],
    questionnaire: { peExperience: 'extensive', knowledgeScore: 9, complete: true }, documents: ['ID verified', 'Semi-professional investor declaration 2024'],
  },
  {
    id: 'berger', name: 'Sabine Berger', firstName: 'Sabine', age: 44, occupation: 'CFO of a mid-sized company', persona: true,
    aumEur: 1400000,
    holdings: [
      { assetClass: 'equity_etf', name: 'Global equity ETFs', valueEur: 900000, unrealisedGainRatio: 0.3 },
      { assetClass: 'bond_etf', name: 'Euro bond ETFs', valueEur: 450000 },
      { assetClass: 'cash', name: 'Cash', valueEur: 50000 },
    ],
    commitments: [], cashflows: [], statedInvestableEur: 4500000, riskClass: 5, horizonYears: 10, objectives: ['wealth preservation', 'property purchase'], ytdReturn: 0.061,
    prefersLowContact: false, lastProactiveContact: '2025-09-01', lastTouchpoint: '2026-09-20',
    logins30d: 3, logins60d: 5, loginsPrev60d: 6, withdrawals90dEur: 0, appEvents: [],
    items: [{ id: 'berger_msg_2026-10-21', date: '2026-10-21', kind: 'app_message', from: 'client', text: "We're buying an apartment in Munich next spring, so I'll probably need around €300k from my portfolio." }],
    questionnaire: { peExperience: 'some', knowledgeScore: 6, complete: true }, documents: ['ID verified'],
  },
  {
    id: 'hofmann', name: 'Monika Hofmann', firstName: 'Monika', age: 63, occupation: 'Retired pharmacist', persona: true,
    aumEur: 700000,
    holdings: [
      { assetClass: 'equity_etf', name: 'Global equity ETFs', valueEur: 420000, unrealisedGainRatio: 0.22 },
      { assetClass: 'bond_etf', name: 'Euro bond ETFs', valueEur: 252000 },
      { assetClass: 'cash', name: 'Cash', valueEur: 28000 },
    ],
    commitments: [], cashflows: [], statedInvestableEur: 1000000, riskClass: 4, horizonYears: 15, objectives: ['retirement income from 2030'], goal: 'Retirement income from 2030', ytdReturn: 0.062,
    prefersLowContact: true, lastProactiveContact: '2026-04-06', lastTouchpoint: '2026-07-29',
    logins30d: 2, logins60d: 3, loginsPrev60d: 3, withdrawals90dEur: 0, appEvents: [],
    items: [{ id: 'hofmann_msg_2026-04-20', date: '2026-04-20', kind: 'app_message', from: 'client', text: 'All good, thank you — no need to call, the quarterly updates are enough for me.' }],
    questionnaire: { peExperience: 'none', knowledgeScore: 4, complete: true }, documents: ['ID verified'],
  },
];

// ---------- Text bank (with intended AI signals = seed extraction) ----------
type Tmpl = { text: (amt: number) => string; signals: (amt: number) => Omit<Signal, 'clientId' | 'sourceIds' | 'origin' | 'quote'>[]; quote: (amt: number) => string; amt?: [number, number] };
const fmt = (n: number) => '€' + Math.round(n / 1000) + 'k';
const BANK: { key: string; t: Tmpl; count: number }[] = [
  { key: 'exit', count: 2, t: { text: () => "We're selling the company next year — I'd like to talk about what to do with the proceeds.", quote: () => "We're selling the company next year", signals: () => [{ type: 'life_event', summary: 'Plans to sell the company next year', confidence: 0.9 }, { type: 'investment_interest', summary: 'Wants to discuss investing the sale proceeds', confidence: 0.75 }] } },
  { key: 'cash', count: 2, t: { amt: [120000, 250000], text: (a) => `Is there a way to get about ${fmt(a)} in cash without selling everything?`, quote: (a) => `get about ${fmt(a)} in cash`, signals: (a) => [{ type: 'liquidity_need', summary: `Needs about ${fmt(a)} in cash`, amountEur: a, confidence: 0.85 }] } },
  { key: 'fee', count: 2, t: { text: () => 'My bank offered me a better fee. Can you match it?', quote: () => 'My bank offered me a better fee', signals: () => [{ type: 'dissatisfaction', summary: 'Compares fees with his/her bank', confidence: 0.85 }, { type: 'transfer_intent', summary: 'May move assets if fee is not matched', confidence: 0.65 }] } },
  { key: 'move', count: 1, t: { text: () => 'Thinking of moving part of my money to my private bank.', quote: () => 'moving part of my money to my private bank', signals: () => [{ type: 'transfer_intent', summary: 'Considers moving money to private bank', confidence: 0.9 }] } },
  { key: 'tax', count: 6, t: { text: () => 'Please send me the tax certificate.', quote: () => 'send me the tax certificate', signals: () => [{ type: 'factual_question', summary: 'Asks for tax certificate', confidence: 0.95 }] } },
  { key: 'drop', count: 5, t: { text: () => 'Why did my portfolio drop last month?', quote: () => 'Why did my portfolio drop last month?', signals: () => [{ type: 'factual_question', summary: 'Asks why the portfolio dropped', confidence: 0.9 }] } },
  { key: 'uni', count: 3, t: { amt: [30000, 45000], text: (a) => `My daughter is starting university, I'll need about ${fmt(a)} a year.`, quote: (a) => `need about ${fmt(a)} a year`, signals: (a) => [{ type: 'liquidity_need', summary: `Needs about ${fmt(a)} a year for university costs`, amountEur: a, confidence: 0.85 }, { type: 'life_event', summary: 'Child starting university', confidence: 0.9 }] } },
  { key: 'holding', count: 1, t: { text: () => 'Can my holding company invest in private equity too?', quote: () => 'Can my holding company invest in private equity too?', signals: () => [{ type: 'investment_interest', summary: 'Wants to invest via holding company in private equity', topic: 'private_markets', confidence: 0.85 }] } },
  { key: 'calls', count: 4, t: { text: () => "I don't understand the capital call letter.", quote: () => "I don't understand the capital call letter.", signals: () => [{ type: 'pm_frustration', summary: 'Confused by a capital call letter', confidence: 0.85 }, { type: 'factual_question', summary: 'Asks about a capital call', confidence: 0.8 }] } },
  { key: 'happy', count: 6, t: { text: () => 'All good, no need to call.', quote: () => 'no need to call', signals: () => [{ type: 'prefers_low_contact', summary: 'Prefers little contact', confidence: 0.9 }] } },
  { key: 'perf', count: 2, t: { text: () => "Honestly, I expected more from the returns this year.", quote: () => 'I expected more from the returns this year', signals: () => [{ type: 'dissatisfaction', summary: 'Unhappy with returns', confidence: 0.8 }] } },
  { key: 'noise', count: 6, t: { text: () => pick(['Please update my address.', 'I cannot log in on my new phone.', 'Thanks for the update!']), quote: () => '', signals: () => [] } },
];

// ---------- Generated clients ----------
const N = 196;
const gen: Client[] = [];
const used = new Set<string>();
for (let i = 0; i < N; i++) {
  const female = rnd() < 0.42;
  let name = '';
  do { name = `${pick(female ? FIRST_F : FIRST_M)} ${pick(LAST).replace('2', '')}`; } while (used.has(name));
  used.add(name);
  const aum = Math.min(4_000_000, Math.max(300_000, Math.exp(Math.log(700_000) + 0.55 * normal())));
  const risk = 3 + Math.floor(rnd() * 4);
  const eqShare = 0.35 + (risk - 3) * 0.12;
  gen.push({
    id: `c${String(i + 1).padStart(3, '0')}`, name, firstName: name.split(' ')[0], age: 35 + Math.floor(rnd() * 35), occupation: pick(OCC), persona: false,
    aumEur: aum, holdings: [], commitments: [], cashflows: [], statedInvestableEur: 0, riskClass: risk, horizonYears: 5 + Math.floor(rnd() * 16),
    objectives: [pick(['long-term growth', 'wealth preservation', 'income'])], ytdReturn: Math.round(between(0.02, 0.09) * 1000) / 1000,
    prefersLowContact: false, lastProactiveContact: null, lastTouchpoint: null, logins30d: 0, logins60d: 0, loginsPrev60d: 0, withdrawals90dEur: 0,
    appEvents: [], items: [], questionnaire: { peExperience: pick(['none', 'some', 'extensive']), knowledgeScore: 3 + Math.floor(rnd() * 7), complete: true },
    documents: ['ID verified'], extraFacts: { eqShare },
  });
}
// scale AUM so the mean over all 200 clients ≈ €860k
const personaSum = personas.reduce((s, p) => s + p.aumEur, 0);
const target = 860_000 * 200 - personaSum;
const genSum = gen.reduce((s, c) => s + c.aumEur, 0);
gen.forEach((c) => { c.aumEur = round(Math.min(4_000_000, Math.max(300_000, (c.aumEur * target) / genSum))); });

// private markets: 74 generated + Keller = 75 (37.5%)
const order = [...gen].sort(() => rnd() - 0.5);
const pmClients = order.slice(0, 74);
const pmFunds = ['mbo4', 'ag5', 'hi2'];
for (const c of pmClients) {
  const f = pick(pmFunds);
  const commit = round(between(200_000, 400_000), 50_000);
  const calledPct = f === 'mbo4' ? 0.85 : f === 'ag5' ? 0.25 : 0.6;
  const nav = round(commit * calledPct * (f === 'ag5' ? 0.9 : f === 'mbo4' ? 1.05 : 1.0));
  c.commitments.push({ fundId: f, commitmentEur: commit, calledEur: round(commit * calledPct), navEur: nav });
}
// holdings
for (const c of gen) {
  const pmNav = c.commitments.reduce((s, x) => s + x.navEur, 0);
  const liquid = c.aumEur - pmNav;
  const eq = Number(c.extraFacts!.eqShare);
  const cash = round(liquid * between(0.03, 0.08));
  const h: Holding[] = [
    { assetClass: 'equity_etf', name: 'Global equity ETFs', valueEur: round((liquid - cash) * eq), unrealisedGainRatio: Math.round(between(0.1, 0.45) * 100) / 100 },
    { assetClass: 'bond_etf', name: 'Euro bond ETFs', valueEur: 0 },
    { assetClass: 'cash', name: 'Cash', valueEur: cash },
  ];
  h[1].valueEur = liquid - cash - h[0].valueEur;
  if (pmNav) h.push({ assetClass: 'pm', name: 'Private markets (NAV)', valueEur: pmNav });
  c.holdings = h;
  delete c.extraFacts;
  const sow = between(0.15, 0.4);
  c.statedInvestableEur = round(c.aumEur / sow, 10_000);
}
// capital calls within 90 days: 7 generated (2 with a gap) + Keller
const callers = pmClients.filter((c) => c.commitments[0].fundId !== 'mbo4').slice(0, 7);
callers.forEach((c, i) => {
  const cash = c.holdings.find((h) => h.assetClass === 'cash')!.valueEur;
  const amount = i < 2 ? round(cash + between(40_000, 90_000), 5_000) : round(Math.min(cash * 0.6, 40_000), 5_000) || 10_000;
  c.cashflows.push({ id: `${c.id}_call_${i}`, fundId: c.commitments[0].fundId, date: addDays(SIM_TODAY, 20 + i * 9), type: 'call', amountEur: amount, status: 'confirmed' });
});
// distributions: 8 received in last 30 days, 4 upcoming within 60 days
pmClients.filter((c) => c.commitments[0].fundId === 'mbo4').slice(0, 12).forEach((c, i) => {
  const amt = round(c.commitments[0].commitmentEur * between(0.15, 0.35), 5_000);
  const date = i < 8 ? addDays(SIM_TODAY, -Math.floor(between(3, 28))) : addDays(SIM_TODAY, Math.floor(between(15, 55)));
  c.cashflows.push({ id: `${c.id}_dist_${i}`, fundId: 'mbo4', date, type: 'distribution', amountEur: amt, status: i < 8 ? 'confirmed' : 'indicative' });
});

// contact history: 92 generated with proactive contact in last 12 months (+3 personas = 95 = 47.5%)
const contactOrder = [...gen].sort(() => rnd() - 0.5);
contactOrder.forEach((c, i) => {
  c.lastProactiveContact = i < 92 ? addDays(SIM_TODAY, -Math.floor(between(20, 300))) : addDays(SIM_TODAY, -Math.floor(between(380, 700)));
  c.lastTouchpoint = addDays(SIM_TODAY, -Math.floor(i % 4 === 0 ? between(95, 200) : between(5, 85)));
});
// app usage: 82 generated monthly active (+3 personas with logins30d>0: albers, keller, berger, hofmann = 4) ≈ 43%
const usageOrder = [...gen].sort(() => rnd() - 0.5);
usageOrder.forEach((c, i) => {
  const active = i < 81;
  c.loginsPrev60d = Math.floor(between(2, 14));
  c.logins30d = active ? 1 + Math.floor(between(0, 8)) : 0;
  c.logins60d = active ? c.logins30d + Math.floor(between(0, 6)) : Math.floor(between(0, 2));
});
// login drops (~14) and withdrawals (~8) among inactive
usageOrder.slice(81, 95).forEach((c) => { c.loginsPrev60d = 8 + Math.floor(between(0, 8)); c.logins60d = Math.floor(between(0, 2)); });
usageOrder.slice(150, 158).forEach((c) => { c.withdrawals90dEur = round(c.aumEur * between(0.12, 0.25)); });

// text items (~40 clients)
const textOrder = [...gen].filter((c) => !callers.includes(c)).sort(() => rnd() - 0.5);
const seedSignals: Record<string, Signal[]> = {};
let ti = 0;
for (const b of BANK) {
  for (let k = 0; k < b.count; k++) {
    const c = textOrder[ti++];
    const amt = b.t.amt ? round(between(b.t.amt[0], b.t.amt[1]), 10_000) : 0;
    const text = b.t.text(amt);
    const date = addDays(SIM_TODAY, -Math.floor(between(4, 40)));
    const item: TextItem = { id: `${c.id}_msg_${date}`, date, kind: 'app_message', from: 'client', text };
    c.items.push(item);
    if (b.key === 'happy') c.prefersLowContact = true;
    if (b.key === 'holding') c.statedInvestableEur = Math.max(c.statedInvestableEur, 2_000_000);
    seedSignals[c.id] = b.t.signals(amt).map((s) => ({ ...s, clientId: c.id, origin: 'ai' as const, sourceIds: [item.id], quote: b.t.quote(amt) || undefined }));
  }
}
// persona AI signals (seed = expected extraction)
seedSignals.albers = [
  { clientId: 'albers', type: 'investment_interest', topic: 'private_markets', summary: 'Asked twice about private equity; wants to diversify', confidence: 0.88, origin: 'ai', sourceIds: ['albers_msg_2026-10-08'], quote: 'I keep reading about private equity' },
  { clientId: 'albers', type: 'factual_question', summary: 'Asks what happens if she needs the money earlier', confidence: 0.9, origin: 'ai', sourceIds: ['albers_msg_2026-10-24'], quote: 'what happens if I need the money earlier?' },
];
seedSignals.keller = [
  { clientId: 'keller', type: 'pm_frustration', summary: 'Worried about the negative value of Atlas Growth V (J-curve)', confidence: 0.86, origin: 'ai', sourceIds: ['keller_msg_2026-10-19', 'keller_msg_2026-09-30'], quote: 'Should I be worried?' },
];
seedSignals.berger = [
  { clientId: 'berger', type: 'liquidity_need', summary: 'Needs ~€300k next spring for an apartment purchase', amountEur: 300000, dueDate: '2027-04-01', confidence: 0.92, origin: 'ai', sourceIds: ['berger_msg_2026-10-21'], quote: "I'll probably need around €300k" },
  { clientId: 'berger', type: 'life_event', summary: 'Buying an apartment in Munich', confidence: 0.9, origin: 'ai', sourceIds: ['berger_msg_2026-10-21'], quote: "We're buying an apartment in Munich next spring" },
];
seedSignals.hofmann = [
  { clientId: 'hofmann', type: 'prefers_low_contact', summary: 'Prefers quarterly updates, no calls', confidence: 0.9, origin: 'ai', sourceIds: ['hofmann_msg_2026-04-20'], quote: 'no need to call' },
];

const clients = [...personas, ...gen];
const dataDir = path.join(__dirname, '..', 'data');
const cacheDir = path.join(dataDir, 'cache');
fs.mkdirSync(cacheDir, { recursive: true });
for (const f of fs.readdirSync(cacheDir)) if (f.startsWith('extract_signals__') || f.startsWith('draft_touchpoint__')) fs.unlinkSync(path.join(cacheDir, f));
fs.writeFileSync(path.join(dataDir, 'clients.json'), JSON.stringify(clients, null, 1));
fs.writeFileSync(path.join(dataDir, 'funds.json'), JSON.stringify(FUNDS, null, 1));

const seedMeta = (promptId: string, key: string, output: unknown) => ({
  promptId, key, promptVersion: (fs.readFileSync(path.join(__dirname, '..', 'prompts', `${promptId}.md`), 'utf8').match(/—\s*(v\d+)\s*—/) ?? [])[1] ?? 'v1', model: 'seed · pre-authored example (used when live AI is off or unavailable)', createdAt: '2026-11-02T22:00:00Z', output,
});
for (const [id, sigs] of Object.entries(seedSignals)) {
  const output = { signals: sigs.map((s) => ({ type: s.type, summary: s.summary, amountEur: s.amountEur ?? null, timing: s.dueDate ?? null, topic: s.topic ?? null,
    evidence: s.sourceIds.map((sid) => ({ itemId: sid, quote: s.quote ?? '' })), confidence: s.confidence })), churnReasonHypothesis: 'none', uncertainty: '' };
  fs.writeFileSync(path.join(cacheDir, `extract_signals__${id}.json`), JSON.stringify(seedMeta('extract_signals', id, output), null, 1));
}

// ---------- Touchpoint seed drafts for the digital lane ----------
const plan = allocate({ clients, aiSignals: seedSignals, today: SIM_TODAY });
const byId = new Map(clients.map((c) => [c.id, c]));
const digital = plan.filter((a) => a.lane === 'digital');
let testDone = false;
let advisoryDone = 0;
for (const a of digital) {
  const c = byId.get(a.clientId)!;
  const value = '€' + c.aumEur.toLocaleString('en-GB');
  const ytd = (c.ytdReturn >= 0 ? '+' : '') + (c.ytdReturn * 100).toFixed(1) + '%';
  const types = a.signals.map((s) => s.type);
  let trigger = 'quarterly_progress';
  if (types.includes('distribution_received')) trigger = 'distribution_received';
  else if (types.includes('distribution_upcoming')) trigger = 'distribution_upcoming';
  else if (types.includes('pm_frustration')) trigger = c.items.some((i) => /capital call/i.test(i.text)) ? 'capital_call_explainer' : 'j_curve_explainer';
  else if (types.includes('factual_question')) trigger = 'statement_info';
  else if (types.includes('no_contact_long') && !types.includes('quarterly_progress')) trigger = 're_engagement';
  const facts = [{ id: 'f1', label: 'portfolio value', value }, { id: 'f2', label: 'year-to-date return', value: ytd }];
  let subject = 'Your quarterly update';
  const goal = c.goal ?? c.objectives[0];
  const goalLine = goal === 'income' ? 'It stays set up to pay you a regular income, as agreed.' : goal === 'wealth preservation' ? 'It stays set up to preserve your wealth, as agreed.' : 'It stays invested for long-term growth, as agreed.';
  let body = `Dear ${c.firstName}, a short update: your portfolio stands at ${value}, ${ytd} so far this year. ${goalLine} Nothing needs your attention right now. If you would like to talk, just reply here. Best, Jonas`;
  if (c.id === 'hofmann') {
    facts.push({ id: 'f3', label: 'retirement goal year', value: '2030' });
    body = `Dear Monika, your quarterly update: your portfolio stands at ${value}, ${ytd} so far this year. Your portfolio stays invested as agreed for your retirement income from 2030. No action needed — as agreed, I'll only call if something changes. Best, Jonas`;
  } else if (trigger === 'distribution_received') {
    const d = a.signals.find((s) => s.type === 'distribution_received')!;
    facts.push({ id: 'f3', label: 'distribution amount', value: '€' + (d.amountEur ?? 0).toLocaleString('en-GB') });
    subject = 'Your distribution has arrived';
    body = `Dear ${c.firstName}, Meridian Buyout IV paid you a distribution of €${(d.amountEur ?? 0).toLocaleString('en-GB')}. It is now in your cash account. A distribution means the fund sold a company and returned money to investors. If you'd like to discuss what to do with it, reply and I'll call you. Best, Jonas`;
  } else if (trigger === 'distribution_upcoming') {
    const d = a.signals.find((s) => s.type === 'distribution_upcoming')!;
    facts.push({ id: 'f3', label: 'expected distribution (indicative)', value: '€' + (d.amountEur ?? 0).toLocaleString('en-GB') });
    facts.push({ id: 'f4', label: 'expected date', value: new Date(d.dueDate + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) });
    subject = 'A distribution is expected';
    body = `Dear ${c.firstName}, Meridian Buyout IV expects to pay you a distribution of about €${(d.amountEur ?? 0).toLocaleString('en-GB')} around ${facts[3].value}. This is an estimate from the fund, not yet confirmed. When it arrives, the money goes to your cash account and I will let you know. Best, Jonas`;
  } else if (trigger === 'capital_call_explainer') {
    subject = 'Your capital call letter, explained';
    body = `Dear ${c.firstName}, you wrote that the capital call letter was unclear. A capital call means the fund asks for the next part of the amount you committed, when it buys a company. The letter shows how much and by when; the money is taken from your cash account with us. Happy to go through it on a short call. Best, Jonas`;
  } else if (trigger === 'j_curve_explainer') {
    subject = 'Why young private equity funds first show a loss';
    body = `Dear ${c.firstName}, in its first years a private equity fund calls money and pays fees before its companies grow, so its value is often below what you paid in. This is called the J-curve. It is common for young funds and says little yet about the final result. Happy to explain on a call. Best, Jonas`;
  } else if (trigger === 'statement_info') {
    subject = 'Your documents';
    body = `Dear ${c.firstName}, your statements and tax certificate are in the app under Documents. Your portfolio currently stands at ${value}. If anything is unclear, reply here. Best, Jonas`;
  } else if (trigger === 're_engagement') {
    subject = 'It has been a while';
    body = `Dear ${c.firstName}, it's been some time since we last spoke. Your portfolio stands at ${value}, ${ytd} this year. If your plans have changed, I'd be glad to catch up — just reply. Best, Jonas`;
  }
  let testCase = false;
  if (!testDone && trigger === 'quarterly_progress' && c.id !== 'hofmann') {
    body = body.replace(ytd, '+8.1%');
    testCase = true;
    testDone = true;
  }
  // Re-engagement after a long silence is personal outreach (RULES.md §7): the RM approves it individually, never in a batch.
  let messageType = trigger === 're_engagement' ? 'personal_outreach' : 'informational';
  if (trigger === 'distribution_received' && advisoryDone++ === 1) {
    // The model classifies this one as advisory: the natural message would be about reinvesting. It writes an RM note instead.
    const d = a.signals.find((s) => s.type === 'distribution_received')!;
    messageType = 'advisory';
    subject = 'Note for RM — not a client message';
    body = `${c.firstName} received a distribution of €${(d.amountEur ?? 0).toLocaleString('en-GB')}. The natural next message would be about what to do with the money. That is advice, so no client draft was written. Suggest a short call.`;
  }
  const output = { subject, body, messageType, factsUsed: facts.map((f) => f.id), callToAction: 'reply', confidence: 0.9, trigger, facts, testCase };
  fs.writeFileSync(path.join(cacheDir, `draft_touchpoint__${c.id}.json`), JSON.stringify(seedMeta('draft_touchpoint', c.id, output), null, 1));
}

const lanes = { rm: 0, digital: 0, none: 0 } as Record<string, number>;
plan.forEach((a) => lanes[a.lane]++);
console.log('clients', clients.length, 'lanes', lanes, 'hard', plan.filter((a) => a.hardTrigger).length,
  'personas', personas.map((p) => `${p.id}:${plan.find((a) => a.clientId === p.id)!.lane}`).join(' '),
  'control', plan.filter((a) => a.controlGroup).length);
