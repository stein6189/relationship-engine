# PROGRESS.md

Last update: Mon 2 Nov 2026, 22:05 CET — handed over from the planning session to a
fresh Claude Code session. **Read CLAUDE.md first, then this file, then continue.**

## Status by phase

### Phase 1 — Data + rules — DONE (except early deploy)
- `lib/rules/*`: config, format, liquidity, lombard, qualification, costs,
  numberGuard, allocation. All RULES.md check values asserted in tests.
- `scripts/generate-data.ts`: 200 clients (4 personas + 196 generated, seeded),
  funds, seed AI outputs. `npm run generate-data` regenerates everything.
- `scripts/persona-seeds.ts`: authored seed outputs for the demo path
  (meeting briefs, Albers suitability draft + verifier results incl. test case,
  qualification consistency, client Q&A, Keller option explanations and
  messages). Every seed is checked by the number guard when written.
- `scripts/build-seed-index.ts`: bundles `data/cache/*.json` into
  `lib/seedCache.ts` and `prompts/*.md` into `lib/promptIndex.ts`
  (serverless-safe, no file reads at runtime).
- `tests/rules.test.ts`: 31 tests green (check values, number guard,
  allocation, DATA.md calibration). Current plan: RM 20/20, digital 60,
  none 120, 11 hard triggers, 7 in control group; Albers/Keller/Berger → RM,
  Hofmann → digital.
- **Not done:** early deploy to Vercel (see Deployment below).

### Phase 2 — Plan + touchpoints — IN PROGRESS
- DONE: AI layer (`lib/ai/schemas.ts`, `lib/ai/run.ts`, `app/api/ai/[task]/route.ts`):
  zod validation, retry once, 20 s timeout → cached fallback, number guard on
  every text output, provenance meta. `GET /api/ai/x` reports if a key is set.
- DONE: store (`lib/state/store.tsx`, localStorage, reset), `useAi` client hook,
  `usePlan`, UI primitives (`components/ui.tsx`), `AiMetaBadge` + Under-the-hood
  drawer, `Shell` (banner, demo date, Live/Cached toggle, reset, left nav,
  footer), basic-auth `middleware.ts`.
- DONE: **V1 `/rm/plan`** — KPIs, capacity bar, requests inbox, pipeline strip,
  orchestration run (4 animated steps; live re-read of 14 clients), three lanes,
  signal chips with confidence + feedback, control-group and churn chips,
  override modal with capacity swap.
- TODO: **V2 `/rm/touchpoints`** — list digital-lane drafts from
  `seedCache['draft_touchpoint__<id>']` (each output has `facts`, `trigger`,
  `testCase`), number guard per message (client-side `numberGuard`), "Test case"
  label, batch approve informational + passing, edit/reject, review timer,
  approved → `state.inbox[clientId]`, live "Regenerate" per message.
  Hofmann may have a live draft in `state.touchpoints.hofmann`.
- TODO: `/rm/clients` list (search, lane, AUM).

### Phase 3 — Albers — TODO
V3 `/rm/client/[id]` (shared timeline, portfolio, AI brief via `meeting_brief`
cacheKey = client id; seeds exist for albers, keller, berger),
V4 `/rm/client/albers/advice` (`draft_suitability` cacheKey `albers`, then
`verify_draft` cacheKey `albers`, or `albers_test` after "Run verifier test";
sentence ids s1..sN in section order, test sentence id `test`, text in
`lib/notes.ts`; cost table from `lib/rules/costs.ts`; approve → audit record,
send suitability + costs + client message to `state.inbox.albers`,
`minutesSaved += 30`), V5 `/rm/client/albers/subscription`
(`qualificationChecks`, `check_qualification_consistency` cacheKey `albers`,
RM attestation, client ack before e-sign, first call €40,000 at first close).
Facts builders: `lib/facts.ts` (`albersFacts`, `kellerFacts`).

### Phase 4 — Keller, client app, split, hood, about — TODO
V6 `/rm/client/keller/liquidity` (Recharts timeline, `liquidityGap`,
`bridgeOption`, `sellOption`, `transferOption`, `explain_option` cacheKeys
`keller_sell|bridge|transfer`, message `draft_touchpoint` cacheKeys
`keller_sell|bridge|transfer`), V7 `/client/[id]` phone app (Home, Activity,
Ask with `route_client_question` cacheKeys `keller_next_call`,
`keller_negative`, `keller_sell`, `albers_early`; unknown free text in cached
mode → route to RM by default; "Talk to my advisor" → `state.escalations` +
`state.requests`; Invest tab for Albers), `/split?client=albers|keller`,
V8 `/rm/hood` (table of `state.aiLog`), `/rm/about` (product facts only — see
SPEC §6; no business case).

### Phase 5 — Final QA rounds A–D — TODO (see CLAUDE.md)

## Deployment
- GitHub: `stein6189/relationship-engine`, branch `main` (push works).
- Vercel: Daniel has an account (team slug `stedao`) and the Vercel connector
  is enabled in claude.ai. Not yet linked. Import the repo as a Next.js
  project. **Daniel sets the secrets himself in Vercel:** `ANTHROPIC_API_KEY`,
  `DEMO_PASSWORD`. Non-secret: `MODEL_FAST=claude-haiku-5-5`,
  `MODEL_SMART=claude-sonnet-5-5`.
- Without a key the app runs fully on seed outputs (labelled "cached · seed").

## Known notes
- `npm run build` passes. Install uses React 18.3.1 with Next 15.0.3.
- Tailwind 3 + hand-written components in `components/ui.tsx` instead of
  the shadcn CLI (see DECISIONS.md).
- No `confirm()`/`alert()` anywhere (blocks browser automation).
