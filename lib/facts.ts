import type { Client, Fact } from './types';
import { clientById, fundById } from './data';
import { eur, fmtDate, pct } from './rules/format';
import { liquidityGap } from './rules/liquidity';
import { bridgeOption, sellOption } from './rules/lombard';
import { exAnteCosts } from './rules/costs';
import { qualificationChecks } from './rules/qualification';
import { SIM_TODAY } from './rules/config';

export const ALBERS_COMMITMENT = 200_000;
export const KELLER_BRIDGE_MONTHS = 3;

export function albersFacts(): Fact[] {
  const c = clientById('albers')!;
  const f = fundById('mbo5')!;
  const q = qualificationChecks(c, ALBERS_COMMITMENT, { riskDeclarationSigned: true, rmAttested: false });
  const costs = exAnteCosts(ALBERS_COMMITMENT);
  return [
    { id: 'f_aum', label: 'Assets with us', value: eur(c.aumEur) },
    { id: 'f_stated', label: 'Stated investable wealth', value: eur(c.statedInvestableEur) },
    { id: 'f_sow', label: 'Share of wallet', value: pct(c.aumEur / c.statedInvestableEur, 0) },
    { id: 'f_horizon', label: 'Investment horizon', value: `${c.horizonYears} years` },
    { id: 'f_risk', label: 'Risk class', value: `risk class ${c.riskClass}` },
    { id: 'f_lastcontact', label: 'Last proactive contact', value: fmtDate(c.lastProactiveContact!) },
    { id: 'f_deposits', label: 'Bank deposits elsewhere', value: eur(Number(c.extraFacts!.bankDepositsEur)) },
    { id: 'f_elsewhere', label: 'Held elsewhere (stated wealth minus assets with us)', value: `${eur(c.statedInvestableEur - c.aumEur)} (${pct(1 - c.aumEur / c.statedInvestableEur, 0)})` },
    { id: 'f_housebank', label: 'Securities account at house bank', value: eur(Number(c.extraFacts!.houseBankSecuritiesEur)) },
    { id: 'f_angelexit', label: 'Year she sold a startup stake (RM note)', value: '2019' },
    { id: 'f_meeting', label: 'Advisory meeting', value: fmtDate('2026-11-05') },
    { id: 'p_name', label: 'Product', value: f.name },
    { id: 'p_commit', label: 'Proposed commitment', value: eur(ALBERS_COMMITMENT) },
    { id: 'p_min', label: 'Minimum commitment', value: eur(f.minCommitment) },
    { id: 'p_term', label: 'Fund term', value: `${f.termYears} years` },
    { id: 'p_sri', label: 'Product risk indicator', value: `SRI ${f.sri}` },
    { id: 'p_firstcall', label: 'First capital call at first close', value: eur(ALBERS_COMMITMENT * (f.firstCallPct ?? 0.2)) },
    { id: 'p_firstclose', label: 'First close', value: fmtDate(f.firstClose!) },
    { id: 'r_pmshare', label: 'Private markets share after investment', value: pct(q.pmShare) },
    { id: 'c_total', label: 'Ongoing costs p.a. (yrs 1–5)', value: `${eur(costs.totalEarlyEur)} (${pct(costs.totalPctEarly)})` },
    { id: 'c_10y', label: 'Ongoing costs over 10 years (illustration)', value: eur(costs.tenYearTotalEur) },
  ];
}

export function kellerFacts(): Fact[] {
  const c = clientById('keller')!;
  const gap = liquidityGap(c, SIM_TODAY);
  const br = bridgeOption(c, gap.gapEur, KELLER_BRIDGE_MONTHS);
  const sell = sellOption(c, gap.gapEur);
  const ag5 = c.commitments.find((x) => x.fundId === 'ag5')!;
  const dist = c.cashflows.find((e) => e.type === 'distribution' && e.status === 'indicative')!;
  return [
    { id: 'k_call', label: 'Capital call Atlas Growth V', value: eur(gap.callsEur) },
    { id: 'k_due', label: 'Due date', value: fmtDate(gap.firstDueDate!) },
    { id: 'k_cash', label: 'Free cash on platform', value: eur(gap.freeCashEur) },
    { id: 'k_gap', label: 'Liquidity gap', value: eur(gap.gapEur) },
    { id: 'k_dist', label: 'Indicative distribution Meridian Buyout IV', value: eur(dist.amountEur) },
    { id: 'k_distdate', label: 'Expected', value: fmtDate(dist.date) },
    { id: 'k_paidin', label: 'Atlas Growth V paid in', value: eur(ag5.calledEur) },
    { id: 'k_nav', label: 'Atlas Growth V current value', value: eur(ag5.navEur) },
    { id: 'k_jc', label: 'Atlas Growth V value vs paid in', value: pct(ag5.navEur / ag5.calledEur - 1, 0) },
    { id: 'k_commit', label: 'Atlas Growth V commitment', value: eur(ag5.commitmentEur) },
    { id: 'k_line', label: 'Credit line (lending value)', value: eur(br.creditLineEur) },
    { id: 'k_stress', label: 'Credit line after stress test', value: eur(br.stressedLineEur) },
    { id: 'k_interest', label: `Interest for ${KELLER_BRIDGE_MONTHS} months`, value: eur(br.interestEur) },
    { id: 'k_rate', label: 'Interest rate (assumption)', value: pct(br.rate) },
    { id: 'k_tax', label: 'Estimated tax if ETFs are sold', value: eur(sell.taxEur) },
    { id: 'k_feelost', label: 'Platform fee lost p.a. if sold', value: eur(sell.feeLostPaEur) },
    { id: 'k_aum', label: 'Assets with us', value: eur(c.aumEur) },
    { id: 'k_stated', label: 'Stated investable wealth', value: eur(c.statedInvestableEur) },
    { id: 'k_sow', label: 'Share of wallet', value: pct(c.aumEur / c.statedInvestableEur) },
    { id: 'k_etf', label: 'Equity ETFs', value: eur(c.holdings.find((h) => h.assetClass === 'equity_etf')!.valueEur) },
    { id: 'k_bond', label: 'Bond ETFs', value: eur(c.holdings.find((h) => h.assetClass === 'bond_etf')!.valueEur) },
    { id: 'k_mbo4', label: 'Meridian Buyout IV commitment / paid in', value: `${eur(c.commitments.find((x) => x.fundId === 'mbo4')!.commitmentEur)} / ${eur(c.commitments.find((x) => x.fundId === 'mbo4')!.calledEur)}` },
    { id: 'k_months', label: 'Bridge duration', value: `${KELLER_BRIDGE_MONTHS} months` },
  ];
}

export function portfolioFacts(c: Client): Fact[] {
  return [
    { id: 'f_value', label: 'Portfolio value', value: eur(c.aumEur) },
    { id: 'f_ytd', label: 'Year-to-date return', value: (c.ytdReturn >= 0 ? '+' : '') + pct(c.ytdReturn) },
  ];
}

export const factsFor = (id: string): Fact[] =>
  id === 'albers' ? [...albersFacts(), ...portfolioFacts(clientById(id)!)] : id === 'keller' ? [...kellerFacts(), ...portfolioFacts(clientById(id)!)] : portfolioFacts(clientById(id)!);
