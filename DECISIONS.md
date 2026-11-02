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
