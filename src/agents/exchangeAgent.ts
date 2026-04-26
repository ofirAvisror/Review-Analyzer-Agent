import { Agent } from "@openai/agents";

import { EXCHANGE_AGENT_PROMPT } from "../prompts";
import { calculateMathTool, getExchangeRateTool } from "../tools";
import { mathAgent } from "./mathAgent";

export const exchangeAgent = Agent.create({
  name: "Exchange Agent",
  handoffDescription:
    "Specialist that fetches live exchange rates and converts amounts " +
    "between currencies using the get_exchange_rate and calculate_math tools.",
  instructions: EXCHANGE_AGENT_PROMPT,
  model: "gpt-4.1-mini",
  tools: [getExchangeRateTool, calculateMathTool],
  handoffs: [mathAgent]
});
