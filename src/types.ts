export type RouterIntent = "analyzeReview" | "notReview";

export type OverallSentiment = "Positive" | "Negative" | "Neutral" | "Mixed";

export type AspectSentiment = "Positive" | "Negative" | "Neutral";

export interface ReviewAspect {
  topic: string;
  sentiment: AspectSentiment;
  detail: string;
}

export interface ReviewAnalysis {
  summary: string;
  overall_sentiment: OverallSentiment;
  score: number;
  aspects: ReviewAspect[];
}

export interface RouterParameters {
  reviewText?: string | null;
}

export interface RouterDecision {
  intent: RouterIntent;
  parameters: RouterParameters;
  confidence: number;
}

export interface TurnResult {
  answer: string;
  routerDecision: RouterDecision | null;
  finalAgentName: string;
  blocked: boolean;
}
