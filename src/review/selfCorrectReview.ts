import { run } from "@openai/agents";

import { reviewCorrectionAgent } from "../agents/reviewCorrectionAgent";
import {
  ReviewAnalysisSchema,
  type ReviewAnalysisParsed
} from "../agents/reviewAnalyzerAgent";
import type { ReviewAnalysis } from "../types";
import { validateReviewAnalysis } from "./validateReviewAnalysis";

interface TraceLogger {
  log: (line: string) => void;
}

function buildCorrectionInput(
  reviewText: string,
  analysis: ReviewAnalysis,
  issues: string[]
): string {
  return [
    "Original review:",
    reviewText,
    "",
    "Previous JSON (inconsistent):",
    JSON.stringify(analysis, null, 2),
    "",
    "Issues detected:",
    ...issues.map((issue) => `- ${issue}`),
    "",
    "Please fix this inconsistency based on the review. Return corrected JSON only."
  ].join("\n");
}

export async function selfCorrectReview(
  reviewText: string,
  analysis: ReviewAnalysis,
  issues: string[],
  trace: TraceLogger
): Promise<ReviewAnalysis> {
  trace.log(`[self-correction] issues: ${issues.join(" | ")}`);

  const correctionInput = buildCorrectionInput(reviewText, analysis, issues);
  const result = await run(reviewCorrectionAgent, correctionInput);
  const parsed = ReviewAnalysisSchema.safeParse(result.finalOutput);

  if (!parsed.success) {
    trace.log(
      `[self-correction] correction output failed validation: ${parsed.error.message}`
    );
    return analysis;
  }

  const corrected = parsed.data as ReviewAnalysis;
  const revalidation = validateReviewAnalysis(corrected);

  if (!revalidation.consistent) {
    trace.log(
      `[self-correction] still inconsistent after correction: ${revalidation.issues.join(" | ")}`
    );
  } else {
    trace.log("[self-correction] corrected JSON passed validation");
  }

  return corrected;
}

export function parseReviewAnalysis(value: unknown): ReviewAnalysis {
  const parsed = ReviewAnalysisSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error(
      `Review analysis failed schema validation: ${parsed.error.message}`
    );
  }
  return parsed.data as ReviewAnalysisParsed;
}
