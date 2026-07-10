import * as FileSystem from "expo-file-system/legacy";

const AUTH_PATH = `${FileSystem.documentDirectory}guitar-trainer-auth.json`;
const listeners = new Set<(token: string | null) => void>();

function notify(token: string | null) {
  listeners.forEach((listener) => listener(token));
}

export function subscribeToAuth(listener: (token: string | null) => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function getAuthToken() {
  try {
    const info = await FileSystem.getInfoAsync(AUTH_PATH);
    if (!info.exists) return null;
    const value = JSON.parse(await FileSystem.readAsStringAsync(AUTH_PATH));
    return typeof value?.token === "string" ? value.token : null;
  } catch {
    return null;
  }
}

export async function saveAuthToken(token: string) {
  await FileSystem.writeAsStringAsync(AUTH_PATH, JSON.stringify({ token }));
  notify(token);
}

export async function clearAuthToken() {
  const info = await FileSystem.getInfoAsync(AUTH_PATH);
  if (info.exists) await FileSystem.deleteAsync(AUTH_PATH, { idempotent: true });
  notify(null);
}
