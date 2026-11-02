import type { Client } from '../types';
import { QUAL } from './config';

export interface Check {
  id: string;
  label: string;
  pass: boolean | null; // null = needs human
  detail: string;
  kind: 'legal' | 'internal' | 'human';
}

export function qualificationChecks(c: Client, commitmentEur: number, opts: { riskDeclarationSigned: boolean; rmAttested: boolean }) {
  const existingPm = c.commitments.reduce((s, x) => s + x.commitmentEur, 0);
  const pmShare = (existingPm + commitmentEur) / c.statedInvestableEur;
  const liquidAssets = c.holdings.filter((h) => h.assetClass !== 'pm').reduce((s, h) => s + h.valueEur, 0) +
    Number(c.extraFacts?.bankDepositsEur ?? 0);
  const unfunded = c.commitments.reduce((s, x) => s + (x.commitmentEur - x.calledEur), 0) + commitmentEur;
  const checks: Check[] = [
    { id: 'min', kind: 'legal', label: 'Commitment ≥ €200,000', pass: commitmentEur >= QUAL.minCommitment, detail: `€${commitmentEur.toLocaleString('en-GB')}` },
    { id: 'decl', kind: 'legal', label: 'Signed written risk declaration', pass: opts.riskDeclarationSigned, detail: opts.riskDeclarationSigned ? 'on file' : 'missing' },
    { id: 'quest', kind: 'legal', label: 'Knowledge & experience questionnaire complete', pass: c.questionnaire.complete, detail: c.questionnaire.complete ? 'complete' : 'incomplete' },
    { id: 'pmshare', kind: 'internal', label: 'Private markets ≤ 20% of stated investable wealth', pass: pmShare <= QUAL.pmMaxShare, detail: `${(pmShare * 100).toFixed(1)}%` },
    { id: 'liq', kind: 'internal', label: 'Liquid assets ≥ 1.5 × unfunded commitments', pass: liquidAssets >= QUAL.liquidityCover * unfunded, detail: `€${liquidAssets.toLocaleString('en-GB')} vs €${(QUAL.liquidityCover * unfunded).toLocaleString('en-GB')}` },
    { id: 'horizon', kind: 'internal', label: 'Investment horizon ≥ fund term (10 years)', pass: c.horizonYears >= QUAL.fundTermYears, detail: `${c.horizonYears} years` },
    { id: 'risk', kind: 'internal', label: 'Risk profile ≥ product risk class (SRI 6)', pass: c.riskClass >= QUAL.productRiskClass, detail: `client ${c.riskClass} / product ${QUAL.productRiskClass}` },
    { id: 'attest', kind: 'human', label: 'RM attestation: sufficiently satisfied the client can decide and understands the risks', pass: opts.rmAttested ? true : null, detail: opts.rmAttested ? 'attested by RM' : 'RM judgment required — never automated' },
  ];
  return { checks, pmShare, allRulesPass: checks.filter((x) => x.kind !== 'human').every((x) => x.pass) };
}
