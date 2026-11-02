/* Seed outputs for the demo path, authored offline so the prototype works without an API key.
 * They are labelled "seed" in the UI. With a key, run the app in Live mode or `npm run warm-cache` to replace them. */
import fs from 'fs';
import path from 'path';
import { albersFacts, kellerFacts, factsFor } from '../lib/facts';
import { numberGuard } from '../lib/rules/numberGuard';
import { textOf } from '../lib/ai/textFields';
import type { TaskId } from '../lib/ai/schemas';

const dir = path.join(__dirname, '..', 'data', 'cache');
const write = (task: TaskId, key: string, output: unknown, facts = factsFor(key.split('_')[0])) => {
  const g = numberGuard(textOf(task, output), facts);
  if (!g.pass) throw new Error(`Seed ${task}__${key} fails number guard: ${g.unsupported.map((u) => u.raw).join(', ')}`);
  fs.writeFileSync(path.join(dir, `${task}__${key}.json`), JSON.stringify({ promptId: task, key, promptVersion: 'v1',
    model: 'seed (authored offline — replace with live output via warm-cache)', createdAt: '2026-11-02T22:00:00Z', output }, null, 1));
};
const S = (text: string, ...sourceIds: string[]) => ({ text, sourceIds });
const M = 'albers_msg_2026-10-08', M2 = 'albers_msg_2026-10-24', N = 'albers_note_2025-12-02', NOTES = 'notes', Q = 'questionnaire';

// ---------------- Albers ----------------
write('meeting_brief', 'albers', {
  sentences: [
    S('Claudia asked twice in October whether private equity could make sense for her.', M, M2),
    S('She also asked what happens if she needs the money earlier, so illiquidity will be her main question.', M2),
    S('Her last proactive conversation was on 2 Dec 2025, when she mentioned she had been an angel investor.', N, 'f_lastcontact'),
    S('She holds €900,000 with us, about 30% of her stated investable wealth of €3,000,000.', 'f_aum', 'f_sow', 'f_stated'),
    S('Her questionnaire says she has no private equity experience, which conflicts with that note. Clarify this before qualification.', Q, N),
    S('Meridian Buyout V is open for subscription with a €200,000 minimum and a fund term of 10 years.', 'p_name', 'p_min', 'p_term'),
  ],
  openQuestionsForClient: [
    'Which private investments have you made before, and how did they work out?',
    'How much of your wealth could stay locked for around ten years without affecting your plans?',
    'How would you feel if the fund showed a loss in its first years?',
  ],
  prepareDocuments: ['Meridian Buyout V fund documents', 'Ex-ante cost disclosure', 'Semi-professional investor declaration'],
  confidence: 0.86,
});

const suitability = {
  clientObjectives: [
    S('Claudia wants to diversify beyond listed markets and invest in the real economy.', NOTES, N),
    S('Her investment horizon is 15 years or longer.', NOTES, 'f_horizon'),
  ],
  riskProfile: [
    S('Her risk profile is risk class 6, which matches the product risk indicator SRI 6.', 'f_risk', 'p_sri'),
    S('She understands that returns are not guaranteed.', NOTES),
  ],
  knowledgeAndExperience: [
    S('The questionnaire states no private equity experience.', Q),
    S('An earlier RM note records that she was an angel investor and sold a startup stake. The RM should confirm which statement is correct.', N),
  ],
  financialSituationAndLossCapacity: [
    S('She holds €900,000 with us and states investable wealth of €3,000,000, including bank deposits of €1,400,000.', 'f_aum', 'f_stated', 'f_deposits'),
    S('After this investment, private markets would make up 6.7% of her stated investable wealth.', 'r_pmshare'),
    S('She can bear a loss of the committed amount without affecting her plans.', NOTES),
  ],
  whyTheProductFits: [
    S('Meridian Buyout V matches her wish to diversify into private companies and her long horizon.', NOTES, 'p_name'),
    S('A commitment of €200,000 meets the fund minimum and fits her capacity to lock money for the fund term of 10 years.', 'p_commit', 'p_min', 'p_term'),
  ],
  risksExplained: [
    S('Capital is locked for about ten years and capital calls come over three to four years.', NOTES),
    S('The J-curve was explained: the fund is likely to show a loss in its first years.', NOTES),
    S('Distributions are not guaranteed, and she could lose part or all of the committed amount.', NOTES),
    S('The costs were explained; see the cost disclosure.', NOTES),
  ],
  alternativesConsidered: [
    S('An ELTIF with a lower minimum and no capital calls was discussed. Claudia prefers the buyout fund.', NOTES),
  ],
};
const albersDraft = {
  suitability,
  clientMessage: {
    subject: 'Summary of our conversation on private markets',
    body: 'Dear Claudia, thank you for our conversation. Attached are the suitability statement and the cost disclosure for Meridian Buyout V. Please read both before you sign. Your commitment would be €200,000, with a first capital call of €40,000 at first close. If anything is unclear, just reply here. Best, Jonas',
  },
  crmNote: 'Advisory meeting on private markets. Client wants to diversify, horizon 15 years, understands illiquidity, J-curve and that distributions are not guaranteed. Proposed: Meridian Buyout V, commitment €200,000. ELTIF discussed as alternative. Open: clarify private equity experience before RM attestation.',
  openPoints: ['Clarify private equity experience: the questionnaire says none, an RM note mentions angel investing.'],
  confidence: 0.84,
};
write('draft_suitability', 'albers', albersDraft);

