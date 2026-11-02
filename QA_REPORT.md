# QA_REPORT.md

Night of 2→3 Nov 2026. All rounds run locally against `next build && next start`
(Chromium via Playwright). The deployed URL could not be tested — no Vercel
deployment could be created from this session (see `PROGRESS.md`).

## How to re-run

```bash
npm run lint && npm run typecheck && npm test && npm run build
npx next start -p 3100 &
node tests/e2e/demo.mjs cached      # DEMO.md 0–12
node tests/e2e/demo.mjs live        # Live mode (falls back to cache without key)
node tests/e2e/views.mjs cached     # all views + full-page screenshots → qa-screens/
# robustness: mock model + app pointed at it
node tests/e2e/mock-anthropic.mjs & ANTHROPIC_API_KEY=mock ANTHROPIC_BASE_URL=http://localhost:3999 npx next start -p 3101 &
BASE_URL=http://localhost:3101 node tests/e2e/robust.mjs
# deployed: BASE_URL=https://… DEMO_PASSWORD=… node tests/e2e/demo.mjs live
```

## Summary of the last full run (round 3)

| Check | Result |
|---|---|
| lint · typecheck · vitest (42 tests incl. all RULES.md check values + DATA.md calibration) | green |
| `npm ci && npm run build` from a clean clone | green |
| Round A — DEMO.md 0–12, Cached mode | PASS, 0 console errors, 0 failed requests |
| Round A — Live mode, no API key (fallback to cache) | PASS |
| Round A — Live mode through the real SDK against a mock model | PASS |
| Round A — with basic auth (`DEMO_PASSWORD`) on a production build | PASS (401 without password, incl. `/api/ai/*`) |
| Round A — deployed Vercel URL | **NOT RUN — not deployed** (Vercel connector: 403 on project create) |
| Views smoke + screenshots (16 screens) | PASS |
| Round D — robustness (slow, invalid JSON, wrong number, reload, two tabs, reset) | PASS |

## Round 1 (A, B, C, D)

| # | Finding | Severity | Fix | Status |
|---|---|---|---|---|
| 1.1 | Pages beyond the plan missing (V2–V8, split, about) | critical | Built | fixed |
| 1.2 | `€-40,000` formatting of negative amounts | medium | `eur()`/`eurShort()` put the minus before € | fixed |
| 1.3 | First render used the empty initial state (pipeline showed "Conversation held" briefly; auto AI calls fired twice) | medium | Store renders children only after localStorage load | fixed |
| 1.4 | Recharts animation left the Keller chart empty in screenshots | low | Animations off | fixed |
| 1.5 | Phone (844 px) overflowed a 900 px laptop screen in split view | medium | Phone scales to viewport height | fixed |
| 1.6 | Audit and approval times showed the real date, not the demo date | medium | `simStamp()` — demo date + time | fixed |
| 1.7 | Hofmann's key fact "2030" was cut by line clamp in the app | medium | Clamp 6 lines | fixed |
| 1.8 | Live drafts would flag "2019", "70%" etc. as unknown numbers | medium | Added sourced facts (angel exit year, held elsewhere, Keller wallet/ETFs) | fixed |
| 1.9 | Invalid output without cache showed "No brief available" instead of the required wording | medium | "Needs review — AI output could not be validated" in brief, draft, verifier, consistency check | fixed |
| 1.10 | Google Fonts request (fails offline / counts as failed request) | low | Self-hosted Inter (`@fontsource-variable/inter`) | fixed |
| 1.11 | Next 15.0.3 has security advisories (incl. middleware auth bypass) | high | Next 15.5.28 | fixed |
| B | All RULES.md values in UI: gap €110,000 · line €464,000 · interest €1,238 · stressed €355,200 · tax €10,154 · €6,000 / €55,000 · 6.7% · €40,000 · 47.5% — asserted in `demo.mjs` | — | — | pass |
| C | Five-lens review (independent reviewer, 24 items) — see round 2 table for the fixes | — | — | — |
| D | Slow model → cached in ~20 s with label; invalid JSON → retry → cache or "Needs review"; wrong number in client answer → held back, routed to RM | — | — | pass |

## Round 2 (fixes from the round-1 five-lens review)

