import { evaluate } from "mathjs";

function normalizeExpression(input: string): string {
  return input
    .replace(/,/g, "")
    .replace(/divided by/gi, "/")
    .replace(/times/gi, "*")
    .replace(/plus/gi, "+")
    .replace(/minus/gi, "-")
    .replace(/÷/g, "/")
    .replace(/×/g, "*")
    .trim();
}

function isSafeExpression(expression: string): boolean {
  return /^[0-9+\-*/().\s^%]+$/.test(expression);
}

export function calculateMathValue(expression: string): number {
  if (!expression?.trim()) {
    throw new Error("No math expression was provided.");
  }

  const normalized = normalizeExpression(expression);
  if (!isSafeExpression(normalized)) {
    throw new Error("Expression contains invalid characters. Use numbers and math operators only.");
  }

  const result = evaluate(normalized);
  if (typeof result !== "number" || Number.isNaN(result)) {
    throw new Error("Failed to evaluate the expression. Check the math syntax.");
  }
  return result;
}

export function calculateMath(expression: string): string {
  try {
    const result = calculateMathValue(expression);
    return `The result is: ${result}`;
  } catch (error) {
    if (error instanceof Error) {
      return error.message;
    }
    return "Failed to evaluate the expression. Check the math syntax.";
  }
}
