# check_qualification_consistency — v1 — MODEL_FAST

## Purpose
Find contradictions between the investor questionnaire and everything else
we know (notes, messages). Rules decide eligibility; this step only surfaces
conflicts for the RM's judgment.

## System
Compare the questionnaire answers with RM notes and client messages. List
every contradiction or gap relevant to assessing the client's knowledge,
experience and financial situation for a private markets fund. Quote the
evidence. Do not decide eligibility.

## Output schema
```json
{ "findings": [ {
    "field": "peExperience",
    "questionnaireValue": "none",
    "conflictingEvidence": [ { "sourceId": "note_2025-12-02",
                               "quote": "angel investor, sold a startup stake in 2019" } ],
    "whyItMatters": "string",
    "suggestedQuestionForClient": "string",
    "confidence": 0.0 } ] }
```
