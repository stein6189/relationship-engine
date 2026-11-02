# RULES.md — deterministic logic (code, not AI)

All values marked **ASSUMPTION** are prototype settings, not LIQID facts.
Keep them in `lib/rules/config.ts` so they can be shown and changed.
Every rule below needs unit tests.

## 1. Signals

A signal = `{ clientId, type, amountEur?, dueDate?, confidence, sourceIds[],
origin: "data" | "ai" }`.

Types (use exactly these names in code and prompts):
data signals: `capital_call_gap`, `distribution_upcoming`,
`distribution_received`, `login_drop`, `withdrawal`, `no_contact_long`;
AI signals: `liquidity_need`, `investment_interest`, `transfer_intent`,
`dissatisfaction`, `pm_frustration`, `life_event`, `factual_question`,
`prefers_low_contact`.

- Data signals (code): capital calls, distributions, login drop
  (logins last 60 days < 30% of previous 60 days), withdrawals > 10% AUM in
  90 days, no proactive contact > 270 days.
- AI signals (from `extract_signals`): liquidity need, investment interest,
  transfer intent, dissatisfaction, life event — only with confidence ≥ 0.6
  they count for allocation; below that they show as "Please verify".

## 2. Monthly allocation

### Priority score per client
```
opportunityEur = distribution amount (next 60 days)
               + investmentInterest ? min(0.2 × (statedInvestable − AUM), 500_000) : 0
riskEur        = AUM × riskProbability
needEur        = liquidity need amount (incl. capital call gap) — kept in AUM if solved
valueAtStake   = opportunityEur + riskEur + needEur
urgency        = 1.5 if any due date within 30 days, 1.2 within 60, else 1.0
priority       = valueAtStake × urgency
```

riskProbability (ASSUMPTION), additive, capped at 0.6:
`transfer_intent` 0.40 · `dissatisfaction` 0.15 · `login_drop` 0.10 ·
`withdrawal` 0.10 · `no_contact_long` 0.05 · `pm_frustration` 0.10

### Lanes
1. **Hard triggers → RM lane:**
   `transfer_intent`, `liquidity_need ≥ €100k`, `capital_call_gap > 0`,
   `investment_interest` in private markets with eligibility likely
   (AUM ≥ €500k or statedInvestable ≥ €1m).
   If more than 20 clients hit a hard trigger, rank them by `priority`;
   the rest go to the digital lane with an "Overflow — RM to review" flag.
2. Remaining RM slots: highest `priority` where an **advice need** exists
   (any signal that needs judgment: investment interest, liquidity need,
   dissatisfaction). Ties → longest time since last proactive contact.
3. **Control group (3-month test):** before allocation, 10% of clients with
   *silent* risk (riskProbability ≥ 0.15 from `login_drop`, `withdrawal`,
   `no_contact_long`, `dissatisfaction` only) are drawn with a seeded random
   draw (seed `"2026-11"`). They get the digital lane only and are labelled.
   **Never in the control group:** clients with any hard trigger (explicit
   transfer intent, liquidity need, capital call gap), AUM > €2m, or a persona.
   Reason (show in tooltip): we test the effect of proactive contact where it
   is uncertain, without risking clients who have told us what they need.
4. **Digital lane (cap 60):** informational triggers (distribution received,
   J-curve explainer, quarterly progress, unanswered factual question),
   escalations from last month's touchpoints, and no-contact > 270 days not
   in the RM lane.
5. **No action:** everyone else. Must have had a touchpoint within 90 days
   or be marked "prefers low contact".

Capacity: 20 RM slots (ASSUMPTION = case midpoint). Fixed.

## 3. Liquidity gap (Keller)
```
gap = Σ capital calls due in next 90 days
    − free cash on platform
    − Σ distributions confirmed (not indicative) before each call's due date
```
Keller: 150,000 − 40,000 − 0 = **€110,000** (the Feb distribution is
indicative and after the due date, so it is not counted).

## 4. Liquidity bridge (Lombard) — CONCEPT, ASSUMPTIONS

Lending values (ASSUMPTION):
| Asset class | Lending value |
|---|---|
| Money market / cash | 90% |
| Bond ETFs | 80% |
| Broad equity ETFs | 60% |
| Single stocks | 50% |
| Private markets (AIF/ELTIF) | **0%** (illiquid, not pledgeable) |

- Credit line = Σ (market value × lending value).
- Interest rate: **4.5% p.a.** (ASSUMPTION). Cost = loan × rate × months / 12.
- Minimum loan €25,000.
- Stress test: equities −30%, bonds −10%; covered if loan ≤ stressed
  credit line. Else show the top-up (margin call) amount.
