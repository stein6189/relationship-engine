/* Warm the cache with LIVE outputs for every AI call on the demo path.
 *
 * 1. Start the app with a key:  ANTHROPIC_API_KEY=… npm run build && npx next start -p 3100
 * 2. Run:                       BASE_URL=http://localhost:3100 npm run warm-cache
 *
 * It runs DEMO.md end to end in Live mode (tests/e2e/demo.mjs), then drafts the 60 digital touchpoints via the API,
 * and writes every output that came back live AND passed validation to data/cache/<promptId>__<key>.json.
 * The labelled test case (wrong number) is never overwritten. Then it rebuilds lib/seedCache.ts. Commit the result. */
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import clientsJson from '../data/clients.json';

const BASE = process.env.BASE_URL || 'http://localhost:3100';
const auth: Record<string, string> = process.env.DEMO_PASSWORD ? { authorization: 'Basic ' + Buffer.from('demo:' + process.env.DEMO_PASSWORD).toString('base64') } : {};
const dir = path.join(__dirname, '..', 'data', 'cache');
const dump = path.join(__dirname, '..', 'test-results', 'warm-dump.json');
fs.mkdirSync(path.dirname(dump), { recursive: true });

function save(task: string, key: string, meta: any, output: any) {
  const file = path.join(dir, `${task}__${key}.json`);
  const prev = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
  if (prev?.output?.testCase) { console.log(`skip ${task}__${key} (labelled test case)`); return; }
  if (meta?.source !== 'live' || meta?.validation === 'failed' || !output) return;
  if (meta.guard && !meta.guard.pass) { console.log(`skip ${task}__${key}: number guard failed (${meta.guard.unsupported.join(', ')})`); return; }
  // V2 reads trigger/facts from the cache entry; keep them.
  const keep = prev?.output && task === 'draft_touchpoint' ? { trigger: prev.output.trigger, facts: prev.output.facts, testCase: false } : {};
  fs.writeFileSync(file, JSON.stringify({ promptId: task, key, promptVersion: meta.promptVersion, model: meta.model, createdAt: meta.timestamp, output: { ...output, ...keep } }, null, 1));
  console.log(`saved ${task}__${key} (${meta.model}, ${meta.latencyMs} ms)`);
}

async function main() {
  const probe = await fetch(`${BASE}/api/ai/extract_signals`, { headers: auth }).then((r) => r.json());
  if (!probe.liveAvailable) throw new Error('Server has no ANTHROPIC_API_KEY — start it with a key first.');

  execFileSync('node', ['tests/e2e/demo.mjs', 'live'], { stdio: 'inherit', env: { ...process.env, BASE_URL: BASE, WARM_DUMP: dump, SHOTS_DIR: 'test-results/warm-shots' } });
  const log = JSON.parse(fs.readFileSync(dump, 'utf8')) as { task: string; meta: any; output: any }[];
  for (const e of [...log].reverse()) save(e.task, e.meta.cacheKey, e.meta, e.output);

  const clients = clientsJson as any[];
  for (const f of fs.readdirSync(dir).filter((x) => /^draft_touchpoint__(c\d+|hofmann)\.json$/.test(x))) {
    const prev = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    if (prev.output.testCase || !prev.model.startsWith('seed')) continue;
    const id = prev.key;
    const c = clients.find((x) => x.id === id);
    const input = { cacheKey: id, client: { firstName: c.firstName, tonePreference: c.prefersLowContact ? 'short, warm; prefers no calls' : 'short, warm' }, trigger: prev.output.trigger, facts: prev.output.facts, history: [] };
    const r = await fetch(`${BASE}/api/ai/draft_touchpoint`, { method: 'POST', headers: { 'content-type': 'application/json', ...auth }, body: JSON.stringify({ mode: 'live', input }) }).then((x) => x.json());
    save('draft_touchpoint', id, r.meta, r.output);
  }
  execFileSync('npx', ['tsx', 'scripts/build-seed-index.ts'], { stdio: 'inherit' });
}
main().catch((e) => { console.error(e); process.exit(1); });
