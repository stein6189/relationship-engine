# TRACEABILITY.md — how the prototype answers the brief

Put this table in the repo README. It lets the panel check every requirement.

## Challenge parts

| Brief requirement | Where in the prototype |
|---|---|
| Multiply what an RM can do for 200 clients; connect RM work with client experience | V1 plan, V2 touchpoints, split view |
| Step-change, not an incremental RM productivity feature | Monthly reading of the whole book + 60 personal touchpoints per month; allocation insight (4,080 meetings vs half uncovered) |
| Advisory moment: AI drafts, RM reviews and owns | V3 brief, V4 documentation, approve + audit |
| MiFID II suitability | V4 suitability statement (7 sections), V5 delivery before signing |
| MiFID II cost transparency | V4 ex-ante cost table from code (`RULES.md` §6) |
| MiFID II record-keeping | V4 audit record: sources, model, prompt version, diff, approver, time |
| Complex offering: conversation → executed investment | V5 Albers first AIF allocation |
| Which steps digital, which with RM, how AI shortens the path | V5: rules + AI consistency check + RM attestation; pre-filled docs; e-sign; funding |
| Book orchestration with fixed capacity, three lanes | V1, `RULES.md` §2 |
| RM and client see the same relationship | Shared timeline (V3/V7), split view, client home shows the plan |

## Design questions

| Question | Answer in the prototype |
|---|---|
| Where must AI stay behind the RM? | Advice, loans, suitability, new-product fees → RM. AI may answer factual questions in the app (V7). Message policy `RULES.md` §7 |
| Audit trail for AI-drafted suitability? | V4 audit drawer, V8 under the hood |
| Whose relationship deserves RM time? | Priority score + hard triggers (`RULES.md` §2) |
| Coverage problem or avoidance of leaving clients? | Control group (3-month test) + churn-reason hypothesis per at-risk client |
| €700k happy client vs €4m entrepreneur | Hofmann (quarterly note, otherwise nothing) vs Keller (conversation at each cash-flow event) |

## Evaluation criteria

| Criterion | Evidence |
|---|---|
| AI nativeness (25%) | 8 prompts with schemas, fast/smart model split, verifier as separate call, number guard, confidence thresholds, cached fallback, V8 |
| Product thinking (20%) | Two users, split view, explicit scope and "not built" list, override + feedback |
| Hybrid & domain judgment (20%) | MiFID flow order, KAGB qualification with RM attestation, capital calls / distributions / J-curve, liquidity bridge with stress test |
| Strategic & commercial (20%) | One-pager; Excel model for the live session (not part of the prototype) |
| Craft & communication (15%) | Demo script, README, decisions log |

## Mapping to the job description (Senior PM – Private Wealth)

| Job description | Where it shows |
|---|---|
| KPI tree: net new money, share of wallet, time advice→investment, PM adoption, retention, RM book capacity, cost-to-serve | V1 KPIs + pipeline strip; full KPI tree in the one-pager |
| Client 360, meeting prep and follow-up, next-best-action signals, pipeline visibility | V3, V4, V1 (signals, reasons), pipeline strip |
| AI copilots for drafting and documentation within MiFID II | V4 with verifier, number guard and audit |
| Which moments are digital, personal or both; handovers; shared view | Three lanes, escalation inbox, split view |
| Service tiers | Lanes in V1 (Hofmann vs Keller); tier model in the one-pager |
| Private markets understandable (capital calls, distributions, J-curve) | V6, V7 explainers with own numbers |
| Holding accounts, family structures | Keller (holding) in the data; family structures named as next step |
| Discovery, tracking schemas, experimentation | Measurement plan below; control group |
| Drive adoption in the RM organisation | Adoption features in V1; rollout plan in the one-pager |

## Measurement plan (put in README)

Events to track: `plan_viewed`, `signal_shown`, `signal_feedback`,
`lane_override` (+reason), `draft_generated`, `draft_edited` (edit distance),
`draft_approved` (time to approve), `verifier_flag`, `number_guard_flag`,
`touchpoint_sent`, `touchpoint_opened`, `client_escalation`,
`client_question` (+category), `suitability_acknowledged`,
`subscription_stage_changed`. Each maps to a KPI in the KPI tree.

## Key decisions and trade-offs (put in README, Daniel to review)

1. Allocation by rules, reading by AI — auditability over cleverness.
2. Numbers only from code — accept less fluent text for zero numeric errors.
3. RM approves every client message at first; informational types move to
   auto-send only after error rates are known.
4. Control group only for silent risk — learn causality without risking
   clients with explicit needs.
5. Liquidity bridge shown as a concept — the need is real, the product status
   is unknown.
6. Not built: prospects, family structures, real integrations — depth over
   breadth.

## What will differentiate

| Brief | Evidence |
|---|---|
| Depth over breadth | Three deep slices, others flat; cut list in `SETUP.md` |
| Honest constraints | Number guard, verifier, labelled test cases, About → guardrails and limits |
| Non-obvious choices | Allocation not capacity; liquidity moments; control group; capital-call bridge |
| Designing for adoption | Monday plan, time-saved widget, batch approval, feedback, RM always sender |
| Respect for the relationship | RM attests, approves, owns advice; AI explains, never recommends; no tracked behaviour in client messages |