| # | Finding (lens) | Severity | Fix | Status |
|---|---|---|---|---|
| 2.1 | Client-facing suitability statement in 3rd person, contained an RM instruction (Compliance/Client) | critical | Statement in 2nd person; RM items only in "Open points"; prompt v2 | fixed |
| 2.2 | "Can bear a total loss" marked supported without a source (Compliance) | high | Loss capacity + experience lines in meeting notes; specific verifier reasons | fixed |
| 2.3 | Keller messages said "As discussed"; bridge text did not say the distribution is unconfirmed; one-tap "Confirm" of a loan (Compliance/MD) | high | Rewritten; rate, "separate credit agreement", "nothing is executed here" | fixed |
| 2.4 | Pipeline jumped to "Funded" before first close (MD) | high | Stays "Signed"; stage history shown | fixed |
| 2.5 | Audit record stopped at RM approval (Compliance) | high | Journey log: attestation, clarification, questionnaire update, acknowledgment, signature, transfer; delivered-document fingerprint | fixed |
| 2.6 | Re-engagement messages batch-approved (RULES §7 personal outreach) | medium | `personal_outreach`, one by one; batch needs inline confirmation | fixed |
| 2.7 | Plan reason and touchpoint trigger did not match (RM) | medium | New triggers: distribution expected, capital-call explainer | fixed |
| 2.8 | Quote date on card taken from the wrong message (RM) | medium | Date of the message that contains the quote | fixed |
| 2.9 | Clients over the digital cap sat in "No action" unlabelled (RM) | medium | "Over digital capacity — first in line next month" | fixed |
| 2.10 | Verifier test showed only the number guard (Demo) | medium | Both verdicts with reasons | fixed |
| 2.11 | Albers "11 months without contact" next to yesterday's meeting (MD) | medium | Meeting event (client-visible), header and app wording | fixed |
| 2.12 | J-curve text reassured about performance (Compliance) | medium | "common for young funds; says little yet about the final result" | fixed |
| 2.13 | RM draft from client questions not number-guarded | medium | Guarded; badge in the requests inbox | fixed |
| 2.14 | Platform fee next to client options looked like a conflict of interest (MD) | medium | "Our revenue (internal) — not a decision criterion" | fixed |
| 2.15 | Swap list excluded hard-trigger clients; overrides not visible (RM) | medium | All selectable with warning; override + feedback log in Under the hood | fixed |
| 2.16 | Tax: 26.375% on the full gain ignores the 30% partial exemption; GmbH header (MD) | high | Labelled "simplified estimate", ≈ €7,108 shown alongside; private account stated. **Daniel to decide** (DECISIONS #17) | mitigated |
| 2.17 | Phone cost table cramped/jargon; "1 months"; two talk buttons; "Missing" | low | Mobile cost list in plain words; fixes | fixed |
| 2.18 | All cached outputs are pre-authored seeds, not live model output (HoP/MD) | high | Cannot fix without an API key. `npm run warm-cache` prepared. **Daniel: run it** | open (needs key) |

## Round 3 (independent re-review of round-2 fixes, then fixes)

| # | Finding | Severity | Fix | Status |
|---|---|---|---|---|
| 3.1 | Qualification completed while the questionnaire was known to be wrong (Compliance) | high | Contradiction → client's answer (required) → "Update questionnaire" → only then attestation; logged in audit | fixed |
| 3.2 | Clarification field pre-filled with a scripted client answer (Compliance) | medium-high | Empty field; optional "Insert from meeting notes (5 Nov)" | fixed |
| 3.3 | Plan lanes overflowed at 1440 px, Move buttons off-screen (RM) | medium-high | `minmax(0,…)` grid tracks | fixed |
| 3.4 | DEMO 11b line vs screen ("qualified" vs "signed") | medium | Stage history on the card; DEMO.md line updated | fixed |
| 3.5 | Timeline: page views labelled "seen by client"; sent = "seen" | medium | "client action · RM only"; "delivered to the client app" | fixed |
| 3.6 | Audit showed the staged test sentence as an AI-draft change | medium | Separate "Verifier test" row, excluded from changes/tally | fixed |
| 3.7 | Client sell message showed only €10,154 | medium | "about €7,108 with partial exemption, up to €10,154 without; tax adviser confirms" | fixed |
| 3.8 | Keller loan proposal typed `personal_outreach` | medium | `advisory` (RM-chosen, RM-approved); rate + credit agreement in text | fixed |
| 3.9 | Pre-filled documents showed values from unfinished steps | low-medium | "pending …" until the source step is done | fixed |
| 3.10 | Guard "pass · 0" where no text; route guard ignored rmDraft | low | n/a for empty text; rmDraft included | fixed |
| 3.11 | Client wording polish ("I've passed…", "as agreed" twice) | low | Fixed | fixed |
| 3.12 | Two RM-lane clients with the identical "better fee" quote; noise message "Thanks for the update!" without a matching update | low | Not changed — changing the seeded generator would reshuffle the calibrated book | open (low) |

After round 3 all suites were re-run green (table at the top). No open critical
or high issues remain in the code. Open items that need Daniel: deployment,
live warm-cache with the API key, the tax number to speak in the demo.
