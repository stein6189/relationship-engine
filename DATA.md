# DATA.md — synthetic data

All data is invented. Generate with `scripts/generate-data.ts` using a seeded
PRNG (seed `"liqid-case"`), so the book is identical on every run.
Hand-written personas from this file override generated values.

## 0. Simulated clock (use everywhere, never the real date)

- `SIM_TODAY = 2026-11-06`. Show it in the header: "Demo date: 6 Nov 2026".
- The November plan was generated on **1 Nov 2026** (the demo re-runs it).
- Albers' advisory meeting took place on **5 Nov 2026**; the follow-up
  documentation is drafted "today".
- All "days since", "due in" and "last 60 days" calculations use `SIM_TODAY`.

## 1. The book: 200 clients of RM Jonas Weber

Calibration targets (from the case, midpoints). Add a test that checks them.
| Metric | Target | Tolerance |
|---|---|---|
| Clients | 200 | exact |
| Mean AUM per client | €860,000 | ±5% |
| AUM range | €300k – €4m (log-normal, right-skewed) | |
| Proactive RM contact in last 12 months | 47.5% | ±3 pp |
| Clients with private markets | 37.5% | ±3 pp |
| Mean share of wallet (AUM ÷ stated investable wealth) | 24–28% | |
| Monthly active app users | 42.5% | ±5 pp |
| Clients with ≥1 risk signal | ~15% | ±3 pp |
| Clients with an AI-detectable text signal | ~20% | |
| Clients hitting a hard RM trigger this month (`RULES.md` §2) | 8–12 | so that some RM slots are left for priority ranking |
| Clients with a capital call in the next 90 days | 6–10 | of which 2–4 with a liquidity gap |

Fields per client:
`id, name, age, segment ("private_wealth"), occupation, aumEur,
holdings[{assetClass, name, valueEur, unrealisedGainRatio}],
pmCommitments[{fundId, commitmentEur, calledEur, navEur}],
statedInvestableWealthEur, riskClass (1–7), horizonYears, objectives[],
prefersLowContact (bool), lastProactiveContactDate, logins60d, loginsPrev60d,
appEvents[{date, type, detail}], messages[{id, date, from, text}],
rmNotes[{id, date, text}], questionnaire{peExperience, ...}, documents[]`.

Use realistic German names (mixed gender), occupations: entrepreneurs,
executives, doctors, lawyers, heirs, founders after exit.

## 2. Funds (all fictional)

| id | Name | Type | Vintage | Status | Notes |
|---|---|---|---|---|---|
| mbo4 | Meridian Buyout IV | AIF, buyout | 2021 | investing/harvesting | distributions starting |
| ag5 | Atlas Growth V | AIF, growth | 2024 | investing | J-curve (NAV < paid-in) |
| hi2 | Harbor Infrastructure II | AIF, infra | 2022 | investing | steady small distributions |
| mbo5 | Meridian Buyout V | AIF, buyout | 2026 | **open for subscription** | min €200k, 10-year term, SRI 6 |
| epm | Evergreen Private Markets ELTIF | ELTIF | evergreen | open | no capital calls |

Each AIF has a call and distribution schedule (dates + % of commitment).

## 3. Personas (hand-written, exact values)

### Claudia Albers (id `albers`) — first private markets allocation
- 47, partner at a law firm, Munich.
- AUM €900,000: equity ETFs €540,000 · bond ETFs €315,000 · cash €45,000.
- No private markets. Stated investable wealth €3,000,000
  (share of wallet 30%); elsewhere: bank deposits €1,400,000 and a
  securities account at her house bank €700,000.
- Risk class 6, horizon 15 years, objective "long-term growth, diversify".
- Last proactive RM contact: 11 months ago.
- App events: viewed "Private markets" page 4× in October.
- Messages:
  - 2026-10-08 client: "I keep reading about private equity. Is that
    something that would make sense for me at some point?"
  - 2026-10-24 client: "Also — what happens if I need the money earlier?"
- RM note 2025-12-02: "Mentioned she was an angel investor, sold a startup
  stake in 2019. Interested in 'real economy' investments."
- Questionnaire: `peExperience: "none"` ← deliberate contradiction with the
  RM note; the AI consistency check must flag it.
