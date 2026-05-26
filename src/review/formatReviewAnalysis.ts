import type { ReviewAnalysis } from "../types";

export function formatReviewAnalysis(analysis: ReviewAnalysis): string {
  const lines: string[] = [
    "Analyzing Review...",
    "",
    `Summary: ${analysis.summary}`,
    "",
    `Overall Sentiment: ${analysis.overall_sentiment}`,
    `Score: ${analysis.score}/10`,
    "",
    "Detailed Aspects:"
  ];

  if (analysis.aspects.length === 0) {
    lines.push("(no specific aspects extracted)");
  } else {
    analysis.aspects.forEach((aspect, index) => {
      lines.push(
        `${index + 1}. ${aspect.topic} (${aspect.sentiment}): "${aspect.detail}"`
      );
    });
  }

  return lines.join("\n");
}
