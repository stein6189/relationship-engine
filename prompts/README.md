# prompts/

One file per LLM task. Each file has: id, version, model, purpose, system
prompt, input shape, output JSON schema (implement as zod), and guardrails.
Load at runtime; show id + version in "Under the hood".

| id | model | used in |
|---|---|---|
| extract_signals | FAST | V1 orchestration |
| draft_touchpoint | SMART | V2 |
| meeting_brief | SMART | V3 |
| draft_suitability | SMART | V4 |
| verify_draft | SMART | V2, V4, V6 messages |
| check_qualification_consistency | FAST | V5 |
| route_client_question | FAST | V7 |
| explain_option | FAST | V6 one-line option explanations |

Shared rules for every prompt (prepend as a common preamble):
- You only use information in `facts` and `sources`. Never invent.
- You never compute or change numbers. Use numbers exactly as given in
  `facts`, referenced by their id. If a number you need is missing, say
  "[missing: <what>]".
- You never recommend an investment, a loan or a tax decision to a client.
- Return only JSON that matches the schema. No prose outside JSON.
- If unsure, lower `confidence` and say why in `uncertainty`.
