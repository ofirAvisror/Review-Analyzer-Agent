# Review Analyzer Agent (Homework #3)

**Review Summarizer & Insight Extraction** — CLI that turns free-text customer reviews into structured insights using a **3-stage pipeline**: Router → Review Analyzer → Self-Correction.

Repository: [github.com/ofirAvisror/Review-Analyzer-Agent](https://github.com/ofirAvisror/Review-Analyzer-Agent)

Built with **OpenAI Agents SDK + TypeScript + Bun**.

## System Requirements
- pnpm
- Bun
- `OPENAI_API_KEY` in `.env` (see `.env.example`)

## Quick Start
```bash
pnpm install
pnpm dev      # interactive CLI
pnpm demo     # run all scenarios → logs/execution-log.txt
pnpm check    # TypeScript
```

Dependencies are listed in `package.json` (equivalent to `requirements.txt` for Node/TypeScript projects).

## Architecture

```
User review text
  → Router Agent           (ROUTER_SYSTEM_PROMPT: analyzeReview + reviewText)
  → Review Analyzer Agent  (REVIEW_ANALYZER_PROMPT → JSON via Zod)
  → Self-Correction Layer  (validateReviewAnalysis → optional correction LLM)
  → Formatted console output
```

See also [docs/architecture.md](docs/architecture.md).

### Part A — Router
- Intent **`analyzeReview`** (supported intent / “function” per assignment) with parameter **`reviewText`**
- Few-shot examples from the assignment (restaurant, hotel, explicit analyze request, Hebrew reviews)
- Strips meta-phrases: `"Analyze this review:"`, `"תנתח לי את הביקורת הבאה:"`, etc.
- Non-review input → `notReview` + short guidance message
- `resolveReviewText()` prefers the user's original text when the router drops spaces

### Part B — ABSA + Summarization (JSON mode)
Structured output (JSON only, validated by Zod):
```json
{
  "summary": "one short English sentence",
  "overall_sentiment": "Positive | Negative | Neutral | Mixed",
  "score": 6,
  "aspects": [{ "topic": "Food", "sentiment": "Positive", "detail": "..." }]
}
```

### Part C — Slang & Sarcasm
`REVIEW_ANALYZER_PROMPT` includes explicit rules for **English** ("a show", "rip-off", "Oh great" + complaint) and **Israeli Hebrew** ("אש", "הצגה", "שחיטה", "דפק איחור", "חבל על הזמן", "איזה כיף" + complaint, "גלגלה עיניים"), plus `(sarcasm/attitude detected)` in aspect detail.

### Part D — Self-Correction
`validateReviewAnalysis()` detects inconsistencies (e.g. Positive + score 2). A second LLM call with `REVIEW_CORRECTION_PROMPT` returns corrected JSON only.

## Project Layout
```
src/
  agents/
    routerAgent.ts           SUPPORTED_ROUTER_INTENTS = analyzeReview | notReview
    reviewAnalyzerAgent.ts
    reviewCorrectionAgent.ts
  review/
    analyzeReviewPipeline.ts
    validateReviewAnalysis.ts
    selfCorrectReview.ts
    normalizeReviewAnalysis.ts
    extractReviewText.ts
    formatReviewAnalysis.ts
  prompts.ts                 ROUTER_SYSTEM_PROMPT, REVIEW_ANALYZER_PROMPT, REVIEW_CORRECTION_PROMPT
  orchestrator.ts
  index.ts                   main entry (CLI)
scripts/
  demo.ts
logs/
  execution-log.txt
```

## Demo Log (`pnpm demo`)

| Scenario | Assignment mapping |
|----------|-------------------|
| 1, 1b | Case 1 — hotel (EN + HE) |
| 2, 11 | Case 2 — pizza slang |
| 3, 3b | Case 3 — product (EN + HE) |
| 4, 12 | Case 4 — sarcasm (EN + HE) |
| 5, 5b | Case 5 — mostly positive (EN + HE) |
| 6, 6b | Full burger + hostess example (EN + HE) |
| 7–8 | Router few-shots |
| 9–10 | notReview |
| 13 | **Required** self-correction demo (synthetic Positive + score 2) |

## Submission Checklist (Homework #3)

| Deliverable | File |
|-------------|------|
| Source + prompts + entry point + dependencies | `src/`, `scripts/demo.ts`, `package.json` |
| Short explanation (architecture, router, ABSA, slang, self-correction) | this README + `docs/architecture.md` |
| Execution log (≥3 runs: regular, slang, self-correction) | `logs/execution-log.txt` |
| Valid JSON + clear console output for every `analyzeReview` | `formatReviewAnalysis.ts`, demo log |

## Example Output
```
Analyzing Review...

Summary: Excellent food, but the experience was hurt by high prices and poor service attitude.

Overall Sentiment: Mixed
Score: 6/10

Detailed Aspects:
1. Food (Positive): "המבורגר כזה עוד לא אכלתי, פשוט וואו"
2. Price (Negative): "המחיר? שחיטה"
3. Service (Negative): "מארחת שגלגלה עיניים (sarcasm/attitude detected)"
```

## Design Notes
- **JSON mode + Zod**: parseable, testable, enables deterministic validation before display.
- **Anti-hallucination**: aspects must be supported by the review text; `normalizeReviewAnalysis` aligns quotes to the source review.
- **Post-processing**: fixes spacing in summaries, realigns aspect quotes, and annotates sarcasm when detected.
- **HW3-only codebase**: no weather/math/exchange/triage from Homework #2.
