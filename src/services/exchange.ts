const FRANKFURTER_LATEST_URL = "https://api.frankfurter.app/latest";

const currencyNamesToCode: Record<string, string> = {
  dollar: "USD",
  "us dollar": "USD",
  euro: "EUR",
  pound: "GBP",
  "british pound": "GBP",
  shekel: "ILS",
  ils: "ILS",
  nis: "ILS"
};

export interface ExchangeSnapshot {
  fromCurrencyCode: string;
  toCurrencyCode: string;
  rate: number;
}

function normalizeCurrency(value?: string): string {
  const raw = value?.trim() ?? "";
  const normalized = raw.toUpperCase();
  if (!normalized) return "";
  if (/^[A-Z]{3}$/.test(normalized)) return normalized;
  return currencyNamesToCode[raw.toLowerCase()] ?? normalized;
}

function formatRate(rate: number): string {
  return rate.toFixed(4).replace(/\.?0+$/, "");
}

export async function getExchangeRateSnapshot(
  fromCurrencyCode: string,
  toCurrencyCode?: string
): Promise<ExchangeSnapshot> {
  const from = normalizeCurrency(fromCurrencyCode);
  const to = normalizeCurrency(toCurrencyCode) || "ILS";

  if (!from) {
    throw new Error("No valid currency code was provided.");
  }

  if (from === to) {
    return {
      fromCurrencyCode: from,
      toCurrencyCode: to,
      rate: 1
    };
  }

  const url =
    `${FRANKFURTER_LATEST_URL}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch data from external exchange-rate service.");
  }

  const payload = (await response.json()) as {
    rates?: Record<string, number>;
    amount?: number;
    base?: string;
    date?: string;
  };

  const rate = payload.rates?.[to];
  if (typeof rate !== "number" || Number.isNaN(rate)) {
    throw new Error(`No exchange rate available for ${from} -> ${to}.`);
  }

  return {
    fromCurrencyCode: from,
    toCurrencyCode: to,
    rate
  };
}

export async function getExchangeRate(
  fromCurrencyCode: string,
  toCurrencyCode?: string
): Promise<string> {
  try {
    const snapshot = await getExchangeRateSnapshot(fromCurrencyCode, toCurrencyCode);
    return `Exchange rate from ${snapshot.fromCurrencyCode} to ${snapshot.toCurrencyCode}: ${formatRate(snapshot.rate)}.`;
  } catch (error) {
    if (error instanceof Error) {
      return error.message;
    }
    return "Unexpected error while fetching exchange rate.";
  }
}
