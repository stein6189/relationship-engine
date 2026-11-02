# CLAUDE.md — Relationship Engine (prototype)

You are building a working prototype for a take-home case study:
LIQID, Senior Product Manager – Private Wealth: Growth & Expansion.
Case title: "AI-Native Advisory Copilot & Hybrid Service Engine".

**Hard deadline:** deployed, tested link by **Tuesday 3 Nov 2026, 10:00 CET**.
Submission to LIQID is 12:00 the same day. Live demo is Wednesday 12:00.

Read these files before writing any code, in this order:
1. `SPEC.md` — what we build, views, personas, acceptance criteria
2. `RULES.md` — all deterministic logic (code, not AI)
3. `DATA.md` — synthetic data and calibration targets
4. `prompts/` — every LLM task, with output schemas
5. `DEMO.md` — the demo script. It is also the final acceptance test.
6. `TRACEABILITY.md` — brief requirement → feature. Goes into the README.

---

## The one idea behind everything

"One relationship, not two systems."
The engine reads the whole client book every month, finds the moments that
matter (investment moments and liquidity needs), allocates fixed RM capacity,
and makes sure the RM and the client see the same thing.

The judges care more about **judgment and craft than polish**.
A narrow prototype that works beats a broad one with a broken demo.

---

## Stack (fixed — do not change)

- Next.js (App Router, latest stable), TypeScript `strict`
- Tailwind CSS + shadcn/ui components
- Recharts for the liquidity timeline
- zod for every LLM output schema
- Vitest for unit tests of `lib/rules/*`
- `@anthropic-ai/sdk` for LLM calls
- Data: JSON files in `/data`. **No database.**
- Demo state (approvals, edits, lane overrides): React state + localStorage,
  wrapped in try/catch. A visible "Reset demo" button clears it.
- Pin exact dependency versions in `package.json`.

## Project layout

```
/app                 routes (RM workspace, client app, split view)
/app/api/ai/*        server-only route handlers for LLM calls
/components          UI
/lib/rules           deterministic logic (allocation, liquidity, lombard,
                     qualification, suitability checks, costs, number guard)
/lib/ai              LLM client, prompt loader, schema validation, cache
/prompts             prompt files (*.md) — loaded at runtime, versioned
/data                clients.json, funds.json, personas.json, cache/*.json
/scripts             generate-data.ts, warm-cache.ts
/tests               vitest
```

---

## Non-negotiable rules

1. **Numbers come from code, never from the LLM.**
   - All amounts, dates, percentages, costs, limits are computed in `lib/rules`.
   - They are passed to the LLM as a `facts` object with ids.
   - The LLM writes words around them.
2. **Number guard.** After every LLM text output, run `lib/rules/numberGuard.ts`:
   extract every number from the text, normalise it (€, %, thousands
   separators, "k", "m"), and check it exists in the `facts` passed in.
   Any unknown number → highlight it red and set status `needs_review`.
3. **Structured outputs only.** Every LLM call returns JSON validated by zod.
   On validation failure: retry once, then show "Needs review — AI output
   could not be validated". Never show raw invalid output as if it were fine.
4. **Every AI output carries provenance**: source ids, model, prompt id +
   version, timestamp, confidence (0–1). Shown in the "Under the hood" panel.
5. **Uncertainty is visible.** Confidence < 0.6 → amber badge "Please verify",
   and the item is never auto-actioned.
6. **The AI never sends anything to a client by itself.** RM approves.
   Exception: the client app may answer *factual* questions about the
   client's own data (see `prompts/route_client_question.md`).
7. **The AI never recommends an investment or a loan to a client.**
   Advice-type questions are routed to the RM with a draft.
8. **LLM calls are server-side only.** API key from env, never in the browser.
9. **Synthetic data only.** Show a small banner on every page:
   "Prototype · synthetic data · not investment advice".
10. **No LIQID logo, colours or brand imitation.** Product name:
    "Relationship Engine". Footer: "Prototype built for the LIQID case study".

## Models (orchestration is part of the evaluation)

- `MODEL_FAST` (default `claude-haiku-5-5`): signal extraction, question routing.
- `MODEL_SMART` (default `claude-sonnet-5-5`): drafting and verification.
- Read both from env. Show which model produced each output.

## Demo mode (the demo must never break)

- `scripts/warm-cache.ts` runs every LLM call the demo needs and stores
  results in `/data/cache/<promptId>__<inputHash>.json`.
- UI toggle in the header: **Live AI / Cached**. Default: Live.
  If a live call fails or takes > 20 s, fall back to the cached result and
  show a small "cached" label. Never show a spinner forever.
- Commit the cache files.

## Security

- Basic-auth middleware using env `DEMO_PASSWORD` for every route.
- Env vars: `ANTHROPIC_API_KEY`, `MODEL_FAST`, `MODEL_SMART`, `DEMO_PASSWORD`.
- Provide `.env.example`. Never commit `.env`.

## Language and tone

- UI and all generated text: **English**.
- Plain words, short sentences. Explain finance terms in a tooltip
  (capital call, distribution, J-curve, AIF, suitability, lending value).
- No marketing language in the UI.

## Design

- Calm, professional, dense where the RM works, simple where the client is.
- Neutral palette: near-black ink, slate greys, white surfaces, one accent
  (teal `#0F766E`). Amber for "verify", red for "unsupported / risk",
  green for "approved". Must work in light mode; dark mode optional.
- Font: Inter. Numbers tabular (`font-variant-numeric: tabular-nums`).
- RM workspace: desktop layout with left nav.
- Client app: rendered inside a phone frame (390 × 844).
- **Split view** (`/split`): RM workspace left, client phone right, same client,
  state shared. This is the most important screen for the demo.

