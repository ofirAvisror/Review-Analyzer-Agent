import { Agent } from "@openai/agents";

import { inputGuardrails } from "../guardrails/input";
import { TRIAGE_AGENT_PROMPT } from "../prompts";
import { exchangeAgent } from "./exchangeAgent";
import { generalChatAgent } from "./generalChatAgent";
import { mathAgent } from "./mathAgent";
import { weatherAgent } from "./weatherAgent";

export const triageAgent = Agent.create({
  name: "Triage Agent",
  handoffDescription:
    "Top-level dispatcher. Hands off the conversation to the correct specialist agent.",
  instructions: TRIAGE_AGENT_PROMPT,
  model: "gpt-4.1-mini",
  modelSettings: { toolChoice: "required" },
  handoffs: [weatherAgent, mathAgent, exchangeAgent, generalChatAgent],
  inputGuardrails
});
