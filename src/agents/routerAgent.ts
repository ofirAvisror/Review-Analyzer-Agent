import { Agent } from "@openai/agents";
import { z } from "zod";

import { ROUTER_AGENT_PROMPT } from "../prompts";

export const RouterIntentSchema = z.enum(["analyzeReview", "notReview"]);

export const RouterParametersSchema = z.object({
  reviewText: z.string().nullable()
});

export const RouterDecisionSchema = z.object({
  intent: RouterIntentSchema,
  parameters: RouterParametersSchema,
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("Self-reported confidence between 0 and 1.")
});

export type RouterDecisionParsed = z.infer<typeof RouterDecisionSchema>;

/** Assignment Part A — supported intents (analyzeReview + notReview). */
export const SUPPORTED_ROUTER_INTENTS = RouterIntentSchema.options;

export const routerAgent = new Agent({
  name: "Router Agent",
  handoffDescription:
    "Classifies whether user input is a review to analyze and extracts reviewText.",
  instructions: ROUTER_AGENT_PROMPT,
  model: "gpt-4.1-mini",
  outputType: RouterDecisionSchema
});
