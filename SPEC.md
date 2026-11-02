# SPEC.md — Relationship Engine

## 1. Problem and thesis (for context)

- Private Wealth = ~35% of clients, ~80% of AUM. Revenue is an AUM fee.
- ~17 RMs, ~200 clients each, ~20 client meetings per RM per month.
- 17 × 20 × 12 ≈ **4,080 meetings a year for ~3,500 clients** — enough to see
  everyone once. Yet **52.5% had no proactive contact** in 12 months.
  → This is an **allocation problem, not a capacity problem.**
- RMs spend ~60% of their time not with clients. Prep + documentation alone
  ≈ 37.5 h per RM per month.
- Clients hold only ~27.5% of their stated investable wealth with the platform.
  ~€9.6bn of Private Wealth clients' money sits elsewhere.
- Client and RM live in two systems: the client sees a capital call in the app,
  the RM does not know what the client saw or asked.

**Thesis:** Today the RM reacts when a client calls. The engine reads the whole
book every month, finds the moments that matter, allocates fixed RM capacity
deliberately, and gives the client and the RM one shared view.

**Division of labour (show this everywhere):**

| Who | Does what |
|---|---|
| Code (rules) | numbers, eligibility, limits, allocation, costs |
| AI | reads unstructured text, writes drafts, explains, checks drafts |
| RM | judges, decides, approves, owns the advice |
| Client | self-serves facts, signs, funds |

## 2. Users

- **RM:** Jonas Weber, book of 200 clients.
- **Client:** shown in a phone frame. Four named personas (see `DATA.md`).

## 3. Personas and their stories

| Persona | Story in the demo | Depth |
|---|---|---|
| **Claudia Albers** | First private markets allocation. Asked twice in the app about private equity. €900k with us, ~€3.0m total. Invests €200k in "Meridian Buyout V" (AIF). | **Deep** |
| **Dr. Thomas Keller** | Entrepreneur with holding and running PM commitments. Capital call €150k on 1 Dec, only €40k free cash → gap €110k. Distribution ~€180k expected Feb 2027. Options: sell ETFs vs liquidity bridge (Lombard) vs transfer cash. | Medium |
| **Sabine Berger** | App message: needs ~€300k next spring for an apartment. Today she would only be noticed when the transfer request arrives. Now: RM lane, liquidity need, Lombard as alternative to withdrawal. | Card + RM note only |
| **Monika Hofmann** | €700k, model portfolio, happy, retires 2030. Digital lane: personalised quarterly note. Shows "doing nothing personal is a decision". | Message only |

## 4. Views and acceptance criteria

### V1 — Book plan (RM home) — DEEP
Route: `/rm/plan`

- Header strip with KPIs (computed):
  - Proactive coverage last 12 months (book): ~47.5%
  - Meetings available this month: 20 (fixed capacity bar, slots fill as
    clients are allocated)
  - AUM at risk this month (€), liquidity needs detected (€),
    investment opportunities (€)
- Button **"Run monthly orchestration"** shows a 4-step pipeline with
  progress: 1 Read signals (AI, fast model) → 2 Score (rules) →
  3 Allocate capacity (rules) → 4 Draft touchpoints (AI, smart model).
  For the demo, only the four personas + ~10 others are processed live;
  the rest come from pre-computed signals in `clients.json`.
- Three lanes: **RM conversation (20)**, **Digital touchpoint (~60)**,
  **No action this month (~120)**.
- Each client card: name, AUM, lane, one-sentence reason, signal chips
  (type · source · confidence), days since last proactive contact.
- **Override:** RM can move a client to another lane, must pick a reason
  (dropdown + free text). Capacity stays fixed: moving someone into the RM lane
  when full asks which client to move out. Overrides are logged.
- **Control group:** 10% of at-risk clients are flagged "Control group —
  digital only (3-month test)". Tooltip explains why: the 2–3× churn gap
  between contacted and uncontacted clients is observed, not causal.
