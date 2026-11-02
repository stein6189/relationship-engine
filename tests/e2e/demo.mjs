// DEMO.md steps 0–12 as one end-to-end run. Usage: node tests/e2e/demo.mjs [live|cached]
import { setup, step, expect, shot, done, BASE } from './lib.mjs';
const mode = process.argv[2] || 'cached';
const P = `demo-${mode}-`;
const { browser, page, errors } = await setup({ mode });
console.log(`DEMO.md end-to-end · ${mode} · ${BASE}`);
const T = { timeout: 30000 };

await step('0 · demo date visible', async () => {
  await page.goto(BASE + '/rm/plan');
  await page.getByText('Demo date: 6 Nov 2026').waitFor();
  expect(await page.getByText('Prototype · synthetic data · not investment advice').count() > 0, 'banner');
});
await step('1 · KPIs and capacity bar', async () => {
  await page.getByText('Proactive coverage (12 months)').waitFor();
  expect(await page.getByText('47.5%').count() > 0, 'coverage 47.5% (RULES/DATA calibration)');
  await shot(page, P + '01-plan');
});
await step('2 · run orchestration → 4 steps, 20/20', async () => {
  await page.getByTestId('run-orchestration').click();
  await page.getByText('14 clients read live').waitFor({ timeout: 90000 });
  expect((await page.getByTestId('pipeline-steps').innerText()).match(/✓/g)?.length === 4, '4 steps done');
  expect((await page.getByTestId('capacity').innerText()).includes('20 / 20'), 'capacity 20/20');
  await shot(page, P + '02-orchestrated');
});
await step('3 · Berger card: liquidity need €300k, quote, confidence, RM lane', async () => {
  const card = page.getByTestId('lane-rm').getByTestId('card-berger');
  const t = await card.innerText();
  expect(/Liquidity need/.test(t) && /300/.test(t) && /%/.test(t), 'berger chips: ' + t);
  expect(/€300k/.test(await card.getByTestId('card-quote').innerText()), 'client quote visible on card');
  await card.scrollIntoViewIfNeeded(); await shot(page, P + '03-berger');
});
await step('4 · control group chip with tooltip', async () => {
  const chip = page.getByTestId('control-chip').first();
  await chip.scrollIntoViewIfNeeded();
  expect(/observed, not causal/.test(await chip.getAttribute('title')), 'tooltip text');
});
await step('5 · Albers → V3 brief with sourced sentences', async () => {
  await page.getByTestId('lane-rm').getByTestId('card-albers').getByRole('link').first().click();
  await page.getByTestId('brief-sentences').waitFor(T);
  const n = await page.getByTestId('brief-sentences').locator('li').count();
  expect(n >= 3, 'brief has sentences');
  await shot(page, P + '05-albers-360');
});
await step('6 · V4 draft: cost table from code, verifier per sentence', async () => {
  await page.goto(BASE + '/rm/client/albers/advice');
  await page.getByTestId('draft-doc').click();
  await page.getByTestId('approve-panel').waitFor({ timeout: 60000 });
  await page.getByTestId('verifier-panel').getByText(/\d+ \/ \d+ supported/).waitFor({ timeout: 60000 });
  const ct = await page.getByTestId('cost-table').innerText();
  expect(ct.includes('€6,000') && ct.includes('€55,000') && ct.includes('3.00%'), 'cost table values');
  await shot(page, P + '06-advice-draft');
});
await step('7 · verifier test → red; remove; approve; audit complete', async () => {
  await page.getByTestId('run-verifier-test').click();
  await page.getByTestId('sent-test').waitFor(T);
  await page.waitForFunction(() => /unsupported|number guard/.test(document.querySelector('[data-testid="sent-test"]')?.textContent || ''), null, { timeout: 60000 });
  const t = await page.getByTestId('sent-test').innerText();
  expect(/Test case/.test(t), 'labelled Test case');
  await page.getByTestId('sent-test').scrollIntoViewIfNeeded(); await shot(page, P + '07a-verifier-test');
  await page.getByTestId('remove-test').click();
  // Live drafts may contain other flagged sentences: the RM must explicitly accept them.
  if (await page.getByTestId('review-accept').count()) await page.getByTestId('review-accept').check();
  await page.getByTestId('approve-doc').click();
  const audit = await page.getByTestId('audit-record').innerText();
  for (const k of ['Approved by', 'Draft', 'Verifier', 'Sources used', 'AI draft vs final', 'Rule checks']) expect(audit.toLowerCase().includes(k.toLowerCase()), 'audit has ' + k);
  expect(/test/.test(audit), 'removed test sentence in diff');
  expect(!/AI draft vs final \(1 change/i.test(audit), 'test sentence not presented as AI change');
  await shot(page, P + '07b-audit');
  await page.getByRole('button', { name: 'Close' }).click();
});
await step('8 · split view: checklist, contradiction, attestation, acknowledgment, sign unlocks', async () => {
  await page.goto(BASE + '/split?client=albers');
  await page.getByTestId('contradiction').waitFor(T);
  expect(/angel investor/.test(await page.getByTestId('contradiction').innerText()), 'contradiction quote');
  expect((await page.getByTestId('qual-checks').innerText()).includes('6.7%'), 'Albers PM share 6.7%');
  expect((await page.getByTestId('step-5').innerText()).includes('€40,000'), 'first call €40,000');
  await page.getByTestId('ctab-invest').click();
  expect(await page.getByTestId('client-sign').isDisabled(), 'sign locked before steps');
  expect(await page.getByTestId('attest').isDisabled(), 'attestation blocked while contradiction open');
  await page.getByTestId('use-notes').click();
  await page.getByTestId('update-questionnaire').click();
  await page.getByTestId('attest-tick').check();
  await page.getByTestId('attest').click();
  await page.getByTestId('doc-costs').click();
  await page.getByTestId('client-ack').click();
  expect(!(await page.getByTestId('client-sign').isDisabled()), 'sign unlocked');
  expect((await page.getByTestId('step-2').getAttribute('data-state')) === 'done', 'RM side sees ack');
  await shot(page, P + '08a-split-before-sign');
  await page.getByTestId('client-sign').click();
  await page.getByTestId('client-fund').click();
  expect((await page.getByTestId('step-5').getAttribute('data-state')) === 'done', 'funding done on RM side');
  await shot(page, P + '08b-split-signed');
});
await step('9 · touchpoints: Hofmann, test case red, batch approve', async () => {
  await page.goto(BASE + '/rm/touchpoints');
  const hof = page.getByTestId('tp-hofmann');
  await hof.waitFor();
  expect((await hof.innerText()).includes('2030'), 'Hofmann goal');
  const tc = page.locator('[data-testid^="tp-c"]', { hasText: 'Test case' });
  expect((await tc.innerText()).includes('number check ✗'), 'test case red');
  await shot(page, P + '09a-touchpoints');
  await page.getByTestId('approve-all').click();
  await page.getByTestId('confirm-approve-all').click();
  await page.waitForTimeout(300);
  expect((await hof.innerText()).includes('approved'), 'batch approved');
  expect(!(await tc.innerText()).includes('approved ·'), 'test case not approved');
  await shot(page, P + '09b-approved');
});
await step('10 · Keller V6: timeline, gap, options, stress test', async () => {
  await page.goto(BASE + '/rm/client/keller/liquidity');
  const gap = await page.getByTestId('gap-steps').innerText();
  expect(gap.includes('€110,000') && gap.includes('€150,000') && gap.includes('€40,000'), 'gap steps');
  await page.getByTestId('liquidity-chart').locator('svg').first().waitFor();
  const opts = await page.getByTestId('options').innerText();
  expect(opts.includes('€10,154') && opts.includes('€1,238'), 'option numbers');
  const st = await page.getByTestId('stress-test').innerText();
  expect(st.includes('€464,000') && st.includes('€355,200'), 'stress test values');
  expect((await page.getByTestId('option-bridge').innerText()).includes('Concept option'), 'concept label');
  await shot(page, P + '10a-liquidity');
  await page.getByTestId('pick-bridge').click();
  await page.getByTestId('approve-keller-msg').click(T);
});
await step('11 · split Keller: proposal in app, J-curve explained, factual answer + advice routed', async () => {
  await page.goto(BASE + '/split?client=keller');
  await page.getByTestId('keller-proposal').waitFor(T);
  expect(await page.getByTestId('jcurve-card').count() === 1, 'J-curve card');
  await page.getByTestId('ctab-ask').click();
  await page.getByTestId('suggest-keller_negative').click();
  await page.getByTestId('answer-factual').first().waitFor(T);
  await page.getByTestId('suggest-keller_sell').click();
  await page.getByTestId('answer-advice').first().waitFor(T);
  await page.getByTestId('split-requests').waitFor(T);
  await shot(page, P + '11-split-keller');
});
await step('11b · pipeline: Albers moved past "Qualified"', async () => {
  await page.goto(BASE + '/rm/plan');
  await page.locator('[data-testid^="pipeline-albers-"]').first().waitFor();
  const n = await page.locator('[data-testid^="pipeline-albers-"]').first().getAttribute('data-testid');
  expect(/Funded|Signed|Qualified|Documents/.test(n), 'albers stage ' + n);
  expect(await page.getByTestId('requests').count() === 1, 'requests inbox shows Keller');
  await shot(page, P + '11b-plan-after');
});
await step('12 · under the hood: prompt, model, guard', async () => {
  await page.goto(BASE + '/rm/hood');
  const log = await page.getByTestId('hood-log').innerText();
  for (const k of ['extract_signals', 'draft_suitability', 'verify_draft', 'route_client_question', 'explain_option', 'meeting_brief', 'check_qualification_consistency', 'draft_touchpoint']) expect(log.includes(k), 'log has ' + k);
  await page.getByRole('button', { name: 'Details' }).first().click();
  await page.getByText('Facts passed in').or(page.getByText('Raw JSON output')).first().waitFor();
  await shot(page, P + '12-hood');
});
if (process.env.WARM_DUMP) {
  const log = await page.evaluate(() => JSON.parse(localStorage.getItem('relationship-engine-demo-v1') || '{}').aiLog || []);
  (await import('fs')).writeFileSync(process.env.WARM_DUMP, JSON.stringify(log, null, 1));
  console.log(`  wrote ${log.length} AI calls to ${process.env.WARM_DUMP}`);
}
await browser.close();
done(errors);
