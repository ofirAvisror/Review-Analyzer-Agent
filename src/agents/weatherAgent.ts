import { Agent } from "@openai/agents";

import { WEATHER_AGENT_PROMPT } from "../prompts";
import { getWeatherTool } from "../tools";

export const weatherAgent = new Agent({
  name: "Weather Agent",
  handoffDescription:
    "Specialist that handles current-weather questions for any city. " +
    "Always uses the get_weather tool and replies in one short sentence.",
  instructions: WEATHER_AGENT_PROMPT,
  model: "gpt-4.1-mini",
  tools: [getWeatherTool]
});
