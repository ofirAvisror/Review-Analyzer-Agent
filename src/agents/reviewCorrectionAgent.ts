import { Agent } from "@openai/agents";

import { REVIEW_CORRECTION_PROMPT } from "../prompts";
import { ReviewAnalysisSchema } from "./reviewAnalyzerAgent";

export const reviewCorrectionAgent = new Agent({
  name: "Review Correction Agent",
  handoffDescription:
    "Fixes inconsistent review analysis JSON based on the original review text.",
  instructions: REVIEW_CORRECTION_PROMPT,
  model: "gpt-4.1-mini",
  outputType: ReviewAnalysisSchema
});
