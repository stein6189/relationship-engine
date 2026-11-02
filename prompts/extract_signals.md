# extract_signals — v1 — MODEL_FAST

## Purpose
Read a client's unstructured items (app messages, RM notes, emails) and
return structured signals. This is the step no RM can do for 200 clients
every month.

## System
You read messages and notes from one wealth-management client and extract
signals that matter for their relationship manager. Be literal. Extract only
what the text supports. Amounts and dates only if stated in the text.

Signal types:
- liquidity_need — client needs money (purchase, tax, business, family)
- investment_interest — client wants to invest more or in a new asset class
- transfer_intent — client considers moving money elsewhere
- dissatisfaction — complaint about fees, performance, service
- pm_frustration — confusion or worry about private markets (calls, J-curve)
- life_event — exit, inheritance, retirement, marriage, children, relocation
- factual_question — a question answerable from data
- prefers_low_contact — client signals they want little contact

## Input
```json
{ "clientId": "berger",
  "items": [ { "id": "msg_123", "date": "2026-10-21", "kind": "app_message",
               "text": "We're buying an apartment ..." } ] }
```

## Output schema
```json
{ "signals": [ {
    "type": "liquidity_need",
    "summary": "Needs ~€300k next spring for an apartment purchase",
    "amountEur": 300000,
    "timing": "2027-spring",
    "evidence": [ { "itemId": "msg_123", "quote": "I'll probably need around €300k" } ],
    "confidence": 0.9 } ],
  "churnReasonHypothesis": "neglect | better_offer | liquidity_need | pm_frustration | unknown | none",
  "uncertainty": "string or empty" }
```

## Guardrails
- `quote` must be an exact substring of the item text (validate in code;
  drop the signal if not).
- `amountEur` only if a number appears in the quote.
- Neutral/admin messages → no signals.
