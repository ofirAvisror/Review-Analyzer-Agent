import type { ReviewAnalysis } from "../types";

export interface ValidationResult {
  consistent: boolean;
  issues: string[];
}

function countSentiments(
  analysis: ReviewAnalysis
): { positive: number; negative: number; neutral: number } {
  let positive = 0;
  let negative = 0;
  let neutral = 0;
  for (const aspect of analysis.aspects) {
    if (aspect.sentiment === "Positive") positive++;
    else if (aspect.sentiment === "Negative") negative++;
    else neutral++;
  }
  return { positive, negative, neutral };
}

export function validateReviewAnalysis(
  analysis: ReviewAnalysis
): ValidationResult {
  const issues: string[] = [];
  const { overall_sentiment: sentiment, score } = analysis;

  if (sentiment === "Positive" && score <= 3) {
    issues.push(
      `You detected a Positive sentiment but gave a score of ${score}.`
    );
  }
  if (sentiment === "Negative" && score >= 8) {
    issues.push(
      `You detected a Negative sentiment but gave a score of ${score}.`
    );
  }
  if (sentiment === "Neutral" && (score <= 2 || score >= 9)) {
    issues.push(
      `Neutral sentiment is inconsistent with extreme score ${score}.`
    );
  }
  if (sentiment === "Mixed" && (score <= 2 || score >= 9)) {
    issues.push(
      `Mixed sentiment is unlikely with extreme score ${score}.`
    );
  }

  const counts = countSentiments(analysis);
  const totalAspects = analysis.aspects.length;

  if (totalAspects > 0) {
    if (
      counts.positive === totalAspects &&
      (sentiment === "Negative" || sentiment === "Neutral")
    ) {
      issues.push(
        "All aspects are Positive but overall_sentiment is not Positive or Mixed."
      );
    }
    if (
      counts.negative === totalAspects &&
      (sentiment === "Positive" || sentiment === "Neutral")
    ) {
      issues.push(
        "All aspects are Negative but overall_sentiment is not Negative or Mixed."
      );
    }
    if (
      counts.positive > 0 &&
      counts.negative > 0 &&
      sentiment !== "Mixed"
    ) {
      const mostlyPositive =
        sentiment === "Positive" &&
        score >= 7 &&
        counts.positive >= counts.negative;
      const mostlyNegative =
        sentiment === "Negative" &&
        score <= 4 &&
        counts.negative >= counts.positive;

      if (!mostlyPositive && !mostlyNegative) {
        issues.push(
          "Review has both positive and negative aspects but overall_sentiment does not match the balance (use Mixed, or Positive/Negative when one side clearly dominates)."
        );
      }
    }
  }

  return { consistent: issues.length === 0, issues };
}
