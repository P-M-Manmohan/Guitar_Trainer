import * as FileSystem from "expo-file-system/legacy";

export type PracticeRecording = {
  id: string;
  name: string;
  uri: string;
  createdAt: string;
  durationMs: number;
  source?: string;
};

const RECORDINGS_DIR = `${FileSystem.documentDirectory}practice-recordings/`;
const INDEX_PATH = `${RECORDINGS_DIR}index.json`;

async function ensureDirectory() {
  const info = await FileSystem.getInfoAsync(RECORDINGS_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(RECORDINGS_DIR, {
      intermediates: true,
    });
  }
}

export async function getPracticeRecordings(): Promise<PracticeRecording[]> {
  try {
    await ensureDirectory();
    const info = await FileSystem.getInfoAsync(INDEX_PATH);
    if (!info.exists) {
      return [];
    }
    const raw = await FileSystem.readAsStringAsync(INDEX_PATH);
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function savePracticeRecording(input: {
  tempUri: string;
  name: string;
  durationMs: number;
  source?: string;
}): Promise<PracticeRecording> {
  await ensureDirectory();

  const id = `${Date.now()}`;
  const destinationUri = `${RECORDINGS_DIR}${id}.mov`;
  await FileSystem.copyAsync({
    from: input.tempUri,
    to: destinationUri,
  });

  const recording: PracticeRecording = {
    id,
    name: input.name.trim() || "Practice Session",
    uri: destinationUri,
    createdAt: new Date().toISOString(),
    durationMs: input.durationMs,
    source: input.source,
  };

  const existing = await getPracticeRecordings();
  const next = [recording, ...existing];
  await FileSystem.writeAsStringAsync(INDEX_PATH, JSON.stringify(next));
  return recording;
}

export function formatDuration(totalMs: number) {
  const totalMinutes = Math.floor(totalMs / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  return `${String(days).padStart(2, "0")}:${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString();
}
