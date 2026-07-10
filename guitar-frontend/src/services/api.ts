import Constants from "expo-constants";

const configuredBaseUrl =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  Constants.expoConfig?.extra?.apiBaseUrl;

export const API_BASE_URL =
  configuredBaseUrl || "http://127.0.0.1:8080";

export const SERVER_ERROR = "Server Error!";

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(SERVER_ERROR);
  }
  return response.json();
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(SERVER_ERROR);
  }
  return response.json();
}

export function qualityToPath(quality: "Maj" | "Min") {
  return quality === "Maj" ? "major" : "minor";
}

export function qualityToChordSuffix(quality: "Maj" | "Min") {
  return quality === "Maj" ? "major" : "minor";
}
