'use client';
import { useMemo } from 'react';
import { useStore } from './store';
import { allocate } from '../rules/allocation';
import { clients, loadSeedSignals } from '../data';
import { SIM_TODAY } from '../rules/config';

const seed = loadSeedSignals();

/** The current monthly plan: seed signals from the 1 Nov run, replaced by any live re-run, plus RM overrides. */
export function usePlan() {
  const { s } = useStore();
  return useMemo(() => {
    const aiSignals = { ...seed, ...s.liveSignals };
    const overrides = Object.fromEntries(Object.entries(s.overrides).map(([k, v]) => [k, v.lane]));
    const plan = allocate({ clients, aiSignals, today: SIM_TODAY, overrides, escalations: s.escalations });
    return { plan, byId: new Map(plan.map((a) => [a.clientId, a])) };
  }, [s.liveSignals, s.overrides, s.escalations]);
}
