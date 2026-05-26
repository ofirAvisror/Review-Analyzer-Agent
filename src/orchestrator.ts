import { run } from "@openai/agents";

import {
  RouterDecisionSchema,
  routerAgent
} from "./agents/routerAgent";
import { runReviewPipeline } from "./review/analyzeReviewPipeline";
import { resolveReviewText } from "./review/extractReviewText";
import { formatReviewAnalysis } from "./review/formatReviewAnalysis";
import type { RouterDecision, TurnResult } from "./types";

const NOT_A_REVIEW_MESSAGE =
  "Please paste a review about a restaurant, hotel, product, delivery, or service.\n" +
  'Example: "The pizza was excellent but the price is outrageous"';

const EMPTY_INPUT_MESSAGE = "Please enter a review to analyze.";

interface TraceLogger {
  log: (line: string) => void;
}

const noopTrace: TraceLogger = { log: () => {} };

export interface RunTurnOptions {
  trace?: TraceLogger;
}

export async function runTurn(
  userInput: string,
  options: RunTurnOptions = {}
): Promise<TurnResult> {
  const trace = options.trace ?? noopTrace;
  const trimmed = userInput.trim();

  if (trimmed.length === 0) {
    trace.log("[input] empty input rejected");
    return {
      answer: EMPTY_INPUT_MESSAGE,
      routerDecision: null,
      finalAgentName: "Input Validator",
      blocked: false
    };
  }

  let routerDecision: RouterDecision | null = null;
  try {
    const routerResult = await run(routerAgent, trimmed);
    routerDecision = validateRouterOutput(routerResult.finalOutput);
  } catch (error) {
    trace.log(
      `[router] failed: ${error instanceof Error ? error.message : String(error)}`
    );
    throw error;
  }

  if (routerDecision.intent !== "analyzeReview") {
    trace.log(
      `[router] intent=${routerDecision.intent} confidence=${routerDecision.confidence.toFixed(
        2
      )} parameters=${JSON.stringify(routerDecision.parameters)}`
    );
    trace.log("[router] not a review — skipping analyzer");
    return {
      answer: NOT_A_REVIEW_MESSAGE,
      routerDecision,
      finalAgentName: "Router Agent",
      blocked: false
    };
  }

  const reviewText = resolveReviewText(
    trimmed,
    routerDecision.parameters.reviewText
  );
  routerDecision.parameters.reviewText = reviewText;
  trace.log(
    `[router] intent=${routerDecision.intent} confidence=${routerDecision.confidence.toFixed(
      2
    )} parameters=${JSON.stringify(routerDecision.parameters)}`
  );

  const pipelineResult = await runReviewPipeline(reviewText, trace);
  const answer = formatReviewAnalysis(pipelineResult.analysis);
  const finalAgentName = pipelineResult.corrected
    ? "Review Analyzer (self-corrected)"
    : "Review Analyzer";
  trace.log(`[review] final agent = ${finalAgentName}`);

  return {
    answer,
    routerDecision,
    finalAgentName,
    blocked: false
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
    if (typeof raw !== "string") continue;
    let stripped = raw.trim();
    if (/^[\[\{]/.test(stripped) && /[\]\}]$/.test(stripped)) {
      stripped = stripped
        .replace(/[\s,]*[\]\}]+[\s,]*$/g, "")
        .replace(/^[\[\{][\s,]*/g, "")
        .trim();
    }
    cleaned[key] = stripped.length === 0 ? null : stripped;
  }
  return cleaned as T;
}
