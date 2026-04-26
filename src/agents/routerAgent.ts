import { Agent } from "@openai/agents";
import { z } from "zod";

import { ROUTER_AGENT_PROMPT } from "../prompts";

export const RouterIntentSchema = z.enum([
  "getWeather",
  "calculateMath",
  "getExchangeRate",
  "generalChat"
]);

export const RouterParametersSchema = z.object({
  city: z.string().nullable(),
  fromCurrencyCode: z.string().nullable(),
  toCurrencyCode: z.string().nullable(),
  amount: z.number().nullable(),
  expression: z.string().nullable(),
  problem: z.string().nullable(),
  topic: z.string().nullable()
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

export const routerAgent = new Agent({
  name: "Router Agent",
  handoffDescription:
    "Classifies the user's intent and produces structured routing data. " +
    "Does not answer the user.",
  instructions: ROUTER_AGENT_PROMPT,
  model: "gpt-4.1-mini",
  outputType: RouterDecisionSchema
});