const flat = Object.values(suitability).flat();
const verifyResults = flat.map((s, i) => ({ sentenceId: `s${i + 1}`, verdict: 'supported' as const, reason: 'Found in the cited sources.', supportingSourceIds: s.sourceIds }));
write('verify_draft', 'albers', { results: verifyResults, overall: 'pass' });
write('verify_draft', 'albers_test', {
  results: [...verifyResults, { sentenceId: 'test', verdict: 'unsupported', reason: 'No source mentions an expected distribution multiple. This is a forecast that is not in the meeting notes or product facts.', supportingSourceIds: [] }],
  overall: 'needs_review',
});
write('check_qualification_consistency', 'albers', {
  findings: [{
    field: 'peExperience', questionnaireValue: 'none',
    conflictingEvidence: [{ sourceId: N, quote: 'Mentioned she was an angel investor, sold a startup stake in 2019.' }],
    whyItMatters: 'Knowledge and experience are part of the semi-professional investor assessment. Angel investing is related but not the same as fund investing.',
    suggestedQuestionForClient: 'You mentioned investing in startups before. Can you tell me more, so we record your experience correctly?',
    confidence: 0.82,
  }],
}, [...albersFacts(), { id: 'note', label: 'note year', value: '2019' }]);
write('route_client_question', 'albers_early', {
  category: 'factual',
  clientAnswer: 'In a private equity fund your money is usually locked for the fund term of 10 years. You normally cannot sell early. Distributions come back step by step as the fund sells companies. Jonas can talk you through what this means for your plans.',
  rmDraft: '', factsUsed: ['p_term'], confidence: 0.85,
});

