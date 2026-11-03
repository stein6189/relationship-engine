# PROGRESS.md

Last update: Mon 2 Nov 2026, ~23:30 CET — overnight session finished phases 2–4 and QA. **Read CLAUDE.md first, then this file, then continue.**

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

### QA — DONE (3 rounds, see QA_REPORT.md)
- lint, typecheck, vitest (42), clean-clone `npm ci && npm run build` green.
- DEMO.md 0–12 passes in Cached, Live-without-key, Live-via-mock-model and
  with basic auth. Robustness suite passes. Zero console errors.
- Not run: Round A on the deployed URL (no deployment, see below).

## Deployment — DONE by Daniel on 3 Nov 2026
**Production URL: https://relationship-engine-delta.vercel.app** (team stedao, imported from GitHub; pushes to main redeploy).
To check: env vars set + redeployed, Vercel Authentication off, password prompt works.

Original notes:
The Vercel connector in this session could read the team "stedao" but got
**403 "You don't have permission to create the project"**; no Vercel token/CLI
was available. Steps:
1. vercel.com → team **stedao** → Add New… → Project → Import Git Repository →
   `stein6189/relationship-engine` (grant the Vercel GitHub app access to this
   repo if it is not listed).
2. Framework: Next.js (auto). Build/Install/Output: defaults. Root: `/`.
3. Environment variables (Production + Preview):
   - `ANTHROPIC_API_KEY` = your key (secret)
   - `DEMO_PASSWORD` = the password for LIQID (secret) — without it the site is open
   - `MODEL_FAST` = `claude-haiku-5-5`
   - `MODEL_SMART` = `claude-sonnet-5-5`
4. Deploy. Then Settings → Deployment Protection: turn **Vercel Authentication
   off** for Production (otherwise LIQID gets a Vercel login before our password).
5. Write the URL into this file and the README ("Production URL").

## What Daniel must do before 12:00
1. Deploy (above) and open the URL in a private window: password prompt
   (any user name + `DEMO_PASSWORD`), then `/rm/plan`.
2. Run the acceptance test against it (2 min):
   `BASE_URL=https://<url> DEMO_PASSWORD=<pw> node tests/e2e/demo.mjs live`
   (needs `npm ci` locally; Playwright + Chromium: `npx playwright install chromium`).
3. Optional but recommended — replace the pre-authored seed outputs with real
   model output (the cache is what the panel sees if a live call fails):
   `ANTHROPIC_API_KEY=… npm run build && ANTHROPIC_API_KEY=… npx next start -p 3100`
   then `BASE_URL=http://localhost:3100 npm run warm-cache`, check
   `git diff data/cache`, commit, push (Vercel redeploys).
   Also confirms the model ids `claude-haiku-5-5` / `claude-sonnet-5-5` work.
4. Decide the Keller tax line (DECISIONS #17): RULES.md says €10,154 (simplified,
   no partial exemption); the UI also shows ≈ €7,108 with the 30%
   Teilfreistellung. DEMO step 10 line could become "pay €7–10k tax".
5. Read DECISIONS.md 10–21 (choices made overnight) and QA_REPORT.md.
6. Click through DEMO.md once in Live mode; "Reset demo" (header) before the panel.

## Demo notes
- Click order: Plan → Run monthly orchestration → Berger card → control-group
  chip → Albers name → Advisory follow-up → Draft documentation → Run verifier
  test → remove → Approve → Subscription/Split view (Insert from meeting notes →
  Update questionnaire → tick → Complete qualification; phone: Invest → Costs →
  I have read → Sign) → Touchpoints (Approve all → Yes) → Keller liquidity →
  Choose bridge → Approve & send → Split view Keller (Ask tab chips) → Plan
  pipeline → Under the hood.
- Use "Find a client in the plan…" to jump to a card.

## Known notes
- `npm run build` passes. React 18.3.1 with Next 15.5.28 (patched).
- Tailwind 3 + hand-written components in `components/ui.tsx` instead of
  the shadcn CLI (see DECISIONS.md).
- No `confirm()`/`alert()` anywhere (blocks browser automation).
