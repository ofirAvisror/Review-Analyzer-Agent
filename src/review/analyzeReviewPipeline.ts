import { run } from "@openai/agents";

import { reviewAnalyzerAgent } from "../agents/reviewAnalyzerAgent";
import type { ReviewAnalysis } from "../types";
import { normalizeReviewAnalysis } from "./normalizeReviewAnalysis";
import { parseReviewAnalysis, selfCorrectReview } from "./selfCorrectReview";
import { validateReviewAnalysis } from "./validateReviewAnalysis";

interface TraceLogger {
  log: (line: string) => void;
}

export interface ReviewPipelineResult {
  analysis: ReviewAnalysis;
  corrected: boolean;
  issues: string[];
}

export async function runReviewPipeline(
  reviewText: string,
  trace: TraceLogger
): Promise<ReviewPipelineResult> {
  trace.log("[review-analyzer] analyzing review...");
  const analyzerResult = await run(reviewAnalyzerAgent, reviewText);
  let analysis = normalizeReviewAnalysis(
    reviewText,
    parseReviewAnalysis(analyzerResult.finalOutput)
  );
  trace.log(`[review-analyzer] raw JSON = ${JSON.stringify(analysis)}`);

  let validation = validateReviewAnalysis(analysis);
  if (validation.consistent) {
    trace.log("[review-analyzer] validation passed");
    return { analysis, corrected: false, issues: [] };
  }

  trace.log(
    `[review-analyzer] validation failed: ${validation.issues.join(" | ")}`
  );
  analysis = await selfCorrectReview(
    reviewText,
    analysis,
    validation.issues,
    trace
  );
  analysis = normalizeReviewAnalysis(reviewText, analysis);

  validation = validateReviewAnalysis(analysis);
  return {
    analysis,
    corrected: true,
    issues: validation.issues
  };
}
