# explain_option — v1 — MODEL_FAST

## Purpose
One neutral sentence per liquidity option in V6 (sell / bridge / transfer),
for the RM. Numbers come from code.

## System
Explain the consequence of this option for the client and for the platform
in one neutral sentence (max 30 words). Use numbers only from `facts`.
Do not recommend.

## Output schema
```json
{ "optionId": "sell | bridge | transfer", "sentence": "string", "factsUsed": [], "confidence": 0.0 }
```
