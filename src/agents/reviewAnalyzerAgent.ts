import { Agent } from "@openai/agents";
import { z } from "zod";

import { REVIEW_ANALYZER_PROMPT } from "../prompts";

export const AspectSentimentSchema = z.enum(["Positive", "Negative", "Neutral"]);

export const OverallSentimentSchema = z.enum([
  "Positive",
  "Negative",
  "Neutral",
  "Mixed"
]);

export const ReviewAspectSchema = z.object({
  topic: z.string(),
  sentiment: AspectSentimentSchema,
  detail: z.string()
});

export const ReviewAnalysisSchema = z.object({
  summary: z.string(),
  overall_sentiment: OverallSentimentSchema,
  score: z.number().min(1).max(10),
  aspects: z.array(ReviewAspectSchema)
});

export type ReviewAnalysisParsed = z.infer<typeof ReviewAnalysisSchema>;

export const reviewAnalyzerAgent = new Agent({
  name: "Review Analyzer Agent",
  handoffDescription:
    "Analyzes customer reviews with aspect-based sentiment (ABSA) and " +
    "returns structured JSON.",
  instructions: REVIEW_ANALYZER_PROMPT,
  model: "gpt-4.1-mini",
  outputType: ReviewAnalysisSchema
});
