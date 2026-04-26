import { Agent, InputGuardrail, run } from "@openai/agents";
import { z } from "zod";

import { SAFETY_GUARDRAIL_AGENT_PROMPT } from "../prompts";

export const nonEmptyInputGuardrail: InputGuardrail = {
  name: "Non-empty input guardrail",
  async execute({ input }) {
    const text = latestUserText(input);
    const trimmed = text.trim();

    const isEmpty = trimmed.length === 0;
    const isTooLong = trimmed.length > 4000;

    return {
      outputInfo: {
        length: trimmed.length,
        reason: isEmpty
          ? "empty input"
          : isTooLong
            ? "input too long"
            : "ok"
      },
      tripwireTriggered: isEmpty || isTooLong
    };
  }
};

const SafetyDecisionSchema = z.object({
  isUnsafe: z.boolean(),
  isOffTopic: z.boolean(),
  reason: z.string()
});

const safetyAgent = new Agent({
  name: "Safety Input Classifier",
  instructions: SAFETY_GUARDRAIL_AGENT_PROMPT,
  model: "gpt-4.1-mini",
  outputType: SafetyDecisionSchema
});

export const safetyInputGuardrail: InputGuardrail = {
  name: "Safety input guardrail",
  async execute({ input, context }) {
    const text = latestUserText(input);
    if (text.trim().length === 0) {
      return {
        outputInfo: { reason: "empty - skipped safety check" },
        tripwireTriggered: false
      };
    }

    const result = await run(safetyAgent, text, { context });
    const decision = result.finalOutput;

    const trigger =
      decision?.isUnsafe === true || decision?.isOffTopic === true;

    return {
      outputInfo: decision ?? {
        isUnsafe: false,
        isOffTopic: false,
        reason: "no decision"
      },
      tripwireTriggered: trigger
    };
  }
};

export const inputGuardrails: InputGuardrail[] = [
  nonEmptyInputGuardrail,
  safetyInputGuardrail
];

function latestUserText(input: unknown): string {
  if (typeof input === "string") return input;
  if (!Array.isArray(input)) return "";

  for (let i = input.length - 1; i >= 0; i--) {
    const item = input[i] as { role?: unknown; content?: unknown };
    if (!item || typeof item !== "object") continue;
    if (item.role && item.role !== "user") continue;
    const text = readContent(item.content);
    if (text.length > 0 || item.role === "user") return text;
  }
  return "";
}

function readContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((c) => {
      if (typeof c === "string") return c;
      if (c && typeof c === "object" && "text" in c) {
        return String((c as { text: unknown }).text ?? "");
      }
      return "";
    })
    .join(" ");
}
