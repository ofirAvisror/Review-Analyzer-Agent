# Architecture — Review Analyzer Agent (Homework #3)

## Flow

```
User input
    |
    v
+---------------+
|  index.ts     |  CLI loop
+-------+-------+
        |
        v
+---------------+
| orchestrator  |
+-------+-------+
        |
        v  (1) classify
+---------------+
| Router Agent  |  ROUTER_SYSTEM_PROMPT
| output = Zod  |  intent: analyzeReview | notReview
+-------+-------+  parameters: reviewText
        |
        +-- notReview --> guidance message
        |
        v  (2) analyze
+---------------+
| Review        |  REVIEW_ANALYZER_PROMPT
| Analyzer      |  JSON: summary, sentiment, score, aspects
+-------+-------+
        |
        v  (3) validate
+---------------+
| validateReview|  deterministic consistency checks
| Analysis      |
+-------+-------+
        |
        +-- OK --> formatReviewAnalysis --> user
        |
        v  inconsistent
+---------------+
| Review        |  REVIEW_CORRECTION_PROMPT
| Correction    |  second LLM call, JSON only
+---------------+
```

## Agents

| Agent | Prompt | Output |
|-------|--------|--------|
| Router | `ROUTER_SYSTEM_PROMPT` | `{ intent: analyzeReview \| notReview, parameters, confidence }` |
| Review Analyzer | `REVIEW_ANALYZER_PROMPT` | `ReviewAnalysis` JSON |
| Review Correction | `REVIEW_CORRECTION_PROMPT` | corrected `ReviewAnalysis` JSON |

Supported router intents (Part A): **`analyzeReview`**, **`notReview`** — see `SUPPORTED_ROUTER_INTENTS` in `routerAgent.ts`.

## Why JSON mode?
Structured output allows Zod validation, trace logging of raw JSON, and deterministic self-correction before presenting results to the user.
