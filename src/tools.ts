import { tool } from "@openai/agents";
import { z } from "zod";

import { getExchangeRateSnapshot } from "./services/exchange";
import { calculateMathValue } from "./services/math";
import { getWeatherSnapshot } from "./services/weather";

export const getWeatherTool = tool({
  name: "get_weather",
  description:
    "Fetch current weather for a given city using the Open-Meteo API. " +
    "Returns the resolved city name, temperature in Celsius, and a short condition word.",
  parameters: z.object({
    city: z
      .string()
      .min(1)
      .describe("Name of the city, e.g. 'Tel Aviv', 'London', 'Berlin'.")
  }),
  async execute({ city }) {
    try {
      const snapshot = await getWeatherSnapshot(city);
      return JSON.stringify({
        ok: true,
        city: snapshot.city,
        temperatureC: snapshot.temperatureC,
        condition: snapshot.description
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown weather lookup error.";
      return JSON.stringify({ ok: false, error: message });
    }
  }
});

export const calculateMathTool = tool({
  name: "calculate_math",
  description:
    "Evaluate a clean mathematical expression (e.g. '5 - 2 + 10' or '(12*7)/3'). " +
    "Only digits, parentheses and the operators + - * / ^ % are accepted. " +
    "The LLM is required to send a formal expression, not natural language.",
  parameters: z.object({
    expression: z
      .string()
      .min(1)
      .describe(
        "A formal math expression made of digits, operators (+,-,*,/,^,%) and parentheses."
      )
  }),
  async execute({ expression }) {
    try {
      const result = calculateMathValue(expression);
      return JSON.stringify({ ok: true, expression, result });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown math evaluation error.";
      return JSON.stringify({ ok: false, expression, error: message });
    }
  }
});

export const getExchangeRateTool = tool({
  name: "get_exchange_rate",
  description:
    "Fetch the current exchange rate between two ISO-4217 currency codes " +
    "using the Frankfurter public API. Defaults the destination currency to ILS.",
  parameters: z.object({
    fromCurrencyCode: z
      .string()
      .min(3)
      .max(3)
      .describe("3-letter source currency code, e.g. USD."),
    toCurrencyCode: z
      .string()
      .min(3)
      .max(3)
      .nullable()
      .describe(
        "3-letter destination currency code, e.g. ILS. Pass null to default to ILS."
      )
  }),
  async execute({ fromCurrencyCode, toCurrencyCode }) {
    try {
      const snapshot = await getExchangeRateSnapshot(
        fromCurrencyCode,
        toCurrencyCode ?? undefined
      );
      return JSON.stringify({
        ok: true,
        fromCurrencyCode: snapshot.fromCurrencyCode,
        toCurrencyCode: snapshot.toCurrencyCode,
        rate: snapshot.rate
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown exchange-rate lookup error.";
      return JSON.stringify({ ok: false, error: message });
    }
  }
});
