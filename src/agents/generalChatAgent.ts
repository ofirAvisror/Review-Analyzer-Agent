import { Agent } from "@openai/agents";

import { generalChatOutputGuardrails } from "../guardrails/output";
import { GENERAL_CHAT_AGENT_PROMPT } from "../prompts";

export const generalChatAgent = new Agent({
  name: "General Chat Agent",
  handoffDescription:
    "Cynical but helpful research assistant for general conversation, " +
    "explanations, and persona-driven small talk. Does not have tools.",
  instructions: GENERAL_CHAT_AGENT_PROMPT,
  model: "gpt-4.1-mini",
  outputGuardrails: generalChatOutputGuardrails
});
