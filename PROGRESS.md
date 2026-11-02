# PROGRESS.md

Last update: Mon 2 Nov 2026, ~23:00 CET — scheduled overnight session. **Read CLAUDE.md first, then this file, then continue.**

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

### Phase 2 — Plan + touchpoints — DONE
- V1 `/rm/plan`, V2 `/rm/touchpoints` (60 drafts, number guard per draft, labelled
  test case, one advisory draft blocked → "Move to RM lane", batch approve, edit,
  reject, regenerate, review timer), `/rm/clients` (search, lane filter, sort).

### Phase 3 — Albers — DONE
- V3 `/rm/client/[id]` (sourced brief, shared timeline with seen-by markers,
  portfolio, PM commitments, signals) — works for all 200 clients.
- V4 `/rm/client/albers/advice` (draft → automatic verifier, cost table from code,
  "Run verifier test" with labelled test sentence, inline edit / remove with diff,
  approve blocked while flags remain unless "reviewed and accept", audit drawer).
- V5 `/rm/client/albers/subscription` (rules ✓/✗, AI contradiction, RM attestation,
  5 steps shared with the client app; e-sign locked until steps 1–3).

### Phase 4 — Keller, client app, split, hood, about — DONE
- V6 `/rm/client/keller/liquidity` (Recharts timeline, gap steps, options table,
  stress test, concept label, guardrail, RM picks option → AI message → approve).
- V7 `/client/[id]` phone app (Home, Invest for Albers, Activity, Ask with routing,
  Talk to my advisor → requests inbox + escalation).
- `/split?client=albers|keller` (RM tabs left, scaled phone right, shared state).
- V8 `/rm/hood` (8 prompts, model routing, guardrails, log with drawer), `/rm/about`.

### QA so far
- lint, typecheck, vitest (41 tests), `npm run build` green.
- `node tests/e2e/demo.mjs cached|live` (DEMO.md steps 0–12) and
  `node tests/e2e/views.mjs` pass locally against `next start -p 3100`
  (set BASE_URL / DEMO_PASSWORD for the deployed URL). Zero console errors.

### Phase 5 — Final QA rounds A–D — see QA_REPORT.md

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