- Churn-reason chip on at-risk clients (AI hypothesis: neglect / better offer
  elsewhere / liquidity need / private markets frustration / unknown).
- **Pipeline strip** (above the lanes): open opportunities by stage —
  Conversation held → Qualified → Documents → Signed → Funded — with € volume
  and average days per stage. Shows the KPI "time from advice to investment"
  (case: 3–6 weeks today). Albers sits in "Qualified" after V5 step 1.
- **Adoption features (the tool must earn its place in the RM's day):**
  - The plan is the RM's Monday-morning start screen: one list, one reason
    per client, no new inbox to manage.
  - 👍/👎 on every signal and draft, with optional reason. Shown as
    "Feedback used to tune prompts and thresholds" (store only, no training).
  - "Time saved this month" widget: prep and documentation minutes saved
    (assumption per action, e.g. brief −40 min, documentation −30 min),
    so the RM sees the benefit before being asked to change habits.
  - Requests inbox at the top: client escalations from the app
    ("Talk to my advisor", advice questions) appear here immediately.

Acceptance: allocation is deterministic for the same input; Albers, Keller,
Berger are in the RM lane with correct reasons; Hofmann is in the digital lane;
override + capacity swap works; control group is visible.

### V2 — Digital touchpoints review — DEEP
Route: `/rm/touchpoints`

- List of ~60 personalised draft messages for this month.
- Each message: client, trigger (e.g. "distribution received", "quarterly
  progress", "J-curve explainer"), message text, facts used (with values),
  number-guard badge (green ✓ / red ✗), message type.
- Message types: `informational` (can be batch-approved) vs `advisory`
  (blocked — routed to RM lane with a note).
- **Approve all informational** button + per-message edit/reject.
- Counter: "60 messages reviewed in ~10 minutes" (simple timer since opening).
- After approval: client app of that client shows the message; if the client
  replies or taps "Talk to my advisor", the request appears **immediately**
  in the RM's requests inbox and the client is pre-queued for the RM lane next
  month ("Escalation" chip).

Acceptance: Hofmann's message uses her own numbers and goal (retirement 2030)
and does not mention app behaviour; the labelled "Test case" draft with a
wrong number is flagged red by the number guard; batch approve works.

### V3 — Client 360 + meeting prep
Route: `/rm/client/[id]`

- Shared timeline: what the client saw and did in the app (views, questions),
  RM notes, events (calls, distributions), messages sent. Each item shows
  "seen by client" / "seen by RM".
- Portfolio summary (code), stated investable wealth, share of wallet.
- AI brief (≤ 150 words) with sources: why now, what the client asked,
  open items, what to prepare. Every sentence links to a source id.

### V4 — Advisory follow-up with MiFID II documentation — DEEP (Albers)
Route: `/rm/client/albers/advice`

- Left: meeting notes (pre-filled, editable).
- Button "Draft documentation" generates:
  1. **Suitability statement** (structured sections: client objectives,
     risk profile, knowledge & experience, financial situation & loss capacity,
     why the product fits, risks explained, alternatives considered)
  2. **Ex-ante cost disclosure** — table computed by code (`RULES.md` §6),
     inserted, not written by AI
  3. **Client follow-up message**
  4. **CRM note**
- **Verifier** runs automatically: each sentence marked supported (source id)
  or unsupported (red). Number guard runs as well.
- RM edits inline. Diff is tracked.
- **Approve** → creates an audit record shown in a drawer:
  sources used, model + prompt id/version for draft and verifier, AI draft vs
  final (diff), approver, timestamp, rule check results.
- Button **"Run verifier test"** inserts a labelled test sentence
  ("Distributions of around 1.8× the commitment are expected.") so the panel
  can see the verifier catch an unsupported forecast. Clearly marked "Test case".
- After approval: suitability statement and cost disclosure are **sent to the
  client app** and must be acknowledged there before signing (V5).

Acceptance: cost table numbers match `RULES.md`; verifier flags the test
sentence and any real unsupported sentence; approve is blocked while red items
remain unless the RM ticks "I have reviewed and accept"; audit record is
complete.

### V5 — Subscription journey (Albers) — FLAT
Route: `/rm/client/albers/subscription` and client app equivalent

Steps with status, visible to RM and client:
1. **Investor qualification** — rule results (✓/✗) from `RULES.md` §5,
   plus AI consistency check (flags contradictions between questionnaire and
   notes; seeded: "no private equity experience" vs note "angel investor,
   sold a startup stake in 2019"), plus **RM attestation** checkbox
   ("I am sufficiently satisfied…"). Only the RM can complete this step.
2. **Suitability statement + cost disclosure** — delivered to the client app;
   client taps "I have read and understood". Required before step 4 (MiFID II).
3. **Documents** — pre-filled from client data (show field list with source).
4. **E-signature** — simulated button in client app; locked until 1–3 are done.
5. **Funding** — first call amount and date (code: 20% of commitment =
   €40,000 at first close), payment instructions.

### V6 — Liquidity view (Keller) — MEDIUM
Route: `/rm/client/keller/liquidity`

- 12-month timeline chart: capital calls (negative), distributions
  (positive, "indicative"), free cash line.
- Gap calculation shown step by step (code).
- **Options table** (code numbers, AI one-line explanations):
  sell ETFs · liquidity bridge (Lombard, concept) · transfer from bank account.
- **Stress test** for the bridge: equities −30%, bonds −10% → is the loan
  still covered? (code)
- Label on the Lombard row: "Concept option — product availability assumed".
- RM picks an option → client app shows an explanation of the capital call
  and the option the RM proposed (RM approves the message first).
- Guardrail text visible: "Credit is only suggested when a liquidity need is
  detected — never to invest more."

### V7 — Client app (phone frame)
Route: `/client/[id]`

Quality bar: the panel's Head of Product led the launch of a native wealth
app. The client side must feel like a real, calm, modern banking app (clear
hierarchy, large numbers, plain explanations, bottom tab bar), not a debug
view — even though its scope is small.

- Home: portfolio value, "Your advisor Jonas Weber will contact you in
  December" (from the plan) or "No action needed — next update in January".
- Shared timeline (client side of V3).
- Event explainers with the client's own numbers: capital call, distribution,
  J-curve (Keller: Atlas Growth V is at −10% in year 2 — explain why).
- **Ask a question** box → `route_client_question`:
  - factual → answered from facts, with "Answered by AI from your data" label
  - advice → "I've passed this to Jonas with a draft answer" + item appears
    in the RM's view
  - out of scope → polite redirect
- Subscription steps for Albers (V5 client side).

### V8 — Under the hood
A drawer available on every AI output:
prompt id + version, model, input facts (ids + values), raw JSON output,
validation result, number-guard result, verifier result, confidence, latency,
live vs cached.

### Split view
Route: `/split?client=albers` (also keller)
RM workspace left, client phone right. Actions on one side update the other.

## 5. Navigation

Left nav (RM): Plan · Touchpoints · Clients · Under the hood (log of all AI
calls) · About (one screen: thesis, division of labour, what we did not build).

## 6. "About" screen content (static, product facts only)

Communication (business case, KPI tree, rollout, build vs buy) belongs in the
one-pager, not in the prototype. The About screen only explains how the
product works and where its limits are:
- The thesis in 2 sentences.
- Division of labour table (code / AI / RM / client).
- Guardrails: numbers only from code, number guard, verifier, RM approval,
  no tracked behaviour in client messages, AI explains but never recommends.
- No AI in credit or eligibility decisions (rules + RM only).
- Data protection: EU processing, no training on client data, AI signals are
  suggestions — the RM decides.
- What the prototype does not do: auto-send, free chatbot, AI advice to
  clients, prospect conversations, real Lombard process, integrations,
  family structures.
