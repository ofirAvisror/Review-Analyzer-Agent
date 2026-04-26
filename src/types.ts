export type Role = "system" | "user" | "assistant";

export interface Message {
  role: Role;
  content: string;
}

export type RouterIntent =
  | "getWeather"
  | "calculateMath"
  | "getExchangeRate"
  | "generalChat";

export interface RouterParameters {
  city?: string | null;
  fromCurrencyCode?: string | null;
  toCurrencyCode?: string | null;
  amount?: number | null;
  expression?: string | null;
  problem?: string | null;
  topic?: string | null;
}

export interface RouterDecision {
  intent: RouterIntent;
  parameters: RouterParameters;
  confidence: number;
}

export interface TurnResult {
  answer: string;
  routerDecision: RouterDecision | null;
  finalAgentName: string;
  blocked: boolean;
}
