// QA round D — robustness against the mock model server (tests/e2e/mock-anthropic.mjs on :3999, app on BASE_URL with ANTHROPIC_BASE_URL pointing at it).
import fs from 'fs';
import { setup, step, expect, shot, done, BASE } from './lib.mjs';
const mock = (m) => fs.writeFileSync('/tmp/mock-mode', m);
const { browser, context, page, errors } = await setup({ mode: 'live' });
console.log(`robustness · ${BASE}`);

await step('slow model (25 s) → cached fallback within ~20 s, labelled', async () => {
  mock('slow');
  await page.goto(BASE + '/rm/client/albers/advice');
  const t = Date.now();
  await page.getByTestId('draft-doc').click();
  await page.getByTestId('suitability').waitFor({ timeout: 30000 });
  const secs = (Date.now() - t) / 1000;
  expect(secs < 26, `draft fell back after ${secs}s`);
  expect(/cached/.test(await page.getByTestId('suitability').innerText()), 'cached label shown');
  await page.getByTestId('approve-panel').waitFor({ timeout: 30000 });
  await page.getByTestId('verifier-panel').getByText(/\d+ \/ \d+ supported/).waitFor({ timeout: 30000 });
  await shot(page, 'robust-slow');
});
await step('invalid JSON → retry → cached fallback (has cache) / "Needs review" (no cache)', async () => {
  mock('invalid');
  await page.goto(BASE + '/rm/client/c020');
  await page.getByRole('button', { name: 'Prepare brief' }).click();
  await page.getByTestId('needs-review').waitFor({ timeout: 20000 });
  await shot(page, 'robust-invalid-brief');
});
await step('wrong number from model in client answer → held back, routed to RM', async () => {
  mock('badnumber');
  await page.goto(BASE + '/client/keller');
  await page.getByTestId('ctab-ask').click();
  await page.getByTestId('suggest-keller_next_call').click();
  await page.getByTestId('answer-advice').waitFor({ timeout: 20000 });
  const st = await page.evaluate(() => JSON.parse(localStorage.getItem('relationship-engine-demo-v1')).requests);
  expect(st.some((r) => /held back/.test(r.rmDraft || '')), 'RM sees held-back draft');
  await shot(page, 'robust-badnumber');
});
await step('reload mid-flow keeps state', async () => {
  mock('ok');
  await page.goto(BASE + '/rm/client/albers/advice');
  if (await page.getByTestId('review-accept').count()) await page.getByTestId('review-accept').check();
  await page.getByTestId('approve-doc').click();
  await page.getByRole('button', { name: 'Close' }).click();
  await page.reload();
  await page.getByTestId('open-audit').waitFor();
});
await step('two tabs in split view stay in sync', async () => {
  const p2 = await context.newPage();
  await page.goto(BASE + '/split?client=albers');
  await p2.goto(BASE + '/split?client=albers');
  await p2.getByTestId('ctab-invest').click();
  await p2.getByTestId('client-ack').click();
  await page.waitForFunction(() => document.querySelector('[data-testid="step-2"]')?.getAttribute('data-state') === 'done', null, { timeout: 5000 });
  await p2.close();
});
await step('Reset demo clears state', async () => {
  await page.goto(BASE + '/rm/plan');
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await page.getByRole('button', { name: 'Yes, reset' }).click();
  const st = await page.evaluate(() => JSON.parse(localStorage.getItem('relationship-engine-demo-v1') || '{}'));
  expect(!st.albers?.audit && (st.requests ?? []).length === 0, 'state cleared');
});
mock('ok');
await browser.close();
done(errors);
