import { describe, it, expect } from 'vitest';
import clientsJson from '../data/clients.json';
import type { Client, Signal } from '../lib/types';
import { liquidityGap } from '../lib/rules/liquidity';
import { bridgeOption, sellOption, creditLine, stressedCreditLine } from '../lib/rules/lombard';
import { qualificationChecks } from '../lib/rules/qualification';
import { exAnteCosts } from '../lib/rules/costs';
import { numberGuard, extractNumbers } from '../lib/rules/numberGuard';
import { allocate } from '../lib/rules/allocation';
import { SIM_TODAY } from '../lib/rules/config';
import { loadSeedSignals } from '../lib/data';

const clients = clientsJson as unknown as Client[];
const byId = (id: string) => clients.find((c) => c.id === id)!;

describe('RULES.md check values', () => {
  it('Keller liquidity gap = €110,000', () => {
    expect(liquidityGap(byId('keller'), SIM_TODAY).gapEur).toBe(110000);
  });
  it('Keller credit line €464,000 and stressed €355,200', () => {
    expect(creditLine(byId('keller'))).toBeCloseTo(464000, 0);
    expect(stressedCreditLine(byId('keller'))).toBeCloseTo(355200, 0);
  });
  it('Bridge €110,000 for 3 months ≈ €1,238 and covered under stress', () => {
    const b = bridgeOption(byId('keller'), 110000, 3);
    expect(Math.round(b.interestEur)).toBe(1238);
    expect(b.coveredUnderStress).toBe(true);
    expect(b.topUpEur).toBe(0);
  });
  it('Sell option tax ≈ €10,154', () => {
    expect(Math.round(sellOption(byId('keller'), 110000).taxEur)).toBe(10154);
  });
  it('Cost table €6,000 p.a. and €55,000 over 10 years', () => {
    const c = exAnteCosts(200000);
    expect(c.totalEarlyEur).toBe(6000);
    expect(c.tenYearTotalEur).toBe(55000);
    expect(c.totalPctEarly).toBeCloseTo(0.03, 6);
  });
  it('Albers PM share 6.7% and all rules pass, attestation stays human', () => {
    const q = qualificationChecks(byId('albers'), 200000, { riskDeclarationSigned: true, rmAttested: false });
    expect(q.pmShare).toBeCloseTo(0.0667, 3);
    expect(q.allRulesPass).toBe(true);
    expect(q.checks.find((x) => x.id === 'attest')!.pass).toBeNull();
  });
});

describe('number guard', () => {
  const facts = [
    { id: 'f1', label: 'value', value: '€700,000' },
    { id: 'f2', label: 'ytd', value: '+6.2%' },
    { id: 'f3', label: 'goal', value: '2030' },
    { id: 'f4', label: 'gap', value: '€110,000' },
    { id: 'f5', label: 'date', value: '1 Dec 2026' },
  ];
  const ok = (t: string) => numberGuard(t, facts).pass;
  it('accepts exact facts', () => expect(ok('Your portfolio is €700,000, +6.2% this year.')).toBe(true));
  it('accepts k/m roundings', () => expect(ok('The gap is €110k; value €0.7m.')).toBe(true));
  it('accepts years present in facts', () => expect(ok('On track for 2030.')).toBe(true));
  it('accepts dates', () => expect(ok('The call is due on 1 Dec 2026.')).toBe(true));
  it('flags a wrong percentage', () => expect(ok('Up +8.1% this year.')).toBe(false));
  it('flags an invented multiple', () => expect(ok('Distributions of around 1.8× are expected.')).toBe(false));
  it('flags an invented amount', () => expect(ok('You could receive €250,000.')).toBe(false));
  it('flags a year not in facts', () => expect(ok('By 2035 you will be fine.')).toBe(false));
  it('ignores compound words and small counts', () => expect(ok('A 3-month bridge, Q4 update, 2 options.')).toBe(true));
  it('does not read "minimum" as millions', () => expect(ok('a €110,000 minimum')).toBe(true));
  it('ignores fund names with numbers', () => expect(extractNumbers('Meridian Buyout V and mbo5').length).toBe(0));
});

