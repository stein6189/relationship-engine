// Screenshots for the demo guide: each shot marks where to click with numbered red badges.
// Usage: node tests/e2e/guide-shots.mjs [outDir]  (cached mode, BASE_URL default localhost:3100)
import fs from 'fs';
import { setup, BASE } from './lib.mjs';
const OUT = process.argv[2] || 'test-results/guide';
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
const { browser, page } = await setup({ mode: 'cached' });
const T = { timeout: 30000 };
const id = (x) => page.getByTestId(x).first();
const settle = () => page.waitForTimeout(500);

async function shot(name, marks = []) {
  if (marks[0]) await marks[0].scrollIntoViewIfNeeded().catch(() => {});
  await settle();
  for (const [i, m] of marks.entries()) await m.evaluate((e, n) => { e.dataset.guideMark = String(n); }, i + 1);
  await page.evaluate(() => {
    for (const e of document.querySelectorAll('[data-guide-mark]')) {
      const r = e.getBoundingClientRect();
      const box = document.createElement('div'); box.className = 'guide-x';
      Object.assign(box.style, { position: 'fixed', left: r.left - 4 + 'px', top: r.top - 4 + 'px', width: r.width + 8 + 'px', height: r.height + 8 + 'px', border: '3px solid #DC2626', borderRadius: '8px', zIndex: 99998, pointerEvents: 'none' });
      const b = document.createElement('div'); b.className = 'guide-x'; b.textContent = e.dataset.guideMark;
      Object.assign(b.style, { position: 'fixed', left: Math.max(2, r.left - 16) + 'px', top: Math.max(2, r.top - 16) + 'px', width: '26px', height: '26px', borderRadius: '13px', background: '#DC2626', color: '#fff', font: '700 14px Inter, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, pointerEvents: 'none', boxShadow: '0 1px 4px rgba(0,0,0,.3)' });
      document.body.append(box, b);
    }
  });
  await page.screenshot({ path: `${OUT}/${name}.png` });
  await page.evaluate(() => { document.querySelectorAll('.guide-x').forEach((x) => x.remove()); document.querySelectorAll('[data-guide-mark]').forEach((e) => e.removeAttribute('data-guide-mark')); });
  console.log('  shot', name);
}

// 0–2 Plan
await page.goto(BASE + '/rm/plan');
await shot('01-plan', [page.getByText(/^Demo date:/).first(), id('run-orchestration')]);
await id('run-orchestration').click();
await page.getByText('14 clients read live').waitFor({ timeout: 90000 });
await shot('02-orchestrated', [id('pipeline-steps'), id('capacity')]);
// 3 Berger
const berger = page.getByTestId('lane-rm').getByTestId('card-berger');
await berger.getByTestId('action-meeting').click();
await shot('03-berger', [berger, berger.getByTestId('action-meeting')]);
// 3b Case A
await id('plan-find').fill('Laura Schwarz');
await page.getByTestId('lane-digital').getByTestId('row-c017').waitFor();
await shot('03b-schwarz', [id('plan-find'), page.getByTestId('lane-digital').getByTestId('row-c017')]);
await id('plan-find').fill('Ines Schmidt');
await page.getByTestId('lane-rm').getByTestId('card-c082').waitFor();
await shot('03c-schmidt', [id('plan-find'), page.getByTestId('lane-rm').getByTestId('card-c082')]);
await id('plan-find').fill('');
// 4 control group
await shot('04-control', [id('control-chip')]);
// 5 Albers
const albersLink = page.getByTestId('lane-rm').getByTestId('card-albers').getByRole('link').first();
await shot('05a-albers-card', [albersLink]);
await albersLink.click();
await id('brief-sentences').waitFor(T);
await shot('05b-albers-360', [id('open-items'), page.getByRole('button', { name: 'Advisory follow-up' })]);
// 6–7 Advice
await page.getByRole('button', { name: 'Advisory follow-up' }).click();
await id('draft-doc').waitFor(T);
await shot('06a-draft-button', [id('draft-doc')]);
await id('draft-doc').click();
await id('approve-panel').waitFor({ timeout: 60000 });
await id('verifier-panel').getByText(/\d+ \/ \d+ supported/).waitFor({ timeout: 60000 });
await shot('06b-draft', [id('cost-table'), id('verifier-panel'), id('run-verifier-test')]);
await id('run-verifier-test').click();
await id('sent-test').waitFor(T);
await page.waitForFunction(() => /unsupported|number guard/.test(document.querySelector('[data-testid="sent-test"]')?.textContent || ''), null, { timeout: 60000 });
await shot('07a-verifier-test', [id('sent-test'), id('remove-test')]);
await id('remove-test').click();
if (await page.getByTestId('review-accept').count()) await id('review-accept').check();
await shot('07b-approve', [id('approve-doc')]);
await id('approve-doc').click();
await id('audit-record').waitFor();
await shot('07c-audit', [id('audit-record')]);
await page.getByRole('button', { name: 'Close' }).click();
// 8 Split Albers
await page.goto(BASE + '/split?client=albers');
await id('contradiction').waitFor(T);
await id('ctab-invest').click();
await shot('08a-contradiction', [id('contradiction'), id('use-notes')]);
await id('use-notes').click();
await shot('08b-questionnaire', [id('update-questionnaire')]);
await id('update-questionnaire').click();
await shot('08c-attest', [id('attest-tick'), id('attest')]);
await id('attest-tick').check(); await id('attest').click();
await shot('08d-client-reads', [id('doc-costs'), id('client-ack')]);
await id('doc-costs').click(); await id('client-ack').click();
await shot('08e-sign', [id('client-sign')]);
await id('client-sign').click();
await shot('08f-fund', [id('client-fund')]);
await id('client-fund').click();
await shot('08g-done', [id('step-5')]);
// 9 Touchpoints
await page.goto(BASE + '/rm/plan');
await shot('09a-nav', [page.getByRole('link', { name: 'Touchpoints' }).first()]);
await page.goto(BASE + '/rm/touchpoints');
await id('tp-hofmann').waitFor();
const tc = page.locator('[data-testid^="tp-c"]', { hasText: 'Test case' }).first();
await shot('09b-touchpoints', [id('tp-hofmann'), id('approve-all')]);
await tc.scrollIntoViewIfNeeded();
await shot('09c-test-case', [tc]);
await id('approve-all').click();
await shot('09d-confirm', [id('confirm-approve-all')]);
await id('confirm-approve-all').click();
// 10 Keller
await page.goto(BASE + '/rm/client/keller');
await id('ai-brief').waitFor(T);
await shot('10a-keller-360', [page.getByRole('button', { name: 'Liquidity view' }), id('company-account')]);
await page.getByRole('button', { name: 'Liquidity view' }).click();
await id('gap-steps').waitFor(T);
await id('fund-notice').getByText('matches schedule').first().waitFor(T);
await shot('10b-gap', [id('gap-steps')]);
await shot('10c-notice', [id('fund-notice'), id('data-check')]);
await shot('10d-options', [id('options'), id('pick-bridge')]);
await id('pick-bridge').click();
await id('approve-keller-msg').waitFor(T);
await shot('10e-approve', [id('approve-keller-msg')]);
await id('approve-keller-msg').click();
// 11 Split Keller
await page.goto(BASE + '/split?client=keller');
await id('keller-proposal').waitFor(T);
await shot('11a-split-keller', [id('keller-proposal'), id('ctab-ask')]);
await id('ctab-ask').click();
await id('suggest-keller_negative').click();
await id('answer-factual').waitFor(T);
await shot('11b-ask', [id('suggest-keller_negative'), id('suggest-keller_sell'), id('suggest-keller_election')]);
await id('suggest-keller_sell').click(); await id('answer-advice').waitFor(T);
await id('suggest-keller_election').click();
await page.waitForFunction(() => document.querySelectorAll('[data-testid="answer-advice"]').length >= 2, null, T);
await shot('11c-routed', [page.getByTestId('answer-advice').last(), id('split-requests')]);
// 11b pipeline, 12 hood
await page.goto(BASE + '/rm/plan');
await page.locator('[data-testid^="pipeline-albers-"]').first().waitFor();
await shot('11d-pipeline', [page.locator('[data-testid^="pipeline-albers-"]').first(), id('requests')]);
await page.goto(BASE + '/rm/hood');
await id('hood-log').waitFor();
await page.getByRole('button', { name: 'Details' }).first().click();
await page.getByText('Facts passed in').or(page.getByText('Raw JSON output')).first().waitFor();
await shot('12-hood', [page.getByText('Facts passed in').or(page.getByText('Raw JSON output')).first()]);
await browser.close();
console.log('done', fs.readdirSync(OUT).length);