- Meeting notes for V4 (pre-filled, 2026-11-05):
  "Discussed private markets. Client wants to diversify beyond listed
  markets, horizon 15+ years, understands capital is locked for ~10 years and
  calls come over 3–4 years. Comfortable with €200k in Meridian Buyout V.
  Explained J-curve and that distributions are not guaranteed. Explained
  costs. Client asked whether returns are guaranteed — I said no.
  Alternative discussed: ELTIF with lower minimum and no capital calls —
  client prefers the buyout fund. Next step: qualification + subscription."
  Verifier test case: a button "Run verifier test" in V4 inserts the sentence
  "Distributions of around 1.8× the commitment are expected." into the draft,
  visibly labelled **"Test case"**. The verifier must flag it red. Do not fake
  or stage a "bad AI draft" — the test is shown openly as a test.

### Dr. Thomas Keller (id `keller`) — capital call gap
- 52, founder and managing director, mechanical engineering company; holds
  investments via Keller Beteiligungs GmbH.
- AUM €1,100,000: equity ETFs €520,000 (unrealised gain ratio 35%) ·
  bond ETFs €190,000 · cash €40,000 · PM NAV €350,000.
- PM commitments:
  - Meridian Buyout IV: commitment €300,000, called €255,000, NAV €260,000.
    Indicative distribution ~€180,000 in Feb 2027.
  - Atlas Growth V: commitment €400,000, called €100,000, NAV €90,000
    (J-curve: −10%). **Next call €150,000 due 2026-12-01.**
- Stated investable wealth €4,100,000 (share of wallet 26.8%).
- Messages:
  - 2026-09-30 client: "Why is Atlas Growth showing a loss? I thought this
    was a good fund."
  - 2026-10-19 client: "Is the Atlas number still negative? Should I be
    worried?"
- Last proactive contact: 5 months ago.

### Sabine Berger (id `berger`) — liquidity need, outflow risk
- 44, CFO of a mid-sized company. AUM €1,400,000 (equity ETFs €900,000,
  bond ETFs €450,000, cash €50,000). Stated investable €4,500,000.
- Message 2026-10-21: "We're buying an apartment in Munich next spring,
  so I'll probably need around €300k from my portfolio."
- Last proactive contact: 14 months ago. Would be in "no action" by habit.

### Monika Hofmann (id `hofmann`) — happy, digital lane
- 63, retired pharmacist. AUM €700,000, balanced model portfolio
  (60/40). Retirement income goal from 2030. Year-to-date +6.2%
  (store as fact). Logs in monthly. Last RM meeting 7 months ago.
  `prefersLowContact: true`.
- Digital touchpoint: quarterly progress note referring to her 2030 goal.

## 4. Text bank for the other clients

Generate ~40 messages / notes across the book from these templates
(vary amounts and wording). Mark each with its intended signal so tests can
check extraction quality.
- "We're selling the company next year — want to talk about what to do with
  the proceeds." → life_event, investment_interest
- "Is there a way to get cash without selling everything?" → liquidity_need
- "My bank offered me a better fee. Can you match it?" → dissatisfaction,
  transfer_intent
- "Please send me the tax certificate." → question (factual)
- "Why did my portfolio drop last month?" → question (factual)
- "Thinking of moving part of my money to my private bank." → transfer_intent
- "My daughter is starting university, I'll need €40k a year." →
  liquidity_need (small)
- "Can my holding company invest too?" → investment_interest
- "I don't understand the capital call letter." → question, pm_frustration
- "All good, no need to call." → prefersLowContact
- plus neutral noise messages (address change, login help) → no signal

## 5. Digital touchpoint seeds (for V2)

~60 drafts across triggers: quarterly progress (30), distribution received
(10), J-curve explainer (8), statement/tax info (8), re-engagement after long
silence (4). One draft is a labelled **"Test case"** with a wrong number
("+8.1%" when the fact is +6.2%) so the number guard visibly shows red.

## 6. Pipeline (for the V1 pipeline strip)
~8 open opportunities in Jonas Weber's book across stages, €100k–€500k each,
with stage entry dates so average days per stage can be computed. Albers is
added live when she reaches "Qualified".

## 7. Personas and the control group
The four personas are never drawn into the control group.