describe('allocation', () => {
  const plan = allocate({ clients, aiSignals: loadSeedSignals(), today: SIM_TODAY });
  const lane = (id: string) => plan.find((a) => a.clientId === id)!;
  it('fills exactly 20 RM slots and ≤ 60 digital', () => {
    expect(plan.filter((a) => a.lane === 'rm').length).toBe(20);
    expect(plan.filter((a) => a.lane === 'digital').length).toBeLessThanOrEqual(60);
  });
  it('personas land in the right lanes with the right triggers', () => {
    expect(lane('albers').lane).toBe('rm');
    expect(lane('albers').hardTrigger).toBe('pm_interest');
    expect(lane('keller').lane).toBe('rm');
    expect(lane('keller').hardTrigger).toBe('capital_call_gap');
    expect(lane('berger').lane).toBe('rm');
    expect(lane('berger').hardTrigger).toBe('liquidity_need');
    expect(lane('hofmann').lane).toBe('digital');
  });
  it('is deterministic', () => {
    const again = allocate({ clients, aiSignals: loadSeedSignals(), today: SIM_TODAY });
    expect(again.map((a) => a.lane)).toEqual(plan.map((a) => a.lane));
  });
  it('control group: silent risk only, never personas, never hard triggers, AUM ≤ €2m', () => {
    const cg = plan.filter((a) => a.controlGroup);
    expect(cg.length).toBeGreaterThan(0);
    for (const a of cg) {
      const c = byId(a.clientId);
      expect(c.persona).toBe(false);
      expect(a.hardTrigger).toBeNull();
      expect(c.aumEur).toBeLessThanOrEqual(2_000_000);
      expect(a.lane).toBe('digital');
    }
  });
  it('hard triggers 8–12 this month', () => {
    const n = plan.filter((a) => a.hardTrigger).length;
    expect(n).toBeGreaterThanOrEqual(8);
    expect(n).toBeLessThanOrEqual(12);
  });
  it('overrides move a client', () => {
    const p = allocate({ clients, aiSignals: loadSeedSignals(), today: SIM_TODAY, overrides: { hofmann: 'none' } });
    expect(p.find((a) => a.clientId === 'hofmann')!.lane).toBe('none');
  });
  it('AI signals below confidence 0.6 do not trigger', () => {
    const weak: Record<string, Signal[]> = { ...loadSeedSignals(), berger: [{ clientId: 'berger', type: 'liquidity_need', summary: 'x', amountEur: 300000, confidence: 0.4, sourceIds: [], origin: 'ai' }] };
    const p = allocate({ clients, aiSignals: weak, today: SIM_TODAY });
    expect(p.find((a) => a.clientId === 'berger')!.hardTrigger).toBeNull();
  });
});

describe('DATA.md calibration', () => {
  const n = clients.length;
  const share = (f: (c: Client) => boolean) => clients.filter(f).length / n;
  it('200 clients', () => expect(n).toBe(200));
  it('mean AUM ≈ €860k ±5%', () => {
    const mean = clients.reduce((s, c) => s + c.aumEur, 0) / n;
    expect(Math.abs(mean - 860000) / 860000).toBeLessThan(0.05);
  });
  it('proactive contact in 12 months ≈ 47.5% ±3pp', () => {
    const s = share((c) => !!c.lastProactiveContact && Date.parse(SIM_TODAY) - Date.parse(c.lastProactiveContact) <= 365 * 86400000);
    expect(Math.abs(s - 0.475)).toBeLessThanOrEqual(0.03);
  });
  it('private markets ≈ 37.5% ±3pp', () => expect(Math.abs(share((c) => c.commitments.length > 0) - 0.375)).toBeLessThanOrEqual(0.03));
  it('mean share of wallet 24–28%', () => {
    const m = clients.reduce((s, c) => s + c.aumEur / c.statedInvestableEur, 0) / n;
    expect(m).toBeGreaterThanOrEqual(0.24);
    expect(m).toBeLessThanOrEqual(0.3);
  });
  it('monthly active ≈ 42.5% ±5pp', () => expect(Math.abs(share((c) => c.logins30d > 0) - 0.425)).toBeLessThanOrEqual(0.05));
  it('holdings sum to AUM', () => {
    for (const c of clients) expect(Math.abs(c.holdings.reduce((s, h) => s + h.valueEur, 0) - c.aumEur)).toBeLessThan(2);
  });
});
