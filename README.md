# Relationship Engine — prototype

**One relationship, not two systems.** Every month the engine reads the whole
client book, finds the moments that matter (investment moments and liquidity
needs), allocates fixed RM capacity, and makes sure the RM and the client see
the same thing.

Prototype built for the LIQID case study *“AI-Native Advisory Copilot & Hybrid
Service Engine”* (Senior PM – Private Wealth: Growth & Expansion).
Synthetic data only · not investment advice · no LIQID branding.

- **Production URL:** not deployed yet — see `PROGRESS.md` → Deployment (password protected via `DEMO_PASSWORD`, any user name)
- **Demo script:** `DEMO.md` (12 minutes). It is also the end-to-end test (`tests/e2e/demo.mjs`).
- **Start here in the app:** `/rm/plan` → `/split?client=albers` → `/rm/touchpoints` → `/split?client=keller` → `/rm/hood`

## What is in the prototype

| Screen | Route | What it shows |
|---|---|---|
| V1 Book plan | `/rm/plan` | KPIs, fixed capacity (20), monthly orchestration (4 steps), three lanes, signal chips with source and confidence, override with capacity swap, control group, churn-reason hypothesis, pipeline strip, requests inbox, time saved |
| V2 Digital touchpoints | `/rm/touchpoints` | 60 personal drafts, facts used, number guard per draft, labelled test case, advisory draft blocked → RM lane, batch approve, edit / reject / regenerate, review timer |
| Clients | `/rm/clients` | Book of 200: search, lane filter, share of wallet |
| V3 Client 360 | `/rm/client/[id]` | Sourced meeting brief (hover source ids), shared timeline with “seen by client / RM”, portfolio, private markets, signals |
| V4 Advisory follow-up | `/rm/client/albers/advice` | Suitability statement (7 sections) → automatic verifier per sentence, number guard, cost table from code, client message, CRM note, “Run verifier test”, edit/remove with diff, approve gate, audit record |
| V5 Subscription | `/rm/client/albers/subscription` | KAGB rules ✓/✗, AI contradiction check, RM attestation, 5 shared steps; e-sign locked until suitability + costs are acknowledged |
| V6 Liquidity | `/rm/client/keller/liquidity` | 12-month cash-flow chart, gap step by step, options (sell / bridge / transfer) with code numbers and AI one-liners, stress test, concept label, RM-approved message |
| V7 Client app | `/client/[id]` | Phone frame: Home (portfolio, advisor, capital call, J-curve with own numbers, messages), Invest (Albers journey), Activity (shared timeline), Ask (factual → AI answer; advice → RM) |
| Split view | `/split?client=albers` · `keller` | RM workspace left, client phone right, one shared state |
| V8 Under the hood | `/rm/hood` | 8 prompts with model routing, guardrails, log of every AI call with facts, raw JSON, validation, guard, latency, live/cached; RM overrides and feedback |
| About | `/rm/about` | Thesis, division of labour, guardrails, what is not built |

## Architecture

```
            ┌──────────────────────── browser ────────────────────────┐
            │  RM workspace (Next.js app router)   Client app (phone) │
            │        └──────── shared demo state (React + localStorage) ┘
            │                       │ POST /api/ai/<task> {mode, input{cacheKey, facts…}}
            └───────────────────────┼─────────────────────────────────┘
                                    ▼
  /app/api/ai/[task]  (server only, maxDuration 60)
     lib/ai/run.ts:  prompt (prompts/*.md, bundled) → Anthropic SDK
                     → zod schema (retry once) → number guard vs facts
                     → provenance meta {prompt id+version, model, live|cached, latency, validation, guard}
                     → on error / >20 s / invalid twice → cached result (labelled)
                                    │
  lib/rules/*  (code, unit-tested) ─┘  allocation · liquidity gap · lombard + stress · qualification
                                       · ex-ante costs · number guard · formats
  data/clients.json, funds.json (seeded generator)  ·  data/cache/*.json → lib/seedCache.ts (bundled)
```

**Division of labour:** code does numbers, eligibility, limits, allocation and
costs · AI reads, drafts, explains and checks · the RM judges, approves and owns
the advice · the client self-serves facts, reads, signs and funds.

## Prompts (orchestration)