- Only offered when a `liquidity_need` or `capital_call_gap` exists.

Keller check values:
- Equity ETFs €520,000 × 60% = 312,000; Bond ETFs €190,000 × 80% = 152,000
  → **credit line €464,000**.
- Bridge €110,000 for 3 months → **€1,238** interest.
- Stress: 364,000 × 60% + 171,000 × 80% = 218,400 + 136,800 = **€355,200**
  ≥ 110,000 → covered, no top-up.

Sell option (Keller):
- Sell €110,000 of equity ETFs; unrealised gain ratio 35% (data) →
  realised gain €38,500 → tax ≈ 26.375% (flat tax + solidarity surcharge,
  no church tax) = **€10,154** (estimate, label as such).
- AUM falls by €110,000 → platform fee lost ≈ €825 p.a. at 0.75%.

Transfer option: €110,000 from bank account → no cost, AUM +€110,000 (new money).
Only valid if the client confirms available cash (unknown → "ask client").

## 5. Investor qualification (semi-professional investor, AIF) — verify before demo

Rules shown as checklist (✓/✗). Wording in UI: "Based on KAGB criteria for
semi-professional investors (prototype — to be confirmed by Legal)".
Order of the journey (MiFID II): suitability statement and ex-ante cost
disclosure must be **delivered to and acknowledged by the client before
signing**. The e-signature step stays locked until then.
1. Commitment ≥ €200,000
2. Signed written risk declaration (document present)
3. Knowledge & experience questionnaire complete
4. **RM attestation required:** "I am sufficiently satisfied that the client
   can make their own investment decisions and understands the risks."
   → never automated.
Internal suitability guardrails (ASSUMPTION):
5. Private markets after investment ≤ 20% of stated investable wealth
6. Liquid assets ≥ 1.5 × unfunded commitments
7. Investment horizon ≥ fund term (10 years)
8. Risk profile ≥ product risk class (product SRI 6 → client risk class ≥ 6
   on a 1–7 scale)

Albers check values: 200,000 / 3,000,000 = **6.7%** ≤ 20% ✓;
liquid assets (platform €900,000 + bank deposits €1,400,000) ≥ 1.5 × 200,000 ✓;
horizon 15 years ✓; risk class 6 ✓.

## 6. Ex-ante cost disclosure (Meridian Buyout V) — ASSUMPTIONS

Commitment €200,000. Show € and % per year and the 10-year total.
| Cost | Basis | % p.a. | € p.a. (yrs 1–5) |
|---|---|---|---|
| Fund management fee | commitment, yrs 1–5 | 2.00% | 4,000 |
| Fund admin & other | commitment | 0.25% | 500 |
| Platform fee | commitment | 0.75% | 1,500 |
| **Total ongoing** | | **3.00%** | **6,000** |
| One-off subscription fee | | 0.00% | 0 |
| Carried interest | 20% of profits above 8% hurdle | performance-dependent | illustrative only |

- Years 6–10: management fee 1.50% on NAV (illustrate with NAV = commitment).
- 10-year total ongoing (illustration): 5 × 6,000 + 5 × 5,000 = **€55,000**.
- Show the line: "Costs reduce your return. Illustration: at a gross return of
  12% p.a., costs reduce the net return to about 9% p.a." (static
  illustrative text, label as illustration).

## 7. Message policy (client-facing text)

| Type | Example | Who sends |
|---|---|---|
| informational | event explainer, status, statement, scheduling | RM batch approval; AI answers in app only for factual Q&A |
| personal outreach | "Shall we talk about your distribution?" | RM approves individually |
| advisory | "You should reinvest / take a loan" | **blocked for AI**, RM only |
| fees for a new product | cost figures | only the code-generated table |

**Privacy rule for client-facing text:** never mention tracked behaviour
(page views, login frequency, time in app). Client messages may refer only to
what the client said or wrote, their own portfolio data, and events.
The RM may see behavioural signals; the client must never feel watched.

## 8. Number guard

- Extract numbers with regex (handles `€110,000`, `110k`, `€1.1m`, `6.7%`,
  `1 Dec 2026`, `2030`).
- Normalise to numeric value (and dates to ISO).
- Allowed set = all values in `facts` + their common roundings
  (k/m, 0–1 decimals) + years present in facts.
- Unknown number → `unsupported`, highlight red.
- Unit tests: at least 10 cases incl. false positives (e.g. "Q4", "3-month").
