'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { useStore, uid, type AuditRecord } from '@/lib/state/store';
import { useAi } from '@/lib/ai/client';
import { clientById } from '@/lib/data';
import { SECTIONS, sentencesOf, albersAllFacts, albersSources, albersRuleResults, type Sentence } from '@/lib/albers';
import { numberGuard } from '@/lib/rules/numberGuard';
import { simStamp } from '@/lib/rules/format';
import { MINUTES_SAVED, RM_NAME, SIM_TODAY } from '@/lib/rules/config';
import { DATA_NOTES_ALBERS } from '@/lib/notes';
import { sourceMap } from '@/lib/timeline';
import { AiMetaBadge } from '@/components/AiMetaBadge';
import { GuardedText } from '@/components/GuardedText';
import { CostTable } from '@/components/CostTable';
import { SourceChip } from '@/components/views/Client360';
import { Badge, Button, Card, Drawer, SectionTitle, Spinner, Term } from '@/components/ui';

type Status = { tone: 'green' | 'red' | 'amber' | 'slate'; label: string; reason?: string };

export function AlbersAdvice({ embedded }: { embedded?: boolean }) {
  const { s, update } = useStore();
  const ai = useAi();
  const a = s.albers;
  const c = clientById('albers')!;
  const facts = useMemo(() => albersAllFacts(), []);
  const map = useMemo(() => sourceMap(c), [c]);
  const [busy, setBusy] = useState<'' | 'draft' | 'verify'>('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [auditOpen, setAuditOpen] = useState(false);
  const snapshot: Record<string, string> = (a as any).verifySnapshot ?? {};

  const setA = (patch: Partial<typeof a> & Record<string, unknown>) => update((x) => ({ ...x, albers: { ...x.albers, ...patch } }));
  const all = sentencesOf(a.draft, a.testInserted);
  const visible = all.filter((x) => !a.removed.includes(x.id));
  const textOf = (x: Sentence) => a.edits[x.id] ?? x.text;
  const results: Record<string, any> = Object.fromEntries((a.verify?.results ?? []).map((r: any) => [r.sentenceId, r]));

  const status = (x: Sentence): Status => {
    const t = textOf(x);
    const g = numberGuard(t, facts);
    if (!g.pass) return { tone: 'red', label: `number check ✗ ${g.unsupported.map((u) => u.raw).join(', ')}`, reason: 'A number in this sentence is not in the facts computed by code.' };
    if (a.verify && snapshot[x.id] !== undefined && snapshot[x.id] !== t) return { tone: 'amber', label: 'edited — re-run verifier' };
    const r = results[x.id];
    if (!r) return { tone: 'slate', label: a.verify ? 'not verified — re-run verifier' : 'not verified yet' };
    if (r.verdict === 'supported') return { tone: 'green', label: 'supported', reason: r.reason };
    return { tone: 'red', label: r.verdict === 'advisory_language' ? 'advisory language' : 'unsupported', reason: r.reason };
  };

  const msgBody = a.edits.msg ?? a.draft?.clientMessage?.body ?? '';
  const crm = a.edits.crm ?? a.draft?.crmNote ?? '';
  const msgGuard = numberGuard(msgBody, facts);
  const crmGuard = numberGuard(crm, facts);
  const flagged = visible.filter((x) => status(x).tone !== 'green').length + (msgGuard.pass ? 0 : 1) + (crmGuard.pass ? 0 : 1);
  const canApprove = !!a.verify && !a.audit && (flagged === 0 || a.reviewedAccept);

  async function verify(testInserted = a.testInserted, draft = a.draft, edits = a.edits, removed = a.removed) {
    setBusy('verify');
    const sents = sentencesOf(draft, testInserted).filter((x) => !removed.includes(x.id)).map((x) => ({ id: x.id, text: edits[x.id] ?? x.text }));
    const anyEdits = sents.some((x) => edits[x.id] !== undefined);
    const r = await ai<any>('verify_draft', { cacheKey: sents.some((x) => x.id === 'test') ? 'albers_test' : 'albers', sentences: sents, sources: albersSources(a.notes), ...(anyEdits ? { note: 'RM edited some sentences' } : {}) }, { clientId: 'albers', label: 'Verifier · Albers suitability' });
    update((x) => ({ ...x, albers: { ...x.albers, verify: r.output ?? { results: [], overall: 'needs_review' }, verifyMeta: r.meta, verifySnapshot: Object.fromEntries(sents.map((q) => [q.id, q.text])) } as any }));
    setBusy('');
  }

  async function draft() {
    setBusy('draft');
    const rules = albersRuleResults(a.attested);
    const r = await ai<any>('draft_suitability', {
      cacheKey: 'albers', meetingNotes: { id: 'notes', text: a.notes },
      clientFacts: facts.filter((f) => f.id.startsWith('f_') || f.id.startsWith('r_')), productFacts: facts.filter((f) => f.id.startsWith('p_') || f.id.startsWith('c_')),
      ruleResults: rules.checks.map((k) => ({ id: k.id, label: k.label, pass: k.pass, detail: k.detail })),
      sources: albersSources(a.notes).filter((x) => !x.id.startsWith('f_') && !x.id.startsWith('p_') && !x.id.startsWith('c_') && !x.id.startsWith('r_')), facts,
    }, { clientId: 'albers', label: 'Draft · Albers suitability' });
    const fresh = { draft: r.output, draftMeta: r.meta, edits: {}, removed: [], testInserted: false, reviewedAccept: false, verify: undefined, verifyMeta: undefined, verifySnapshot: undefined };
    update((x) => ({ ...x, albers: { ...x.albers, ...fresh } as any }));
    setBusy('');
    if (r.output) await verify(false, r.output, {}, []);
  }

  async function runTest() {
    setA({ testInserted: true, removed: a.removed.filter((x) => x !== 'test') });
    await verify(true, a.draft, a.edits, a.removed.filter((x) => x !== 'test'));
  }

  function approve() {
    const rules = albersRuleResults(a.attested);
    const changes: AuditRecord['changes'] = [
      ...all.filter((x) => a.edits[x.id] !== undefined && !a.removed.includes(x.id)).map((x) => ({ id: x.id, before: x.text, after: a.edits[x.id] })),
      ...all.filter((x) => a.removed.includes(x.id)).map((x) => ({ id: x.id, before: a.edits[x.id] ?? x.text, after: null })),
      ...(a.edits.msg !== undefined ? [{ id: 'clientMessage', before: a.draft.clientMessage.body, after: a.edits.msg }] : []),
      ...(a.edits.crm !== undefined ? [{ id: 'crmNote', before: a.draft.crmNote, after: a.edits.crm }] : []),
    ];
    const audit: AuditRecord = {
      approvedBy: RM_NAME, approvedAt: new Date().toISOString(),
      sources: [...new Set(visible.flatMap((x) => x.sourceIds))],
      draftModel: a.draftMeta?.model ?? '—', draftPrompt: `${a.draftMeta?.promptId} ${a.draftMeta?.promptVersion}`,
      verifyModel: a.verifyMeta?.model ?? '—', verifyPrompt: `${a.verifyMeta?.promptId} ${a.verifyMeta?.promptVersion}`,
      changes, ruleChecks: rules.checks.map((k) => ({ label: k.label, pass: k.pass })), reviewedDespiteFlags: flagged > 0, guardPass: visible.every((x) => numberGuard(textOf(x), facts).pass) && msgGuard.pass,
    };
    const statement = SECTIONS.map(([k, label]) => `${label}: ${visible.filter((x) => x.section === k).map(textOf).join(' ')}`).join('\n\n');
    update((x) => ({
      ...x, minutesSaved: x.minutesSaved + MINUTES_SAVED.documentation,
      albers: { ...x.albers, audit, ...({ finalStatement: statement } as any) },
      inbox: { ...x.inbox, albers: [
        { id: uid(), subject: a.draft.clientMessage.subject, body: msgBody, date: SIM_TODAY, kind: 'message' },
        { id: 'doc_costs', subject: 'Cost disclosure · Meridian Buyout V', body: 'Ex-ante cost disclosure, computed from the fund terms.', date: SIM_TODAY, kind: 'document' },
        { id: 'doc_suitability', subject: 'Suitability statement · Meridian Buyout V', body: statement, date: SIM_TODAY, kind: 'document' },
        ...(x.inbox.albers ?? []).filter((m) => !m.id.startsWith('doc_')),
      ] },
    }));
    setAuditOpen(true);
  }

  return (
    <div className="space-y-4" data-testid="advice">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Advisory follow-up · Claudia Albers</h1>
          <p className="text-sm text-slate-500">Meeting 5 Nov 2026 · Meridian Buyout V (<Term t="AIF">AIF</Term>) · €200,000. The AI drafts, a second AI call checks, code adds the costs — you own the result.</p>
        </div>
        {!embedded && <div className="flex gap-1.5"><Link href="/rm/client/albers"><Button>Client 360</Button></Link><Link href="/rm/client/albers/subscription"><Button>Subscription →</Button></Link></div>}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(280px,0.8fr)_2fr]">
        <div className="space-y-4">
          <Card className="p-4">
            <SectionTitle>Meeting notes (RM)</SectionTitle>
            <textarea data-testid="notes" aria-label="Meeting notes" className="h-60 w-full rounded-lg border border-slate-300 p-2 text-sm leading-relaxed" value={a.notes} onChange={(e) => setA({ notes: e.target.value })} disabled={!!a.audit} />
            <div className="mt-2 flex items-center justify-between gap-2">
              <button className="text-xs text-slate-500 underline" onClick={() => setA({ notes: DATA_NOTES_ALBERS })} disabled={!!a.audit}>Reset notes</button>
              <Button variant="primary" onClick={draft} disabled={!!busy || !!a.audit} data-testid="draft-doc">{busy === 'draft' ? <><Spinner /> Drafting…</> : a.draft ? 'Redraft documentation' : 'Draft documentation'}</Button>
            </div>
          </Card>
          <Card className="p-4 text-xs">
            <SectionTitle>Sources the AI may use</SectionTitle>
            <ul className="space-y-1">{albersSources(a.notes).filter((x) => !/^[fprc]_/.test(x.id)).map((x) => <li key={x.id}><span className="font-mono text-slate-500">{x.id}</span> — {x.text.slice(0, 110)}{x.text.length > 110 ? '…' : ''}</li>)}</ul>
            <div className="mt-2 text-slate-500">+ {facts.length} facts computed by code (amounts, shares, costs). Hover any source id in the draft.</div>
          </Card>
          {a.draft && (
            <Card className="p-4" data-testid="verifier-panel">
              <SectionTitle>Checks</SectionTitle>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between"><span>Verifier (separate AI call)</span>{busy === 'verify' ? <Spinner /> : a.verify ? <Badge tone={visible.every((x) => results[x.id]?.verdict === 'supported') ? 'green' : 'red'}>{visible.filter((x) => results[x.id]?.verdict === 'supported').length} / {visible.length} supported</Badge> : <Badge>not run</Badge>}</div>
                <div className="flex justify-between"><span>Number guard (code)</span><Badge tone={visible.every((x) => numberGuard(textOf(x), facts).pass) && msgGuard.pass && crmGuard.pass ? 'green' : 'red'}>{visible.every((x) => numberGuard(textOf(x), facts).pass) && msgGuard.pass && crmGuard.pass ? 'all numbers in facts' : 'unknown number'}</Badge></div>
                <div className="flex justify-between"><span>Items to review</span><b className={clsx('tnum', flagged ? 'text-red-700' : 'text-green-700')} data-testid="flag-count">{flagged}</b></div>
                {a.verifyMeta && <AiMetaBadge meta={a.verifyMeta} output={a.verify} />}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <Button className="text-xs" onClick={() => verify()} disabled={!!busy || !!a.audit}>Re-run verifier</Button>
                  <Button className="text-xs" onClick={runTest} disabled={!!busy || !!a.audit || (a.testInserted && !a.removed.includes('test'))} data-testid="run-verifier-test">Run verifier test</Button>
                </div>
                <p className="text-[11px] text-slate-500">The verifier test inserts a labelled “Test case” sentence with an unsupported forecast, so you can see the check catch it.</p>
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          {!a.draft && !busy && <Card className="p-8 text-center text-sm text-slate-500">Review the notes, then “Draft documentation”. You get a suitability statement, the cost disclosure, a client message and a CRM note.</Card>}
          {busy === 'draft' && <Card className="flex items-center gap-2 p-8 text-sm text-slate-500"><Spinner /> Drafting with the smart model, then verifying…</Card>}
          {a.draft && (
            <>
              <Card className="p-4" data-testid="suitability">
                <SectionTitle right={<AiMetaBadge meta={a.draftMeta} output={a.draft} facts={facts} confidence={a.draft.confidence} hideGuard />}>1 · <Term t="suitability">Suitability statement</Term></SectionTitle>
                <div className="space-y-3">
                  {SECTIONS.map(([key, label]) => (
                    <div key={key}>
                      <div className="text-xs font-semibold text-slate-500">{label}</div>
                      <ul className="mt-1 space-y-1">
                        {visible.filter((x) => x.section === key).map((x) => {
                          const st = status(x);
                          const t = textOf(x);
                          const g = numberGuard(t, facts);
                          return (
                            <li key={x.id} data-testid={`sent-${x.id}`} className={clsx('group rounded-md border-l-2 px-2 py-1 text-sm', st.tone === 'green' ? 'border-green-500' : st.tone === 'red' ? 'border-red-500 bg-red-50/60' : st.tone === 'amber' ? 'border-amber-500 bg-amber-50/60' : 'border-slate-300')}>
                              {editing === x.id ? (
                                <div className="space-y-1">
                                  <textarea aria-label="Edit sentence" className="w-full rounded border border-slate-300 p-1.5 text-sm" value={editText} onChange={(e) => setEditText(e.target.value)} />
                                  <div className="flex justify-end gap-1"><Button className="text-xs" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button><Button className="text-xs" variant="primary" onClick={() => { setA({ edits: { ...a.edits, [x.id]: editText } }); setEditing(null); }}>Save</Button></div>
                                </div>
                              ) : (
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    {x.test && <Badge tone="amber" className="mr-1">Test case</Badge>}
                                    <GuardedText text={t} unsupported={g.unsupported.map((u) => u.raw)} />
                                    {x.sourceIds.map((sid) => <SourceChip key={sid} id={sid} map={map} />)}
                                    {a.edits[x.id] !== undefined && <div className="mt-0.5 text-[11px] text-slate-400 line-through">{x.text}</div>}
                                    {st.tone !== 'green' && st.reason && <div className="mt-0.5 text-[11px] text-red-700">{st.reason}</div>}
                                  </div>
                                  <div className="flex shrink-0 items-center gap-1">
                                    <Badge tone={st.tone} title={st.reason}>{st.label}</Badge>
                                    {!a.audit && <>
                                      <button className="text-[11px] text-slate-500 hover:text-accent" onClick={() => { setEditing(x.id); setEditText(t); }}>edit</button>
                                      <button className="text-[11px] text-slate-500 hover:text-red-700" aria-label={`Remove ${x.id}`} data-testid={`remove-${x.id}`} onClick={() => setA({ removed: [...a.removed, x.id] })}>remove</button>
                                    </>}
                                  </div>
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
                {a.draft.openPoints?.length > 0 && <div className="mt-3 rounded-lg bg-amber-50 p-2 text-sm text-amber-900"><b>Open points for the RM:</b> {a.draft.openPoints.join(' ')}</div>}
                {a.removed.length > 0 && !a.audit && <div className="mt-2 text-xs text-slate-500">Removed: {a.removed.join(', ')} · <button className="underline" onClick={() => setA({ removed: [] })}>restore</button></div>}
              </Card>

              <Card className="p-4">
                <SectionTitle right={<Badge tone="teal">computed by code — not written by AI</Badge>}>2 · Ex-ante cost disclosure</SectionTitle>
                <CostTable />
              </Card>

              <div className="grid gap-4 lg:grid-cols-2">
                <Card className="p-4">
                  <SectionTitle right={<Badge tone={msgGuard.pass ? 'green' : 'red'}>{msgGuard.pass ? 'numbers ✓' : 'number check ✗'}</Badge>}>3 · Client message</SectionTitle>
                  <div className="text-sm font-medium">{a.draft.clientMessage.subject}</div>
                  <textarea aria-label="Client message" className="mt-1 h-36 w-full rounded border border-slate-200 p-1.5 text-sm" value={msgBody} disabled={!!a.audit} onChange={(e) => setA({ edits: { ...a.edits, msg: e.target.value } })} />
                  {!msgGuard.pass && <div className="text-xs text-red-700">Unknown number: {msgGuard.unsupported.map((u) => u.raw).join(', ')}</div>}
                  <p className="text-[11px] text-slate-500">Sent with the two documents only after you approve.</p>
                </Card>
                <Card className="p-4">
                  <SectionTitle right={<Badge tone={crmGuard.pass ? 'green' : 'red'}>{crmGuard.pass ? 'numbers ✓' : 'number check ✗'}</Badge>}>4 · CRM note</SectionTitle>
                  <textarea aria-label="CRM note" className="h-44 w-full rounded border border-slate-200 p-1.5 text-sm" value={crm} disabled={!!a.audit} onChange={(e) => setA({ edits: { ...a.edits, crm: e.target.value } })} />
                </Card>
              </div>

              <Card className={clsx('p-4', a.audit ? 'border-green-300 bg-green-50/40' : '')} data-testid="approve-panel">
                {a.audit ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span><Badge tone="green">Approved</Badge> by {a.audit.approvedBy} · {simStamp(a.audit.approvedAt, SIM_TODAY)} · statement, cost disclosure and message delivered to Claudia’s app. She must confirm she has read them before she can sign.</span>
                    <div className="flex gap-1.5"><Button onClick={() => setAuditOpen(true)} data-testid="open-audit">Audit record</Button><Link href="/rm/client/albers/subscription"><Button variant="primary">Subscription →</Button></Link></div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                    <div>
                      {flagged > 0
                        ? <label className="flex items-center gap-2"><input type="checkbox" checked={a.reviewedAccept} onChange={(e) => setA({ reviewedAccept: e.target.checked })} data-testid="review-accept" /> I have reviewed the {flagged} flagged item{flagged > 1 ? 's' : ''} and accept the documentation as it stands.</label>
                        : <span className="text-green-800">All sentences supported, all numbers verified.</span>}
                      <div className="text-xs text-slate-500">Approving makes you the author. An audit record is created.</div>
                    </div>
                    <Button variant="primary" disabled={!canApprove} onClick={approve} data-testid="approve-doc">Approve &amp; send to client</Button>
                  </div>
                )}
              </Card>
            </>
          )}
        </div>
      </div>
      {a.audit && <AuditDrawer open={auditOpen} onClose={() => setAuditOpen(false)} audit={a.audit} />}
    </div>
  );
}

export function AuditDrawer({ open, onClose, audit }: { open: boolean; onClose: () => void; audit: AuditRecord }) {
  const { s } = useStore();
  const v = s.albers.verify?.results ?? [];
  return (
    <Drawer open={open} onClose={onClose} title="Audit record · suitability documentation">
      <div className="space-y-4 text-sm" data-testid="audit-record">
        <dl className="grid grid-cols-[150px_1fr] gap-y-1">
          <dt className="text-slate-500">Client</dt><dd>Claudia Albers (albers)</dd>
          <dt className="text-slate-500">Product</dt><dd>Meridian Buyout V · €200,000</dd>
          <dt className="text-slate-500">Approved by</dt><dd>{audit.approvedBy} (RM, author)</dd>
          <dt className="text-slate-500">Approved at</dt><dd>{simStamp(audit.approvedAt, SIM_TODAY)}</dd>
          <dt className="text-slate-500">Draft</dt><dd>{audit.draftModel} · prompt {audit.draftPrompt}</dd>
          <dt className="text-slate-500">Verifier</dt><dd>{audit.verifyModel} · prompt {audit.verifyPrompt}</dd>
          <dt className="text-slate-500">Verifier result</dt><dd>{v.filter((r: any) => r.verdict === 'supported').length} supported · {v.filter((r: any) => r.verdict !== 'supported').length} flagged (incl. removed)</dd>
          <dt className="text-slate-500">Number guard</dt><dd>{audit.guardPass ? 'pass' : 'FAIL'}</dd>
          <dt className="text-slate-500">Approved despite flags</dt><dd>{audit.reviewedDespiteFlags ? 'yes — RM ticked “reviewed and accept”' : 'no'}</dd>
          <dt className="text-slate-500">Cost disclosure</dt><dd>code · RULES.md §6</dd>
        </dl>
        <div><div className="text-xs font-semibold uppercase text-slate-500">Sources used</div><div className="mt-1 flex flex-wrap gap-1">{audit.sources.map((x) => <span key={x} className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px]">{x}</span>)}</div></div>
        <div>
          <div className="text-xs font-semibold uppercase text-slate-500">AI draft vs final ({audit.changes.length} change{audit.changes.length === 1 ? '' : 's'})</div>
          {audit.changes.length === 0 && <p className="text-slate-500">No changes — final equals AI draft.</p>}
          <ul className="mt-1 space-y-2">{audit.changes.map((ch) => (
            <li key={ch.id} className="rounded border border-slate-200 p-2 text-xs"><span className="font-mono text-slate-500">{ch.id}</span>
              <div className="text-red-700 line-through">{ch.before}</div>
              {ch.after === null ? <div className="italic text-slate-500">removed by RM</div> : <div className="text-green-800">{ch.after}</div>}
            </li>))}</ul>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase text-slate-500">Rule checks at approval</div>
          <ul className="mt-1 space-y-0.5">{audit.ruleChecks.map((r) => <li key={r.label} className="flex justify-between gap-2"><span>{r.label}</span><span>{r.pass === null ? <Badge tone="amber">pending RM</Badge> : r.pass ? <Badge tone="green">✓</Badge> : <Badge tone="red">✗</Badge>}</span></li>)}</ul>
        </div>
      </div>
    </Drawer>
  );
}
