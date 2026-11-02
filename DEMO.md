# DEMO.md — demo script and final acceptance test

Target: 12 minutes, then Q&A. Run it end to end in **Live** mode and in
**Cached** mode before deploying. Every step must work in both.

| # | Screen | What Daniel says | What must happen |
|---|---|---|---|
| 0 | Header | "It's 6 November. The November plan ran on the 1st; Albers' meeting was yesterday." | Demo date visible |
| 1 | `/rm/plan` | "4,080 meetings a year for 3,500 clients. Enough to see everyone once — yet half get none. This is an allocation problem." | KPIs and capacity bar visible (the 4,080 line is spoken, not on screen) |
| 2 | `/rm/plan` | "Every month the engine reads the whole book." | Click "Run monthly orchestration" → 4 steps animate, lanes fill, capacity bar 20/20 |
| 3 | Berger card | "She wrote one line in the app. Today nobody would notice until the transfer request." | Card shows liquidity_need €300k, quote, confidence, lane RM |
| 4 | Control group chip | "The 2–3× churn gap is observed, not causal. So 10% of at-risk clients are a control group." | Tooltip explains |
| 5 | Albers card → V3 | "Why her: two questions about private equity, 11 months without contact, 70% of her wealth elsewhere." | Brief with sourced sentences |
| 6 | V4 | "After the meeting, the AI drafts — the RM owns it. Costs come from code, not the model." | Draft generated; cost table from code; verifier result per sentence |
| 7 | V4 | "Here is a test: an unsupported forecast. The verifier catches it." Then approve. | "Run verifier test" → red; remove; approve; audit drawer complete |
| 8 | V5 split view | "Rules check eligibility. AI finds the contradiction. Only the RM attests. The client reads the suitability statement and costs before signing." | Checklist ✓; contradiction flagged; acknowledgment; sign unlocks |
| 9 | `/rm/touchpoints` | "Personal at scale: 60 messages, each with the client's own numbers, approved in minutes. Hofmann gets a note — Keller gets a conversation. Same engine, different service." | Hofmann message; labelled test case flagged red; batch approve |
| 10 | V6 Keller | "Capital call €150k, €40k cash. Sell and pay ~€10k tax, or bridge three months for ~€1.2k." | Timeline, gap, options, stress test |
| 11 | Split view Keller | "He asked twice why Atlas is negative. Now the app explains the J-curve with his numbers. And 'should I sell?' goes to the RM." | Factual answer + advice routed |
| 11b | `/rm/plan` pipeline strip | "Albers moved from conversation to qualified — and signed — in one day. Today this takes 3–6 weeks." | Pipeline updated (5 Nov conversation → 6 Nov qualified → 6 Nov signed; funding at first close 15 Dec) |
| 12 | Under the hood | "Fast model reads, smart model writes, a second call checks, code does every number." | Prompt id/version, model, facts, guard + verifier results |

## Pre-submission checklist

- [ ] Deployed on Vercel, password works, link opens in a private window
- [ ] Live mode works; cached mode works with network AI disabled
- [ ] No console errors on the 12 steps
- [ ] All `RULES.md` check values appear exactly in the UI
- [ ] "Prototype · synthetic data" banner on every page
- [ ] README: how to run, architecture diagram, prompt list, decisions,
      what was not built
- [ ] Repo shared with LIQID (read access)

## "How did you use AI?" — keep notes while building
- Which phases Claude Code built, what was reviewed and changed by hand
- Two examples where an AI suggestion was rejected and why
- How prompts were tested (seeded contradictions, wrong numbers)
