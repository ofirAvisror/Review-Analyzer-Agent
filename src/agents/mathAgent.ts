import { Agent } from "@openai/agents";

import { MATH_AGENT_PROMPT } from "../prompts";
import { calculateMathTool } from "../tools";

export const mathAgent = new Agent({
  name: "Math Agent",
  handoffDescription:
    "Specialist for direct math expressions and word problems. " +
    "Always uses the calculate_math tool to compute the result.",
  instructions: MATH_AGENT_PROMPT,
  model: "gpt-4.1-mini",
  tools: [calculateMathTool]
});