| Prompt | Model | Used in |
|---|---|---|
| `extract_signals` | fast (`MODEL_FAST`) | V1 — reads messages and notes into typed signals with quotes (quotes are checked against the source in code) |
| `draft_touchpoint` | smart (`MODEL_SMART`) | V2 personal messages, V6 capital-call message |
| `meeting_brief` | smart | V3 — every sentence cites a source id |
| `draft_suitability` | smart | V4 — statement, client message, CRM note; no cost figures |
| `verify_draft` | smart, separate call | V4 — sentence-by-sentence supported / unsupported / advisory language |
| `check_qualification_consistency` | fast | V5 — questionnaire vs notes; never decides eligibility |
| `route_client_question` | fast | V7 — factual (answer from facts) / advice (to RM with draft) / out of scope |
| `explain_option` | fast | V6 — one neutral line per option |

Source of truth: `prompts/*.md` (system prompt, input, output schema, guardrails),
bundled into `lib/promptIndex.ts`; schemas in `lib/ai/schemas.ts`.

## Guardrails (non-negotiable)

1. Numbers come from code (`lib/rules`), passed as `facts`; the model writes words around them.
2. Number guard on every AI text (`lib/rules/numberGuard.ts`): unknown number → red, needs review.
3. Structured JSON only, zod-validated, one retry, then “Needs review — AI output could not be validated”.
4. Provenance on every output (Under the hood): prompt id + version, model, facts, raw JSON, validation, guard, confidence, latency, live/cached.
5. Confidence < 0.6 → “Please verify”, never auto-actioned (client answers below 0.7 go to the RM).
6. Nothing is sent to a client without RM approval — except factual answers about the client’s own data in the app.
7. AI never recommends an investment or a loan to a client; advice questions go to the RM with a draft.
8. Client messages never mention tracked behaviour (page views, logins).
9. Seeded test cases (wrong number in one touchpoint, verifier test sentence) are always labelled **“Test case”**.

## Run locally

```bash
npm ci
cp .env.example .env.local      # ANTHROPIC_API_KEY, MODEL_FAST, MODEL_SMART, DEMO_PASSWORD
npm run dev                     # http://localhost:3000 (no password locally if DEMO_PASSWORD is empty)
```

Without an API key the app runs fully on the bundled outputs (labelled
“cached · seed”). Header toggle **Live AI / Cached**: live calls fall back to
the cache after 20 s or on error, with a visible label. **Reset demo** clears
all demo state.

| Command | What |
|---|---|
| `npm run lint` · `npm run typecheck` · `npm test` | ESLint, TypeScript strict, Vitest (rules, RULES.md check values, DATA.md calibration, guard, MiFID order, privacy) |
| `npm run build && npx next start -p 3100` | production build |
| `node tests/e2e/demo.mjs cached\|live` | DEMO.md steps 0–12 end to end (Playwright). `BASE_URL=… DEMO_PASSWORD=…` for the deployed URL |
| `node tests/e2e/views.mjs` | every view + screenshots in `qa-screens/` |
| `node tests/e2e/robust.mjs` | slow / invalid / wrong-number model, reload, two tabs, reset — against `tests/e2e/mock-anthropic.mjs` |
| `npm run generate-data` | regenerate the synthetic book (seeded, deterministic) and seed outputs |
| `npm run warm-cache` | with a key: run the demo live and store live outputs in `data/cache/` (commit them) |

## Deploy (Vercel)

Import `stein6189/relationship-engine` as a Next.js project (defaults), set
`ANTHROPIC_API_KEY`, `DEMO_PASSWORD` (secret) and `MODEL_FAST=claude-haiku-5-5`,
`MODEL_SMART=claude-sonnet-5-5`, deploy. Basic auth protects every route when
`DEMO_PASSWORD` is set.

## Traceability — how the prototype answers the brief

### Challenge parts

| Brief requirement | Where in the prototype |
|---|---|
| Multiply what an RM can do for 200 clients; connect RM work with client experience | V1 plan, V2 touchpoints, split view |
| Step-change, not an incremental RM productivity feature | Monthly reading of the whole book + 60 personal touchpoints per month; allocation insight (4,080 meetings vs half uncovered) |
| Advisory moment: AI drafts, RM reviews and owns | V3 brief, V4 documentation, approve + audit |
| MiFID II suitability | V4 suitability statement (7 sections), V5 delivery before signing |
| MiFID II cost transparency | V4 ex-ante cost table from code (`RULES.md` §6) |
| MiFID II record-keeping | V4 audit record: sources, model, prompt version, diff, approver, time |
| Complex offering: conversation → executed investment | V5 Albers first AIF allocation |
| Which steps digital, which with RM, how AI shortens the path | V5: rules + AI consistency check + RM attestation; pre-filled docs; e-sign; funding |
| Book orchestration with fixed capacity, three lanes | V1, `RULES.md` §2 |
| RM and client see the same relationship | Shared timeline (V3/V7), split view, client home shows the plan |

