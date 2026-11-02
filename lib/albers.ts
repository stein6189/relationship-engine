import { clientById } from './data';
import { albersFacts, portfolioFacts, ALBERS_COMMITMENT } from './facts';
import { qualificationChecks } from './rules/qualification';
import { VERIFIER_TEST_SENTENCE } from './notes';
import type { Fact } from './types';

export const SECTIONS = [
  ['clientObjectives', 'Client objectives'],
  ['riskProfile', 'Risk profile'],
  ['knowledgeAndExperience', 'Knowledge & experience'],
  ['financialSituationAndLossCapacity', 'Financial situation & loss capacity'],
  ['whyTheProductFits', 'Why the product fits'],
  ['risksExplained', 'Risks explained'],
  ['alternativesConsidered', 'Alternatives considered'],
] as const;

export interface Sentence { id: string; section: string; text: string; sourceIds: string[]; test?: boolean }

/** Flatten the drafted statement into sentences s1..sN in section order; the labelled test sentence (id "test") goes into "Why the product fits". */
export function sentencesOf(draft: any, testInserted: boolean): Sentence[] {
  if (!draft?.suitability) return [];
  const out: Sentence[] = [];
  let n = 0;
  for (const [key] of SECTIONS) {
    for (const x of draft.suitability[key] ?? []) out.push({ id: `s${++n}`, section: key, text: x.text, sourceIds: x.sourceIds ?? [] });
    if (key === 'whyTheProductFits' && testInserted) out.push({ id: 'test', section: key, text: VERIFIER_TEST_SENTENCE, sourceIds: [], test: true });
  }
  return out;
}

export function albersAllFacts(): Fact[] {
  return [...albersFacts(), ...portfolioFacts(clientById('albers')!)];
}

/** Sources handed to the verifier — the same material the drafter had, nothing more. */
export function albersSources(notes: string): { id: string; text: string }[] {
  const c = clientById('albers')!;
  return [
    { id: 'notes', text: notes },
    { id: 'questionnaire', text: `Knowledge & experience questionnaire: private equity experience: ${c.questionnaire.peExperience}; knowledge score ${c.questionnaire.knowledgeScore}/10; complete.` },
    ...c.items.map((i) => ({ id: i.id, text: i.text })),
    ...albersAllFacts().map((f) => ({ id: f.id, text: `${f.label}: ${f.value}` })),
  ];
}

export function albersRuleResults(attested: boolean) {
  return qualificationChecks(clientById('albers')!, ALBERS_COMMITMENT, { riskDeclarationSigned: true, rmAttested: attested });
}
