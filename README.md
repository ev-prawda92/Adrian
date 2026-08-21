# Adrian — Unified Evaluation Platform
### Operation Mincemeat LLC

One reasoning engine. Multiple domain lenses. Every lens does the same fundamental thing:
**take an artifact, judge it against an expert ruleset, separate real signal from artifact, and show its work.**

---

## Why one platform

Four separate builds were secretly the same machine. Adrian unifies them:

| Lens | Judges | Verdict | Reused from |
|------|--------|---------|-------------|
| **Catalyze** | Biomedical evidence (ALK+ NSCLC wedge) | Advance / hold, with cross-model consensus | Catalyze/Adrian |
| **Equity Lens** | AI responses, in matched counterfactual pairs | Fairness / dignity, by invariance posture | Equity Lens (USPTO provisional #19/632,273) |
| **Sendero** | Per-user operational data | BUILD vs TRAINING vs HYBRID | Sendero two-level outlier test |

The through-line is **signal vs. artifact**: η² (Sendero), cross-model spread (Catalyze), and
counterfactual invariance (Equity Lens) are three answers to one question — *is this difference real,
or noise?* That shared idea is the platform's moat.

> Sendero's contribution — the eta-squared / within-group outlier test from `engine.py` — is ported to
> browser JavaScript and **runs locally with no API key**. Open the Sendero lens and paste a CSV to see it.

---

## Setup

```bash
npm install      # only if node_modules isn't already present
node server.js
```

Open **http://localhost:3001**

- **Sendero lens** works immediately — no key needed (local statistics).
- **Catalyze / Equity Lens** need an Anthropic key (Settings ⚙). Add OpenAI/Gemini keys to enable
  cross-model consensus on Catalyze.

Model IDs default to real, current models (`claude-sonnet-4`, `gpt-4o`, `gemini-2.0-flash`).

---

## Architecture

```
Browser (public/index.html — one page, three lenses, shared Adrian engine + local stats)
    ↓ POST /proxy/anthropic
    ↓ POST /proxy/openai     →  server.js (Express)  →  Model APIs
    ↓ POST /proxy/gemini
```

Keys travel per-request in headers and are never stored server-side. The frontend keeps them in
browser localStorage only.

---

## What's next (roadmap toward a real pilot)

1. **Validation layer** — port NWC Quant's `validation.py` mindset (walk-forward, deflated-Sharpe
   "did it beat luck?") into a study proving Adrian's verdicts agree with expert decisions beyond chance.
2. **Design system** — fold in Coherence AI's visual language for a consumer-grade finish.
3. **Sendero benchmark moat** — the private precedent library (`benchmarks.json` / `playbooks.json`)
   that enriches verdicts and grows per engagement.

---

## Catalyze wedge

First real user: an ALK+ NSCLC principal investigator. Recommended test papers — CROWN (lorlatinib,
NEJM 2020), ALTA-1L (brigatinib, NEJM 2018), PROFILE 1014 (crizotinib, NEJM 2013). Paste an abstract
into the Catalyze lens.

---

*Adrian · Operation Mincemeat LLC · For research & decision-support use. It extends expertise; it does not replace it.*
