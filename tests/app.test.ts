import { describe, it, expect } from 'vitest';
import { cacheKeyFor } from '@/lib/clientQa';
import { subscriptionSteps } from '@/lib/subscription';
import { timelineFor } from '@/lib/timeline';
import { clientById } from '@/lib/data';
import { eur, eurShort } from '@/lib/rules/format';
import { sentencesOf, albersAllFacts } from '@/lib/albers';
import { seedCache } from '@/lib/seedCache';
import { numberGuard } from '@/lib/rules/numberGuard';
import { textOf } from '@/lib/ai/textFields';
import { factsFor } from '@/lib/facts';

const base: any = { albers: { attested: false, ack: false, signed: false, funded: false, edits: {}, removed: [] }, inbox: {}, qa: {}, requests: [] };

describe('client app routing (cache keys)', () => {
  it('maps the demo questions', () => {
    expect(cacheKeyFor('keller', 'Should I sell ETFs to pay the call?')).toBe('keller_sell');
    expect(cacheKeyFor('keller', 'why is atlas negative')).toBe('keller_negative');
    expect(cacheKeyFor('keller', 'When is the next capital call?')).toBe('keller_next_call');
    expect(cacheKeyFor('albers', 'What happens if I need the money earlier?')).toBe('albers_early');
    expect(cacheKeyFor('keller', 'What is the weather?')).toBe('keller_other');
  });
});

describe('MiFID order in the subscription journey', () => {
  it('locks signing until qualification and acknowledgment', () => {
    const s0 = subscriptionSteps({ ...base.albers, audit: { } as any });
    expect(s0[3].state).toBe('locked');
    const s1 = subscriptionSteps({ ...base.albers, audit: {} as any, attested: true });
    expect(s1[3].state).toBe('locked');
    const s2 = subscriptionSteps({ ...base.albers, audit: {} as any, attested: true, ack: true });
    expect(s2[3].state).toBe('open');
  });
  it('acknowledgment is impossible before the documents are delivered', () => {
    expect(subscriptionSteps(base.albers)[1].state).toBe('locked');
  });
  it('funding shows €40,000 at first close', () => {
    expect(subscriptionSteps(base.albers)[4].detail).toContain('€40,000');
  });
});

describe('shared timeline privacy', () => {
  it('never shows RM notes or tracked behaviour on the client side', () => {
    const t = timelineFor(clientById('albers')!, base);
    const clientSide = t.filter((x) => x.clientVisible);
    expect(clientSide.some((x) => x.kind === 'view' || x.kind === 'note')).toBe(false);
    expect(t.some((x) => x.kind === 'view')).toBe(true);
  });
});

describe('formatting', () => {
  it('formats negative euro amounts with a leading minus', () => {
    expect(eur(-40000)).toBe('−€40,000');
    expect(eurShort(-110000)).toBe('−€110k');
  });
});

describe('suitability draft + verifier seeds', () => {
  it('flattens 16 sentences and appends the labelled test sentence', () => {
    const d = seedCache['draft_suitability__albers'].output;
    expect(sentencesOf(d, false)).toHaveLength(16);
    const withTest = sentencesOf(d, true);
    expect(withTest.find((x) => x.id === 'test')?.test).toBe(true);
  });
  it('verifier seed flags the test sentence', () => {
    const r = seedCache['verify_draft__albers_test'].output.results.find((x: any) => x.sentenceId === 'test');
    expect(r.verdict).toBe('unsupported');
  });
  it('number guard catches the 1.8× forecast', () => {
    expect(numberGuard('Distributions of around 1.8× the commitment are expected.', albersAllFacts()).pass).toBe(false);
  });
});

describe('every seeded touchpoint passes the number guard except the labelled test case', () => {
  it('59 + Hofmann', () => {
    const keys = Object.keys(seedCache).filter((k) => k.startsWith('draft_touchpoint__') && !k.includes('keller_'));
    let fails = 0;
    for (const k of keys) {
      const o = seedCache[k].output;
      const g = numberGuard(textOf('draft_touchpoint', o), o.facts ?? factsFor(k.split('__')[1]));
      if (!g.pass) { fails++; expect(o.testCase).toBe(true); }
    }
    expect(fails).toBe(1);
    expect(keys.length).toBe(60);
  });
});

import { sellOption } from '@/lib/rules/lombard';
describe('Keller sell option', () => {
  it('keeps the RULES.md simplified tax and shows the partial-exemption comparison', () => {
    const s = sellOption(clientById('keller')!, 110_000);
    expect(Math.round(s.taxEur)).toBe(10154);
    expect(Math.round(s.taxWithPartialExemptionEur)).toBe(7108);
  });
});
