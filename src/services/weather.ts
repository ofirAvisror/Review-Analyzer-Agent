interface GeoResult {
  latitude: number;
  longitude: number;
  name: string;
  country?: string;
}

export interface WeatherSnapshot {
  city: string;
  temperatureC: number;
  description: string;
}

function weatherCodeToText(code: number): string {
  const map: Record<number, string> = {
    0: "clear sky",
    1: "mostly clear",
    2: "partly cloudy",
    3: "overcast",
    45: "fog",
    48: "rime fog",
    51: "light drizzle",
    53: "moderate drizzle",
    55: "dense drizzle",
    56: "light freezing drizzle",
    57: "dense freezing drizzle",
    61: "light rain",
    63: "moderate rain",
    65: "heavy rain",
    66: "light freezing rain",
    67: "heavy freezing rain",
    71: "light snow",
    73: "moderate snow",
    75: "heavy snow",
    77: "snow grains",
    80: "light rain showers",
    81: "moderate rain showers",
    82: "violent rain showers",
    85: "light snow showers",
    86: "heavy snow showers",
    95: "thunderstorm",
    96: "thunderstorm with light hail",
    99: "thunderstorm with heavy hail"
  };
  return map[code] ?? "unknown weather";
}

async function geocodeCity(city: string): Promise<GeoResult | null> {
  const url =
    "https://geocoding-api.open-meteo.com/v1/search?count=1&language=en&name=" +
    encodeURIComponent(city);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Weather geocoding request failed");
  }

  const json = (await response.json()) as {
    results?: Array<{
      latitude: number;
      longitude: number;
      name: string;
      country?: string;
    }>;
  };

  if (!json.results || json.results.length === 0) {
    return null;
  }
  return json.results[0];
}

export async function getWeatherSnapshot(city: string): Promise<WeatherSnapshot> {
  if (!city?.trim()) {
    throw new Error("No valid city was provided for weather lookup.");
  }

  const geo = await geocodeCity(city.trim());
  if (!geo) {
    throw new Error(`Could not find city "${city}".`);
  }

  const weatherUrl =
    "https://api.open-meteo.com/v1/forecast?current=temperature_2m,weather_code&timezone=auto&latitude=" +
    encodeURIComponent(String(geo.latitude)) +
    "&longitude=" +
    encodeURIComponent(String(geo.longitude));

  const weatherResponse = await fetch(weatherUrl);
  if (!weatherResponse.ok) {
    throw new Error("Weather forecast request failed");
  }

  const weatherJson = (await weatherResponse.json()) as {
    current?: {
      temperature_2m: number;
      weather_code: number;
    };
  };

  const current = weatherJson.current;
  if (!current) {
    throw new Error("Could not fetch current weather data right now.");
  }

  const description = weatherCodeToText(current.weather_code);
  return {
    city: geo.name,
    temperatureC: current.temperature_2m,
    description
  };
}

export async function getWeather(city: string): Promise<string> {
  try {
    const snapshot = await getWeatherSnapshot(city);
    return `${snapshot.city}: ${snapshot.temperatureC}C, ${snapshot.description}.`;
  } catch (error) {
    if (error instanceof Error) {
      return error.message;
    }
    return "Unexpected error while fetching weather.";
  }
}
