import { Agent, OutputGuardrail, run } from "@openai/agents";
import { z } from "zod";

import { OUTPUT_SAFETY_GUARDRAIL_AGENT_PROMPT } from "../prompts";

const MAX_REPLY_LENGTH = 1500;

export const formatOutputGuardrail: OutputGuardrail = {
  name: "Format output guardrail",
  async execute({ agentOutput }) {
    const text = stringifyAgentOutput(agentOutput);
    const trimmed = text.trim();

    const isEmpty = trimmed.length === 0;
    const isTooLong = trimmed.length > MAX_REPLY_LENGTH;

    return {
      outputInfo: {
        length: trimmed.length,
        reason: isEmpty
          ? "empty reply"
          : isTooLong
            ? `reply exceeded ${MAX_REPLY_LENGTH} chars`
            : "ok"
      },
      tripwireTriggered: isEmpty || isTooLong
    };
  }
};

const OutputSafetyDecisionSchema = z.object({
  isUnsafe: z.boolean(),
  reason: z.string()
});

const outputSafetyAgent = new Agent({
  name: "Output Safety Reviewer",
  instructions: OUTPUT_SAFETY_GUARDRAIL_AGENT_PROMPT,
  model: "gpt-4.1-mini",
  outputType: OutputSafetyDecisionSchema
});

export const safetyOutputGuardrail: OutputGuardrail = {
  name: "Safety output guardrail",
  async execute({ agentOutput, context }) {
    const text = stringifyAgentOutput(agentOutput).trim();
    if (text.length === 0) {
      return {
        outputInfo: { reason: "empty reply skipped" },
        tripwireTriggered: false
      };
    }

    if (text.toLowerCase().includes("safety protocols")) {
      return {
        outputInfo: { reason: "agent already issued safety refusal" },
        tripwireTriggered: false
      };
    }

    const result = await run(outputSafetyAgent, text, { context });
    const decision = result.finalOutput;

    return {
      outputInfo: decision ?? { isUnsafe: false, reason: "no decision" },
      tripwireTriggered: decision?.isUnsafe === true
    };
  }
};

export const generalChatOutputGuardrails: OutputGuardrail[] = [
  formatOutputGuardrail,
  safetyOutputGuardrail
];

function stringifyAgentOutput(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    if (Array.isArray(value)) {
      return value.map((v) => stringifyAgentOutput(v)).join(" ");
    }
    const v = value as { reply?: unknown; text?: unknown };
    if (typeof v.reply === "string") return v.reply;
    if (typeof v.text === "string") return v.text;
    return JSON.stringify(value);
  }
  return String(value);
}
