import "dotenv/config";

import { mkdir, writeFile } from "node:fs/promises";
import { runTurn } from "../src/orchestrator";
import { formatReviewAnalysis } from "../src/review/formatReviewAnalysis";
import { normalizeReviewAnalysis } from "../src/review/normalizeReviewAnalysis";
import { selfCorrectReview } from "../src/review/selfCorrectReview";
import { validateReviewAnalysis } from "../src/review/validateReviewAnalysis";
import type { ReviewAnalysis } from "../src/types";

interface Scenario {
  title: string;
  input: string;
}

const scenarios: Scenario[] = [
  {
    title: "1. Regular review — hotel (assignment case 1)",
    input:
      "The room was huge and clean, but the AC did not work and the reception clerk was impatient."
  },
  {
    title: "1b. Assignment case 1 (Hebrew) — hotel",
    input:
      "החדר היה ענק ונקי, אבל המזגן לא עבד והפקיד בקבלה היה חסר סבלנות."
  },
  {
    title: "2. Slang review — pizza show, late delivery (assignment case 2)",
    input:
      "The pizza was a show, but the driver was super late and everything was already cold."
  },
  {
    title: "3. Product review (assignment case 3)",
    input:
      "The package arrived fast and the box looked good, but the product itself feels really cheap."
  },
  {
    title: "3b. Assignment case 3 (Hebrew) — product",
    input:
      "החבילה הגיעה מהר והקופסה הייתה נראית טוב, אבל המוצר עצמו מרגיש ממש זול."
  },
  {
    title: "4. Sarcasm — forty-minute wait (assignment case 4)",
    input: "Oh great, we waited forty minutes for our dish again."
  },
  {
    title: "5. Mostly positive review (assignment case 5)",
    input:
      "Fast service, tasty food, price a bit high but overall an excellent experience."
  },
  {
    title: "5b. Assignment case 5 (Hebrew) — mostly positive",
    input:
      "שירות מהיר, אוכל טעים, מחיר קצת גבוה אבל סך הכל חוויה מעולה."
  },
  {
    title:
      "6. Full assignment example — burger, price, sarcastic hostess (English)",
    input:
      "Listen, I've never had a burger like this, just wow! But the price? A total rip-off. And thanks to the hostess who rolled her eyes when we asked for more napkins."
  },
  {
    title:
      "6b. Full assignment example — burger, price, sarcastic hostess (Hebrew)",
    input:
      "תשמעו, המבורגר כזה עוד לא אכלתי, פשוט וואו! אבל המחיר? שחיטה. וממש תודה למארחת שגלגלה עיניים כשביקשנו עוד מפיות."
  },
  {
    title: "7. Router few-shot — restaurant spill",
    input:
      "I was at a restaurant yesterday, the food was okay but the waiter spilled soup on me"
  },
  {
    title: "8. Router few-shot — explicit analyze request",
    input:
      "Analyze this review: the pizza was excellent but the price is outrageous"
  },
  {
    title: "9. Not a review — greeting (router returns notReview)",
    input: "Hello, how are you?"
  },
  {
    title: "10. Not a review — unrelated question (router returns notReview)",
    input: "What is the weather in Tel Aviv?"
  },
  {
    title: "11. Hebrew slang — pizza show, late delivery (assignment Hebrew case)",
    input: "הפיצה הייתה הצגה, אבל השליח דפק איחור והכל כבר התקרר."
  },
  {
    title: "12. Hebrew sarcasm — forty-minute wait",
    input: "איזה כיף, שוב חיכינו ארבעים דקות למנה."
  }
];

const logLines: string[] = [];

function log(line: string): void {
  console.log(line);
  logLines.push(line);
}

async function runReviewScenarios(): Promise<void> {
  log("");
  log("Review Analysis Scenarios");
  log("=========================");

  for (const scenario of scenarios) {
    log("");
    log(`-- ${scenario.title} --`);
    log(`You: ${scenario.input}`);

    const traceLines: string[] = [];
    const trace = { log: (line: string) => traceLines.push(line) };

    const result = await runTurn(scenario.input, { trace });
    const tag =
      result.finalAgentName +
      (result.routerDecision
        ? ` <- intent=${result.routerDecision.intent} (conf=${result.routerDecision.confidence.toFixed(2)})`
        : "");
    log(`Bot [${tag}]:\n${result.answer}`);

    if (result.routerDecision) {
      log(`    structured-output = ${JSON.stringify(result.routerDecision)}`);
    }
    for (const line of traceLines) {
      log(`    ${line}`);
    }
  }
}

async function runSelfCorrectionDemo(): Promise<void> {
  log("");
  log("Self-Correction Demonstration (synthetic inconsistent JSON)");
  log("==========================================================");

  const reviewText =
    "Listen, I've never had a burger like this, just wow! But the price? A total rip-off.";

  const inconsistentAnalysis: ReviewAnalysis = {
    summary: "Excellent burger experience overall.",
    overall_sentiment: "Positive",
    score: 2,
    aspects: [
      {
        topic: "Food",
        sentiment: "Positive",
        detail: "I've never had a burger like this, just wow"
      },
      {
        topic: "Price",
        sentiment: "Negative",
        detail: "But the price? A total rip-off"
      }
    ]
  };

  log("");
  log("-- 13. Artificial inconsistency: Positive sentiment + score 2 --");
  log(`Review: ${reviewText}`);
  log(`Injected JSON: ${JSON.stringify(inconsistentAnalysis)}`);

  const validation = validateReviewAnalysis(inconsistentAnalysis);
  log(`Validation issues: ${validation.issues.join(" | ")}`);

  const traceLines: string[] = [];
  const trace = { log: (line: string) => traceLines.push(line) };

  const corrected = normalizeReviewAnalysis(
    reviewText,
    await selfCorrectReview(
      reviewText,
      inconsistentAnalysis,
      validation.issues,
      trace
    )
  );

  log("");
  log("Corrected output:");
  log(formatReviewAnalysis(corrected));
  log(`Corrected JSON: ${JSON.stringify(corrected)}`);
  for (const line of traceLines) {
    log(`    ${line}`);
  }
}

async function main(): Promise<void> {
  log("Review Analyzer Agent (Homework #3) - Execution Log");
  log(`Generated: ${new Date().toISOString()}`);

  await runReviewScenarios();
  await runSelfCorrectionDemo();

  await mkdir("logs", { recursive: true });
  await writeFile("logs/execution-log.txt", logLines.join("\n") + "\n", {
    encoding: "utf-8"
  });
  log("");
  log("Execution log saved to logs/execution-log.txt");
}

await main();
