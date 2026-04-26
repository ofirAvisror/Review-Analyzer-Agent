# Architecture - Smart Agent Router (Exercise 2)

## 1. High-level flow

```
                                 history.json
                                       |
                                       v
                               (load on startup)
                                       |
              user message             v
              -----------> +---------------------+
                           |     CLI (index.ts)  |
                           +----------+----------+
                                      |
                                      v
                           +---------------------+
                           |   orchestrator.ts   |
                           +----------+----------+
                                      |
                                      v  (1) classify
                           +---------------------+
                           |    Router Agent     |  Few-shot prompt,
                           |  outputType = Zod   |  structured output:
                           +----------+----------+  intent/params/conf
                                      |
                                      | validate JSON shape (Zod safeParse +
                                      | sanitize string params)
                                      v  (2) hand the conversation off
                           +---------------------+
                           |    Triage Agent     |  Input Guardrails:
                           |   (real handoffs)   |  non-empty, safety
                           +----+--+---+---+-----+
                                |  |   |   |
              +-----------------+  |   |   +-----------------+
              v                    v   v                     v
      +------------+   +------------+   +-------------+   +-------------+
      |  Weather   |   |   Math     |   |  Exchange   |   | GeneralChat |
      |   Agent    |   |   Agent    |   |    Agent    |   |   Agent     |
      |            |   |            |   |             |   | (persona +  |
      | get_weather|   |calc_math   |   |get_xr +     |   |  output     |
      |   tool     |   |   tool     |   |calc_math    |   |  guardrails)|
      +------------+   +------------+   +------+------+   +-------------+
                                              |
                                              | (optional second-level handoff
                                              |  for complex follow-up math)
                                              v
                                        Math Agent
```

## 2. Agents

| Agent | Responsibility | Tools | Handoffs in/out | Output |
| --- | --- | --- | --- | --- |
| Router Agent     | Few-shot classifier; produces structured routing decision. Does NOT answer the user. | - | - | `RouterDecisionSchema` (Zod) |
| Triage Agent     | Top-level dispatcher. Hands off to the right specialist using SDK handoffs. | - | -> Weather / Math / Exchange / GeneralChat. Carries 2 input guardrails. | string |
| Weather Agent    | Answers current-weather questions using a real API. | `get_weather` | <- Triage | string |
| Math Agent       | Solves word problems and direct expressions. LLM only translates to a formal expression; computation is delegated to the tool. | `calculate_math` | <- Triage, <- Exchange | string |
| Exchange Agent   | Answers currency questions; converts amounts by chaining the two tools; can escalate to Math. | `get_exchange_rate`, `calculate_math` | <- Triage; -> Math | string |
| General Chat Agent | "Pipeline" persona (cynical-but-helpful research assistant; Data Engineering metaphors). | - | <- Triage | string with output guardrails |
| Safety Input Classifier (internal) | Used inside `safetyInputGuardrail`. | - | - | structured (`isUnsafe`, `isOffTopic`, `reason`) |
| Output Safety Reviewer (internal)  | Used inside `safetyOutputGuardrail`. | - | - | structured (`isUnsafe`, `reason`) |

## 3. Tools (deterministic)

| Tool | Validation | Backing service |
| --- | --- | --- |
| `get_weather`        | Zod (`{ city: string }`)                     | Open-Meteo (geocoding + forecast). |
| `calculate_math`     | Zod (`{ expression: string }`)               | `mathjs` evaluator with a safe character allowlist. |
| `get_exchange_rate`  | Zod (`{ fromCurrencyCode, toCurrencyCode }`) | Frankfurter API (defaults destination to ILS). |

The LLM never computes math itself - it must always call `calculate_math`.

## 4. Handoffs (>= 2 real ones)

1. `Triage Agent -> Weather Agent`
2. `Triage Agent -> Math Agent`
3. `Triage Agent -> Exchange Agent`
4. `Triage Agent -> General Chat Agent`
5. `Exchange Agent -> Math Agent` (second-level handoff for follow-up math)

All handoffs use the SDK's `handoffs: [...]` array on the agent
constructor. The Triage Agent's prompt also includes
`RECOMMENDED_PROMPT_PREFIX` from `@openai/agents-core/extensions` so the
model knows how the SDK exposes handoffs as `transfer_to_<agent>` tools.

## 5. Guardrails

### Input Guardrails (attached to Triage Agent)

| Name | Type | What it does |
| --- | --- | --- |
| `nonEmptyInputGuardrail` | deterministic | Tripwire on empty / whitespace-only input or input above 4000 characters. |
| `safetyInputGuardrail`   | LLM-backed   | Runs a small classifier agent. Tripwires on malicious-code requests, political / partisan content, hateful or sexual content, and clear prompt-injection attempts. |

### Output Guardrails (attached to General Chat Agent)

| Name | Type | What it does |
| --- | --- | --- |
| `formatOutputGuardrail` | deterministic | Tripwire on empty reply or reply > 1500 characters. |
| `safetyOutputGuardrail` | LLM-backed   | Reviewer agent re-reads the reply and tripwires on political endorsements, malware code, hateful / sexual content. |

### Router Output Validation

The Router's structured output is validated twice:
1. By the SDK at parse time, against the Zod schema declared in
   `outputType`.
2. By `validateRouterOutput()` in `orchestrator.ts`, which re-runs Zod
   `safeParse` and additionally sanitizes string parameter values
   (trims trailing JSON-like noise the model occasionally emits).

### Refusal handling

Any guardrail tripwire (input or output) is caught by the orchestrator
and converted into the canonical safety reply:
> "I cannot process this request due to safety protocols."

This satisfies Part H of the assignment regardless of which guardrail
fired or which agent owned the conversation.

## 6. Memory

- Persisted as `history.json` at the project root via
  `src/storage/history.ts`.
- On startup, the CLI loads existing history and prints
  `Welcome back!` if any previous turns exist.
- Each turn appends a `user` + `assistant` pair and immediately persists.
- `/reset` deletes the file and clears the in-memory array.
- The orchestrator injects the entire history into the Triage Agent's
  input items, so handed-off specialists (especially the General Chat
  Agent) can refer back to previous turns - this is what makes "Which
  city did I ask about?" answerable across restarts.

## 7. Key files

- `src/prompts.ts`            - all agent prompts and few-shot examples.
- `src/agents/*.ts`           - Agent definitions (one file per agent).
- `src/tools.ts`              - tool definitions (`tool({ ... })`).
- `src/guardrails/input.ts`   - input guardrails.
- `src/guardrails/output.ts`  - output guardrails + General Chat
                                 attachment.
- `src/orchestrator.ts`       - Router -> Triage glue, guardrail catch,
                                 history injection.
- `src/index.ts`              - interactive CLI.
- `scripts/demo.ts`           - generates `logs/execution-log.txt`.
- `docs/architecture.md`      - this document.
