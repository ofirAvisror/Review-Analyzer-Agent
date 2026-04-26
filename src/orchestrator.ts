import {
  assistant,
  InputGuardrailTripwireTriggered,
  OutputGuardrailTripwireTriggered,
  run,
  system,
  user
} from "@openai/agents";
import type { AgentInputItem } from "@openai/agents";

import {
  RouterDecisionSchema,
  routerAgent
} from "./agents/routerAgent";
import { triageAgent } from "./agents/triageAgent";
import type { Message, RouterDecision, TurnResult } from "./types";

const SAFETY_REFUSAL =
  "I cannot process this request due to safety protocols.";

interface TraceLogger {
  log: (line: string) => void;
}

const noopTrace: TraceLogger = { log: () => {} };

export interface RunTurnOptions {
  trace?: TraceLogger;
}

export async function runTurn(
  userInput: string,
  history: Message[],
  options: RunTurnOptions = {}
): Promise<TurnResult> {
  const trace = options.trace ?? noopTrace;

  let routerDecision: RouterDecision | null = null;
  try {
    const routerResult = await run(routerAgent, userInput);
    routerDecision = validateRouterOutput(routerResult.finalOutput);
    trace.log(
      `[router] intent=${routerDecision.intent} confidence=${routerDecision.confidence.toFixed(
        2
      )} parameters=${JSON.stringify(routerDecision.parameters)}`
    );
  } catch (error) {
    if (error instanceof InputGuardrailTripwireTriggered) {
      trace.log(
        `[guardrail:input] tripwire from router agent (${error.message})`
      );
      return safeRefusal("Router Agent", routerDecision);
    }
    trace.log(
      `[router] failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  const triageInput = buildTriageInput(userInput, history, routerDecision);

  try {
    const triageResult = await run(triageAgent, triageInput);
    const finalAgentName = triageResult.lastAgent?.name ?? "Triage Agent";
    const answer = stringifyFinalOutput(triageResult.finalOutput);
    trace.log(`[triage] final agent = ${finalAgentName}`);
    return {
      answer,
      routerDecision,
      finalAgentName,
      blocked: false
    };
  } catch (error) {
    if (error instanceof InputGuardrailTripwireTriggered) {
      trace.log(
        `[guardrail:input] tripwire on triage agent (${error.message})`
      );
      return safeRefusal("Triage Agent", routerDecision);
    }
    if (error instanceof OutputGuardrailTripwireTriggered) {
      trace.log(
        `[guardrail:output] tripwire on final agent (${error.message})`
      );
      return safeRefusal("General Chat Agent", routerDecision);
    }
    throw error;
  }
}

function safeRefusal(
  agentName: string,
  routerDecision: RouterDecision | null
): TurnResult {
  return {
    answer: SAFETY_REFUSAL,
    routerDecision,
    finalAgentName: agentName,
    blocked: true
  };
}

function validateRouterOutput(value: unknown): RouterDecision {
  const parsed = RouterDecisionSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error(
      `Router output failed schema validation: ${parsed.error.message}`
    );
  }
  const { intent, parameters, confidence } = parsed.data;
  return {
    intent,
    parameters: sanitizeParameters(parameters),
    confidence
  };
}

function sanitizeParameters<T extends Record<string, unknown>>(value: T): T {
  const cleaned: Record<string, unknown> = { ...value };
  for (const [key, raw] of Object.entries(cleaned)) {
    if (typeof raw === "string") {
      const stripped = raw
        .trim()
        .replace(/[\s,]*[\]\}]+[\s,]*$/g, "")
        .replace(/^[\[\{][\s,]*/g, "")
        .trim();
      cleaned[key] = stripped.length === 0 ? null : stripped;
    }
  }
  return cleaned as T;
}

function buildTriageInput(
  userInput: string,
  history: Message[],
  routerDecision: RouterDecision | null
): AgentInputItem[] {
  const items: AgentInputItem[] = [];

  if (routerDecision) {
    items.push(
      system(
        `Routing hint from Router Agent: intent=${routerDecision.intent}, confidence=${routerDecision.confidence.toFixed(
          2
        )}, parameters=${JSON.stringify(routerDecision.parameters)}.`
      )
    );
  }

  for (const message of history) {
    if (message.role === "user") {
      items.push(user(message.content));
    } else if (message.role === "assistant") {
      items.push(assistant(message.content));
    } else if (message.role === "system") {
      items.push(system(message.content));
    }
  }

  items.push(user(userInput));
  return items;
}

function stringifyFinalOutput(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    const v = value as { reply?: unknown; text?: unknown };
    if (typeof v.reply === "string") return v.reply;
    if (typeof v.text === "string") return v.text;
    return JSON.stringify(value);
  }
  return String(value);
}
