// Per-view smoke tests + screenshots. Usage: node tests/e2e/views.mjs [mode]
import { setup, step, expect, shot, done, BASE } from './lib.mjs';
const mode = process.argv[2] || 'cached';
const { browser, page, errors } = await setup({ mode });
console.log(`views · ${mode} · ${BASE}`);

await step('V1 plan loads with lanes and capacity', async () => {
  await page.goto(BASE + '/rm/plan');
  await page.getByTestId('capacity').waitFor();
  expect((await page.getByTestId('capacity').innerText()).includes('20 / 20'), 'capacity 20/20');
  for (const id of ['albers', 'keller', 'berger']) await page.getByTestId('lane-rm').getByTestId(`card-${id}`).waitFor();
  await page.getByTestId('lane-digital').getByTestId('row-hofmann').waitFor();
  expect(await page.getByText('Control group').count() > 0, 'control group visible');
  await shot(page, 'v1-plan');
});

await step('V2 touchpoints: Hofmann, test case red, batch approve', async () => {
  await page.goto(BASE + '/rm/touchpoints');
  const hof = page.getByTestId('tp-hofmann');
  await hof.waitFor();
  const t = await hof.innerText();
  expect(t.includes('2030') && t.includes('€700,000') && t.includes('+6.2%'), 'Hofmann uses own numbers + goal');
  const body = await hof.getByTestId('tp-body').innerText();
  expect(!/log ?in|logged|app|page view|visited|viewed/i.test(body), 'no tracked behaviour in client message');
  const tc = page.locator('[data-testid^="tp-"]', { hasText: 'Test case' });
  expect(await tc.count() === 1, 'one test case');
  expect((await tc.innerText()).includes('number check ✗'), 'test case flagged red');
  await shot(page, 'v2-touchpoints');
  await page.getByTestId('approve-all').click();
  await page.waitForTimeout(300);
  expect((await hof.innerText()).includes('approved'), 'Hofmann approved by batch');
  expect((await tc.innerText()).includes('number check ✗'), 'test case not approved');
});

await step('Clients list', async () => {
  await page.goto(BASE + '/rm/clients');
  await page.getByTestId('client-row-albers').waitFor();
  await page.getByLabel('Search clients').fill('Keller');
  expect(await page.locator('[data-testid^="client-row-"]').count() >= 1, 'search works');
  await page.getByLabel('Search clients').fill('');
  await shot(page, 'clients');
});

for (const [name, path, probe] of [
  ['V3 Albers 360', '/rm/client/albers', 'ai-brief'],
  ['V3 Keller 360', '/rm/client/keller', 'ai-brief'],
  ['V3 generic client', '/rm/client/c020', 'timeline'],
  ['V4 Albers advice', '/rm/client/albers/advice', 'notes'],
  ['V5 Albers subscription', '/rm/client/albers/subscription', 'qual-checks'],
  ['V6 Keller liquidity', '/rm/client/keller/liquidity', 'gap-steps'],
  ['V7 client app Keller', '/client/keller', 'phone'],
  ['V7 client app Albers', '/client/albers', 'phone'],
  ['V7 client app Hofmann', '/client/hofmann', 'phone'],
  ['Split view Albers', '/split?client=albers', 'phone'],
  ['Split view Keller', '/split?client=keller', 'phone'],
  ['V8 under the hood', '/rm/hood', 'hood'],
  ['About', '/rm/about', 'about'],
]) {
  if (process.env.ONLY && !process.env.ONLY.split(',').some((o) => path.includes(o))) continue;
  await step(name, async () => {
    await page.goto(BASE + path);
    await page.getByTestId(probe).first().waitFor({ timeout: 25000 });
    await page.waitForTimeout(800);
    await shot(page, name.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
  });
}

await browser.close();
done(errors);