// ---------------- Keller ----------------
write('meeting_brief', 'keller', {
  sentences: [
    S('Atlas Growth V will call €150,000 on 1 Dec 2026, and Thomas has €40,000 in cash with us — a gap of €110,000.', 'cashflows', 'k_call', 'k_due', 'k_cash', 'k_gap'),
    S('He asked twice why Atlas Growth V shows a loss. It is at -10% versus paid in, a normal J-curve effect.', 'keller_msg_2026-09-30', 'keller_msg_2026-10-19', 'k_jc'),
    S('An indicative distribution of €180,000 from Meridian Buyout IV is expected on 15 Feb 2027.', 'k_dist', 'k_distdate'),
    S('Prepare the three options to cover the gap: sell ETFs, bridge with a loan against the portfolio, or transfer cash.', 'k_gap'),
  ],
  openQuestionsForClient: ['Do you have cash at your bank or in the holding that you would like to use?', 'Would you prefer not to sell ETFs before year end?'],
  prepareDocuments: ['Liquidity plan', 'Capital call notice Atlas Growth V'],
  confidence: 0.87,
}, kellerFacts());
const kq = (key: string, o: object) => write('route_client_question', key, o, kellerFacts());
kq('keller_next_call', { category: 'factual', clientAnswer: 'Your next capital call is €150,000 for Atlas Growth V, due on 1 Dec 2026. You currently have €40,000 in cash with us. Jonas will contact you about how to cover the rest.', rmDraft: '', factsUsed: ['k_call', 'k_due', 'k_cash'], confidence: 0.92 });
kq('keller_negative', { category: 'factual', clientAnswer: 'Atlas Growth V is a young fund. In its first years it calls money and pays fees before its companies grow, so its value is below what you paid in: €90,000 versus €100,000. This is called the J-curve. It is normal and does not mean the fund is doing badly.', rmDraft: '', factsUsed: ['k_nav', 'k_paidin'], confidence: 0.88 });
kq('keller_sell', { category: 'advice', clientAnswer: "That's a decision about your investments, so I've passed it to Jonas. He'll get back to you shortly.", rmDraft: 'Thomas asks whether to sell ETFs to pay the call. Options are prepared in the liquidity view: selling would trigger an estimated €10,154 in tax; a 3-month bridge would cost about €1,238 in interest. Suggest discussing on the call.', factsUsed: ['k_tax', 'k_interest'], confidence: 0.9 });
const opt = (id: string, sentence: string, f: string[]) => write('explain_option', `keller_${id}`, { optionId: id, sentence, factsUsed: f, confidence: 0.9 }, kellerFacts());
opt('sell', 'Selling ETFs covers the gap now but realises gains with estimated tax of €10,154 and lowers assets with us.', ['k_tax']);
opt('bridge', 'A 3-month loan against the ETFs costs about €1,238 in interest and keeps the portfolio invested until the distribution arrives.', ['k_interest']);
opt('transfer', 'Transferring €110,000 from a bank account costs nothing and adds new money, if Thomas has the cash available.', ['k_gap']);
const tp = (key: string, subject: string, body: string) =>
  write('draft_touchpoint', key, { subject, body, messageType: 'personal_outreach', factsUsed: [], callToAction: 'reply', confidence: 0.88 }, kellerFacts());
tp('keller_bridge', 'Your capital call on 1 Dec 2026', 'Dear Thomas, Atlas Growth V will call €150,000 on 1 Dec 2026. You have €40,000 in cash with us, so €110,000 is missing. As discussed, I suggest bridging this for 3 months with a loan against your ETFs, at an estimated interest cost of €1,238, until the expected Meridian distribution arrives. If markets fall sharply you may need to add collateral. Please confirm in the app if you would like to proceed. Best, Jonas');
tp('keller_sell', 'Your capital call on 1 Dec 2026', 'Dear Thomas, Atlas Growth V will call €150,000 on 1 Dec 2026. You have €40,000 in cash with us, so €110,000 is missing. As discussed, we would sell ETFs to cover this. This realises gains, with estimated tax of €10,154. Please confirm in the app if you would like to proceed. Best, Jonas');
tp('keller_transfer', 'Your capital call on 1 Dec 2026', 'Dear Thomas, Atlas Growth V will call €150,000 on 1 Dec 2026. You have €40,000 in cash with us, so €110,000 is missing. As discussed, please transfer €110,000 from your bank account before the due date. Best, Jonas');

// ---------------- Berger ----------------
write('meeting_brief', 'berger', {
  sentences: [
    S('Sabine wrote that she will need around €300,000 next spring for an apartment in Munich.', 'berger_msg_2026-10-21'),
    S('Without a conversation this would likely arrive as a withdrawal request.', 'berger_msg_2026-10-21'),
    S('Prepare options: a partial withdrawal or a loan against the portfolio, so the investments can stay in place.', 'berger_msg_2026-10-21'),
  ],
  openQuestionsForClient: ['When exactly do you need the money?', 'Would you rather keep your investments and borrow against them?'],
  prepareDocuments: ['Portfolio overview', 'Liquidity options (concept)'],
  confidence: 0.85,
}, [...factsFor('berger'), { id: 'b_need', label: 'Stated need', value: '€300,000' }]);

console.log('persona seeds written');
