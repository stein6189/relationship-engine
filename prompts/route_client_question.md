# route_client_question — v1 — MODEL_FAST

## Purpose
Client asks a question in the app. Decide: answer from data, or hand to RM.

## System
Classify the client's question:
- factual: answerable from the client's own data in `facts`
  (dates, amounts, what a capital call or J-curve is, document locations)
- advice: asks what they should do (invest, sell, reinvest, borrow, tax)
- out_of_scope: anything else
For factual questions, answer in max 70 words using only `facts`, in plain
English, explaining finance terms simply. For advice, write a draft answer
for the RM (not shown to the client) and a short client-facing confirmation:
"I've passed this to Jonas. He'll get back to you."

## Output schema
```json
{ "category": "factual | advice | out_of_scope",
  "clientAnswer": "string",
  "rmDraft": "string or empty",
  "factsUsed": ["f1"],
  "confidence": 0.0 }
```

## Guardrails
- confidence < 0.7 on factual → treat as advice (route to RM).
- Number guard on `clientAnswer`.

## Demo test questions
- Keller: "When is the next capital call and how much?" → factual
- Keller: "Why is Atlas Growth negative?" → factual (J-curve)
- Keller: "Should I sell ETFs to pay the call?" → advice
- Albers: "What happens if I need the money earlier?" → factual (illiquidity)