### Design questions

| Question | Answer in the prototype |
|---|---|
| Where must AI stay behind the RM? | Advice, loans, suitability, new-product fees → RM. AI may answer factual questions in the app (V7). Message policy `RULES.md` §7 |
| Audit trail for AI-drafted suitability? | V4 audit drawer, V8 under the hood |
| Whose relationship deserves RM time? | Priority score + hard triggers (`RULES.md` §2) |
| Coverage problem or avoidance of leaving clients? | Control group (3-month test) + churn-reason hypothesis per at-risk client |
| €700k happy client vs €4m entrepreneur | Hofmann (quarterly note, otherwise nothing) vs Keller (conversation at each cash-flow event) |

### Evaluation criteria

| Criterion | Evidence |
|---|---|
| AI nativeness (25%) | 8 prompts with schemas, fast/smart model split, verifier as separate call, number guard, confidence thresholds, cached fallback, V8 |
| Product thinking (20%) | Two users, split view, explicit scope and "not built" list, override + feedback |
| Hybrid & domain judgment (20%) | MiFID flow order, KAGB qualification with RM attestation, capital calls / distributions / J-curve, liquidity bridge with stress test |
| Strategic & commercial (20%) | One-pager; Excel model for the live session (not part of the prototype) |
| Craft & communication (15%) | Demo script, README, decisions log |

### Mapping to the job description

| Job description | Where it shows |
|---|---|
| KPI tree: net new money, share of wallet, time advice→investment, PM adoption, retention, RM book capacity, cost-to-serve | V1 KPIs + pipeline strip; full KPI tree in the one-pager |
| Client 360, meeting prep and follow-up, next-best-action signals, pipeline visibility | V3, V4, V1 (signals, reasons), pipeline strip |
| AI copilots for drafting and documentation within MiFID II | V4 with verifier, number guard and audit |
| Which moments are digital, personal or both; handovers; shared view | Three lanes, escalation inbox, split view |
| Service tiers | Lanes in V1 (Hofmann vs Keller); tier model in the one-pager |
| Private markets understandable (capital calls, distributions, J-curve) | V6, V7 explainers with own numbers |
| Holding accounts, family structures | Keller (holding) in the data; family structures named as next step |
| Discovery, tracking schemas, experimentation | Measurement plan below; control group |
| Drive adoption in the RM organisation | Adoption features in V1; rollout plan in the one-pager |

## Measurement plan

Events: `plan_viewed`, `signal_shown`, `signal_feedback`, `lane_override`
(+reason), `draft_generated`, `draft_edited` (edit distance), `draft_approved`
(time to approve), `verifier_flag`, `number_guard_flag`, `touchpoint_sent`,
`touchpoint_opened`, `client_escalation`, `client_question` (+category),
`suitability_acknowledged`, `subscription_stage_changed`. Each maps to a KPI in
the KPI tree (coverage, share of wallet, time advice → investment, retention,
RM capacity, cost-to-serve, AI quality).

## Key decisions and trade-offs

1. Allocation by rules, reading by AI — auditability over cleverness.
2. Numbers only from code — accept less fluent text for zero numeric errors.
3. RM approves every client message at first; informational types move to auto-send only after error rates are known.
4. Control group only for silent risk — learn causality without risking clients with explicit needs.
5. Liquidity bridge shown as a concept — the need is real, the product status is unknown.
6. Not built: prospects, family structures, real integrations — depth over breadth.

Implementation decisions: `DECISIONS.md`. QA results: `QA_REPORT.md`. Status: `PROGRESS.md`.

## Not built (on purpose)

Login/user management, a database, real integrations (CRM, custodian, fund
admin), voice, auto-sending to clients, a free-form chatbot, AI investment or
loan recommendations to clients, prospect conversations, a real Lombard credit
process, family structures, mobile layouts beyond the phone frame.
