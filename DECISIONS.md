# DECISIONS.md

1. **React 18.3.1 with Next 15.0.3** instead of React 19 — clean peer
   dependencies, no `--legacy-peer-deps` needed on Vercel.
2. **Hand-written UI primitives instead of the shadcn CLI** — the build
   environment could not reach the shadcn registry. Same look (Tailwind,
   neutral palette, teal accent), fewer dependencies.
3. **Seed outputs for every AI task on the demo path**, authored offline and
   labelled "cached · seed" in the UI. Reason: the app must work without an
   API key and the demo must never break. Live mode replaces them; each seed
   passed the number guard when written.
4. **Prompts and cache bundled into TypeScript at build time**
   (`lib/promptIndex.ts`, `lib/seedCache.ts`) — no runtime file reads on
   serverless. Source of truth stays `prompts/*.md` and `data/cache/*.json`.
5. **Cache key = logical key** (e.g. `albers`, `keller_bridge`) instead of an
   input hash — an RM editing notes must still get a fallback. The UI labels
   cached output as such.
6. **Signal quotes are checked against the source text in code**; signals
   whose quote is not found are dropped.
7. **Allocation tiers for the digital lane** (escalation > advice need without
   RM slot > time-sensitive info > agreed quarterly update > quarterly due >
   long silence), and **free RM slots go to "annual review overdue"** for the
   largest silent relationships, so capacity is used fully.
8. **Lombard credit line excludes cash and private markets** (cash is what the
   call consumes; private markets are not pledgeable).
9. **Number guard ignores bare counts ≤ 10, day-of-month before a month, and
   compound words** ("3-month", "Q4"); multiples (×), percentages, money and
   years are always checked. Suffixes k/m/bn must end a word ("minimum" is not
   millions — found by a test).
10. **Next 15.5.28 (patched 15.x backport line)** instead of 15.0.3 — 15.0.3
    has known security advisories (incl. a middleware authorization bypass);
    Vercel may refuse vulnerable versions. React stays 18.3.1.
11. **Vercel deployment could not be created from this session** — the Vercel
    connector returned 403 (no permission to create projects) and no
    `VERCEL_TOKEN`/CLI was available. Import steps are in `PROGRESS.md`.
12. **E2E tests use the pre-installed `playwright` library as plain Node
    scripts** (`tests/e2e/*.mjs`) instead of adding `@playwright/test` — no new
    dependency, same browser. A mock Anthropic server
    (`tests/e2e/mock-anthropic.mjs`) tests the live path (slow, invalid JSON,
    wrong number) through the real SDK via `ANTHROPIC_BASE_URL`.
13. **Albers meeting notes gained two lines** (loss capacity; experience:
    direct angel investments, no funds). Without them the suitability statement
    could not honestly state loss capacity, and the verifier would have to
    flag it. The questionnaire still says "none", so the consistency check
    still finds the contradiction (DATA.md intent kept).
14. **The suitability statement is written to the client in the second
    person** ("You told us…"), because it is delivered to the client app. RM
    instructions go to `openPoints` only. `draft_suitability` prompt → v2.
15. **Re-engagement messages are `personal_outreach`**, approved one by one,
    not in the batch (RULES.md §7). Batch approval needs an inline
    confirmation.
16. **Funding stays in "Signed" until first close.** A client's transfer
    instruction on 6 Nov does not make the commitment funded on 15 Dec.
17. **Keller tax:** the RULES.md value €10,154 (26.375% on the full gain) is
    kept and labelled "simplified estimate"; the UI also shows ≈ €7,108 with
    the 30% partial exemption for equity funds (InvStG). Daniel to decide which
    number to speak in the demo.
18. **Platform revenue in the Keller options table** is labelled "internal,
    not a decision criterion" to avoid looking like a conflict of interest.
19. **Clients over the digital cap (60)** stay in "No action" but are
    labelled "Over digital capacity — first in line next month".
20. **Store renders after localStorage is loaded** (short "Loading…"), so no
    screen shows or acts on a stale initial state.
21. **Client actions in Keller's app never execute anything**: "Sounds good —
    let's set it up" only tells Jonas; the loan stays a concept.
