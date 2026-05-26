import "dotenv/config";

import { runTurn } from "./orchestrator";

console.log("Review Analyzer Agent (Homework #3)");
console.log("Paste a review in Hebrew or English. Type /exit to quit.\n");

while (true) {
  const userInput = prompt("\nYou: ");
  if (!userInput) {
    continue;
  }

  const trimmed = userInput.trim().replace(/^(you)\s*:\s*/iu, "");
  if (!trimmed) continue;

  if (trimmed === "/exit") {
    console.log("Goodbye!");
    break;
  }

  const traceLines: string[] = [];
  const trace = { log: (line: string) => traceLines.push(line) };

  try {
    const result = await runTurn(trimmed, { trace });
    const tag = result.blocked
      ? "BLOCKED"
      : `${result.finalAgentName}` +
        (result.routerDecision
          ? ` <- intent=${result.routerDecision.intent} (conf=${result.routerDecision.confidence.toFixed(2)})`
          : "");
    console.log(`Bot [${tag}]:\n${result.answer}`);

    if (traceLines.length > 0) {
      for (const line of traceLines) {
        console.log(`    ${line}`);
      }
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error.";
    console.log(`Bot [ERROR]: ${message}`);
    for (const line of traceLines) {
      console.log(`    ${line}`);
    }
  }
}
