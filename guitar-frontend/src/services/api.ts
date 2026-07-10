import Constants from "expo-constants";
import { getAuthToken } from "./auth";

const configuredBaseUrl =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  Constants.expoConfig?.extra?.apiBaseUrl;

const metroHost = Constants.expoConfig?.hostUri?.split(":")[0];

export const API_BASE_URL =
  configuredBaseUrl ||
  (metroHost ? `http://${metroHost}:8080` : "http://127.0.0.1:8080");

export const SERVER_ERROR = "Server Error!";

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getAuthToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  if (!response.ok) throw new Error(SERVER_ERROR);

  const body = await response.text();
  return (body ? JSON.parse(body) : undefined) as T;
}

export async function apiGet<T>(path: string): Promise<T> {
  return request<T>(path);
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function qualityToPath(quality: "Maj" | "Min") {
  return quality === "Maj" ? "major" : "minor";
}

export function qualityToChordSuffix(quality: "Maj" | "Min") {
  return quality === "Maj" ? "major" : "minor";
}
