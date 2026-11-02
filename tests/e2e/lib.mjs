// Minimal e2e harness on top of the pre-installed `playwright` library (no test-runner dependency).
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

export const BASE = process.env.BASE_URL || 'http://localhost:3100';
export const SHOTS = process.env.SHOTS_DIR || 'qa-screens';
fs.mkdirSync(SHOTS, { recursive: true });

export async function setup({ mode = 'live', width = 1440, height = 900 } = {}) {
  const browser = await chromium.launch();
  const httpCredentials = process.env.DEMO_PASSWORD ? { username: 'demo', password: process.env.DEMO_PASSWORD } : undefined;
  const context = await browser.newContext({ viewport: { width, height }, httpCredentials });
  const errors = [];
  context.on('page', (p) => watch(p, errors));
  context.setDefaultTimeout(12000);
  const page = await context.newPage();
  watch(page, errors);
  await page.goto(BASE + '/rm/plan');
  await page.evaluate((m) => { localStorage.clear(); localStorage.setItem('relationship-engine-demo-v1', JSON.stringify({ mode: m })); }, mode);
  await page.reload();
  return { browser, context, page, errors };
}

function watch(page, errors) {
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('requestfailed', (r) => { const u = r.url(); if (!u.includes('_rsc') && !u.includes('__nextjs')) errors.push(`requestfailed: ${u} ${r.failure()?.errorText}`); });
  page.on('response', (r) => { if (r.status() >= 400) errors.push(`http ${r.status()}: ${r.url()}`); });
}

let failures = 0;
export async function step(name, fn) {
  const t = Date.now();
  try { await fn(); console.log(`  ✓ ${name} (${Date.now() - t} ms)`); }
  catch (e) { failures++; console.log(`  ✗ ${name}\n    ${String(e.message).split('\n').slice(0, 4).join('\n    ')}`); }
}
export function expect(cond, msg) { if (!cond) throw new Error(msg); }
export async function shot(page, name) { await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true }); }
export async function text(page, sel) { return (await page.locator(sel).first().innerText()); }
export function done(errors) {
  const real = errors.filter((e) => !/favicon/.test(e));
  if (real.length) { console.log('  ✗ console/network errors:\n    ' + [...new Set(real)].slice(0, 15).join('\n    ')); failures++; }
  else console.log('  ✓ zero console errors, zero failed requests');
  console.log(failures ? `FAILED (${failures})` : 'PASSED');
  process.exitCode = failures ? 1 : 0;
}
