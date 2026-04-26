import "dotenv/config";

import { runTurn } from "./orchestrator";
import { loadHistory, resetHistory, saveHistory } from "./storage/history";
import type { Message } from "./types";

const helpText = `
Commands:
- /reset  : reset memory and delete history.json
- /exit   : save and exit
`.trim();

const { history: loadedHistory, welcomeBack } = await loadHistory();
const history: Message[] = [...loadedHistory];

if (welcomeBack && history.length > 0) {
  console.log("Welcome back! Loaded your previous chat history.");
} else {
  console.log("Welcome! Starting a new chat session.");
}

console.log(helpText);

while (true) {
  const userInput = prompt("\nYou: ");
  if (!userInput) {
    continue;
  }

  const trimmed = userInput.trim().replace(/^(you)\s*:\s*/iu, "");
  if (!trimmed) continue;

  if (trimmed === "/exit") {
    await saveHistory(history);
    console.log("Goodbye! History was saved.");
    break;
  }

  if (trimmed === "/reset") {
    await resetHistory();
    history.length = 0;
    console.log("Memory reset. Started a clean chat.");
    continue;
  }

  const traceLines: string[] = [];
  const trace = { log: (line: string) => traceLines.push(line) };

  try {
    const result = await runTurn(trimmed, history, { trace });
    const tag = result.blocked
      ? "BLOCKED"
      : `${result.finalAgentName}` +
        (result.routerDecision
          ? ` <- intent=${result.routerDecision.intent} (conf=${result.routerDecision.confidence.toFixed(2)})`
          : "");
    console.log(`Bot [${tag}]: ${result.answer}`);

    if (traceLines.length > 0) {
      for (const line of traceLines) {
        console.log(`    ${line}`);
      }
    }

    history.push({ role: "user", content: trimmed });
    history.push({ role: "assistant", content: result.answer });
    await saveHistory(history);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error.";
    console.log(`Bot [ERROR]: ${message}`);
    if (traceLines.length > 0) {
      for (const line of traceLines) {
        console.log(`    ${line}`);
      }
    }
  }
}
