// A fake Anthropic Messages API for robustness tests (QA round D). Never used in production.
// MOCK_MODE: ok (seed output, like a perfect model) | invalid (non-JSON text) | slow (25 s) | badnumber (inserts a wrong number)
import http from 'http';
import fs from 'fs';
import path from 'path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const cache = Object.fromEntries(fs.readdirSync(path.join(root, 'data/cache')).map((f) => [f.replace('.json', ''), JSON.parse(fs.readFileSync(path.join(root, 'data/cache', f), 'utf8')).output]));
const prompts = Object.fromEntries(fs.readdirSync(path.join(root, 'prompts')).filter((f) => f !== 'README.md').map((f) => [f.replace('.md', ''), fs.readFileSync(path.join(root, 'prompts', f), 'utf8').split('## System')[1].trim().split('\n')[0]]));
const mode = () => { try { return fs.readFileSync('/tmp/mock-mode', 'utf8').trim(); } catch { return process.env.MOCK_MODE || 'ok'; } };
const generic = {
  extract_signals: { signals: [], churnReasonHypothesis: 'none' },
  meeting_brief: { sentences: [{ text: 'No new messages this quarter; the portfolio is the main topic.', sourceIds: ['f_value'] }], openQuestionsForClient: ['Have your plans changed?'], prepareDocuments: ['Portfolio overview'], confidence: 0.7 },
  route_client_question: { category: 'out_of_scope', clientAnswer: 'I can only answer questions about your own portfolio here. Jonas is happy to help with anything else.', rmDraft: '', factsUsed: [], confidence: 0.8 },
  draft_touchpoint: { subject: 'Your update', body: 'Dear client, a short update from Jonas.', messageType: 'informational', factsUsed: [], confidence: 0.8 },
};
http.createServer((req, res) => {
  let body = '';
  req.on('data', (d) => (body += d));
  req.on('end', async () => {
    const j = JSON.parse(body || '{}');
    const sys = typeof j.system === 'string' ? j.system : '';
    const task = Object.entries(prompts).find(([, first]) => sys.startsWith(first))?.[0];
    const input = JSON.parse(j.messages?.[0]?.content ?? '{}');
    const m = mode();
    let out = cache[`${task}__${input.cacheKey}`] ?? generic[task] ?? {};
    if (task === 'draft_touchpoint' && out.facts) { const { trigger, facts, testCase, ...rest } = out; out = rest; }
    let text = JSON.stringify(out);
    if (m === 'invalid') text = 'Sorry, here is my answer in prose instead of JSON.';
    if (m === 'badnumber') text = text.replace(/€(\d)/, '€9$1');
    if (m === 'slow') await new Promise((r) => setTimeout(r, 25000));
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ id: 'msg_mock', type: 'message', role: 'assistant', model: j.model, content: [{ type: 'text', text }], stop_reason: 'end_turn', usage: { input_tokens: 1, output_tokens: 1 } }));
  });
}).listen(3999, () => console.log('mock anthropic on 3999, mode', mode()));
