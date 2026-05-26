import type { ReviewAnalysis, ReviewAspect } from "../types";

const SARCASM_PATTERNS = [
  /\boh great\b/i,
  /איזה כיף/,
  /\bjust what i needed\b/i,
  /thanks for.*rolling/i,
  /תודה.*גלגלה/,
  /גלגלה עיניים/
];

const TOPIC_KEYWORDS: Record<string, RegExp[]> = {
  Food: [/food|burger|pizza|steak|dish|meal|tasty|eat|אוכל|פיצה|המבורגר|מנה/i],
  Service: [
    /service|waiter|waitress|hostess|staff|clerk|reception|spill|soup|מלצר|מארחת|שירות|פקיד|קבלה/i
  ],
  Price: [/price|expensive|rip-off|robbery|outrageous|cost|מחיר|שחיטה|מוגזם/i],
  Delivery: [/deliver|driver|late|cold|package arrived|שליח|דפק איחור|הגיע/i],
  Product: [/product|cheap|quality|feel|מוצר|זול/i],
  Packaging: [/box|packaging|קופס/i],
  Room: [/room|ac|clean|מזגן|חדר|נקי/i],
  "Check-in": [/check-in|check in|צ'ק-אין|צ'ק/i]
};

function splitReviewClauses(reviewText: string): string[] {
  return reviewText
    .split(/(?:\.\s+|!\s+|\?\s+|,\s*|\s+אבל\s+)/u)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function findBestClause(reviewText: string, topic: string): string | null {
  const clauses = splitReviewClauses(reviewText);
  const patterns = TOPIC_KEYWORDS[topic] ?? [];
  for (const clause of clauses) {
    if (patterns.some((pattern) => pattern.test(clause))) {
      return clause;
    }
  }
  return null;
}

function detailMatchesReview(detail: string, reviewText: string): boolean {
  const normalizedDetail = detail.toLowerCase().replace(/\s+/g, " ");
  const normalizedReview = reviewText.toLowerCase().replace(/\s+/g, " ");
  if (normalizedReview.includes(normalizedDetail)) return true;

  const words = normalizedDetail.split(" ").filter((w) => w.length > 3);
  if (words.length === 0) return false;
  const hits = words.filter((word) => normalizedReview.includes(word));
  return hits.length >= Math.ceil(words.length * 0.6);
}

function annotateSarcasm(detail: string, clause: string): string {
  const hasSarcasm = SARCASM_PATTERNS.some((pattern) => pattern.test(clause));
  if (!hasSarcasm) return detail;
  if (/sarcasm|attitude detected/i.test(detail)) return detail;
  const base = detail.replace(/\s*\([^)]*\)\s*$/u, "").trim();
  return `${base} (sarcasm/attitude detected)`;
}

function normalizeAspectDetail(
  aspect: ReviewAspect,
  reviewText: string
): ReviewAspect {
  let detail = aspect.detail.trim();

  if (
    detail.length > 140 ||
    !detailMatchesReview(detail, reviewText) ||
    /\([^)]*waited[^)]*\)/i.test(detail)
  ) {
    const clause = findBestClause(reviewText, aspect.topic);
    if (clause) {
      detail = clause;
    }
  }

  detail = annotateSarcasm(detail, detail);

  return { ...aspect, detail };
}

function normalizeSummarySpacing(summary: string): string {
  return summary
    .replace(/\ba(negative|positive|excellent|average|hour|issue)\b/gi, "a $1")
    .replace(/(causing|experienced|resulting|leading|during)(it|a|an|the)/gi, "$1 $2")
    .replace(/([a-z]{3,})(is|was|for|the|and|but|it)\b/gi, "$1 $2")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function normalizeReviewAnalysis(
  reviewText: string,
  analysis: ReviewAnalysis
): ReviewAnalysis {
  return {
    ...analysis,
    summary: normalizeSummarySpacing(analysis.summary),
    aspects: analysis.aspects.map((aspect) =>
      normalizeAspectDetail(aspect, reviewText)
    )
  };
}