## How to work — fully autonomous

**Work autonomously from start to finished deployment. Do not stop to ask
questions or to report between phases.** Daniel is not watching.
- When something is unclear, choose the simpler option that still meets the
  acceptance criteria, write it to `DECISIONS.md`, and continue.
- Keep `PROGRESS.md` up to date (phase, what works, what is open, next step),
  so the work can be resumed after a context reset or interruption.
- Commit after every meaningful step. Push to GitHub after every phase.
- Never weaken a non-negotiable rule to make a test pass.

Build in four phases. Each phase ends with a **QA gate** (below). Only move on
when the gate is green, or after 3 fix attempts — then log the open issue in
`PROGRESS.md` and continue.

1. **Data + rules + early deploy:** generator, personas, all `lib/rules`
   with tests, calibration tests from `DATA.md`. Then deploy a skeleton
   (one page + password) to Vercel **now**, so deployment problems surface
   early, not at 09:00 on deadline day.
2. **Book plan + digital touchpoints:** views V1, V2, AI tasks
   `extract_signals`, `draft_touchpoint`, orchestration run.
3. **Advisory moment (Albers):** views V3, V4, V5, AI tasks
   `meeting_brief`, `draft_suitability`, `verify_draft`,
   `check_qualification_consistency`.
4. **Keller liquidity + client app + polish:** V6, V7, V8, split view,
   About screen, `route_client_question`, `explain_option`, demo mode,
   README with the traceability table from `TRACEABILITY.md`, final deploy.
5. **Final end-to-end due diligence** (below), then redeploy.

## Deployment (autonomous)

- GitHub: use the `gh` CLI (Daniel has logged in). Create a **private** repo
  `relationship-engine` if it does not exist and push.
- Vercel: use the Vercel CLI with env `VERCEL_TOKEN`. Link the project, set
  env vars `ANTHROPIC_API_KEY`, `MODEL_FAST`, `MODEL_SMART`, `DEMO_PASSWORD`
  for production from `.env.local`, deploy with `--prod`.
- Write the production URL into `PROGRESS.md` and the README.

## QA gate after every phase

1. `npm run lint`, `npm run typecheck`, `npm test` — all green.
2. Rules check values from `RULES.md` asserted in tests (gap €110,000,
   credit line €464,000, interest €1,238, stressed line €355,200, tax ≈
   €10,154, cost table €6,000 / €55,000, Albers PM share 6.7%).
3. Calibration tests from `DATA.md` pass.
4. Playwright end-to-end test for every view built so far (install
   Playwright and Chromium if missing: `npx playwright install chromium`).
5. Screenshot each built view with Playwright, look at the screenshots
   yourself, and fix layout problems (overflow, clipped text, empty states,
   unreadable contrast, broken phone frame).
6. Browser console: zero errors and zero failed requests.

## Final end-to-end due diligence (after phase 4) — run at least 3 full rounds

Each round, fix everything found, then start the next round. Stop when a full
round finds nothing material. Write results to `QA_REPORT.md` (round, finding,
severity, fix, status).

**Round A — the demo works.** Automate `DEMO.md` steps 0–12 as one Playwright
test. Run it in **Live** mode and in **Cached** mode (with the API key unset).
Both must pass. Then run it against the **deployed Vercel URL** with the
password.

**Round B — the numbers are right.** Check every number shown in the UI for
the four personas against `RULES.md` and `DATA.md`. Check that every AI output
in the demo path passed the number guard and the verifier, or is clearly
flagged.

**Round C — review through five lenses.** For each, walk the whole app
(using screenshots) and list problems:
- *Head of Product (built a native wealth app):* is it clearly two users,
  well scoped, does the client side feel like a real app, is every
  acceptance criterion in `SPEC.md` met?
- *Managing Director (ex-bank, commercial):* would anything look risky,
  unprofessional or broken in front of a client or regulator?
- *Compliance:* MiFID order (suitability + costs before signing), RM
  attestation, audit record complete, no AI advice or loan recommendation to
  clients, no tracked behaviour in client messages, test cases labelled.
- *Relationship manager:* would I use this on Monday morning? Is every
  "why this client" reason clear and sourced? Can I override easily?
- *Client:* is every text plain, correct, kind, and free of jargon?
Also check every row of `TRACEABILITY.md` against the running app.

**Round D (if time allows) — robustness.** Slow or failing LLM calls (fallback
to cache within 20 s), invalid JSON (retry, then "Needs review"), reset demo,
reload mid-flow, two tabs open in split view.

The job is done only when: deployed, password-protected, Round A passes on
the deployed URL in Live and Cached mode, `QA_REPORT.md` shows no open
critical or high issues, README is complete.

## Seeded test cases

Two deliberate errors exist to demonstrate the guardrails (a wrong number in
one touchpoint draft, a test sentence for the verifier). They must always be
labelled **"Test case"** in the UI. Never present a staged error as a real AI
output.

## Vercel limits

LLM route handlers can run longer than default serverless timeouts.
Set `export const maxDuration = 60` on every `/api/ai/*` route, stream long
drafts where practical, and check the limits of the Vercel plan in use.
The 20-second cached fallback must still work.

## Git hygiene

`.gitignore` must include `.env*` (except `.env.example`) and `node_modules`.

## Out of scope — do not build

Login/user management, a database, real integrations (CRM, custodian, fund
admin), voice recording or transcription, auto-sending to clients, a free-form
chatbot, AI investment or loan recommendations to clients, conversations with
prospects, a real Lombard credit process (it is shown as a concept option only),
mobile responsiveness beyond the phone frame.

If something is unclear, choose the simpler option, note it in
`DECISIONS.md`, and continue.
