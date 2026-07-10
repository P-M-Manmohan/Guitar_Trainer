import * as FileSystem from "expo-file-system/legacy";

export type PracticeRecording = {
  id: string;
  name: string;
  uri: string;
  audioUri?: string;
  createdAt: string;
  durationSeconds: number;
  durationMs?: number;
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
  tempAudioUri?: string;
  name: string;
  durationSeconds: number;
  source?: string;
}): Promise<PracticeRecording> {
  await ensureDirectory();

  const id = `${Date.now()}`;
  const videoExtension = input.tempUri.split("?")[0].match(/\.[a-z0-9]+$/i)?.[0] || ".mp4";
  const destinationUri = `${RECORDINGS_DIR}${id}${videoExtension}`;
  await FileSystem.copyAsync({
    from: input.tempUri,
    to: destinationUri,
  });

  let audioUri: string | undefined;
  if (input.tempAudioUri) {
    audioUri = `${RECORDINGS_DIR}${id}.wav`;
    await FileSystem.copyAsync({
      from: input.tempAudioUri,
      to: audioUri,
    });
  }

  const recording: PracticeRecording = {
    id,
    name: input.name.trim() || "Practice Session",
    uri: destinationUri,
    audioUri,
    createdAt: new Date().toISOString(),
    durationSeconds: input.durationSeconds,
    source: input.source,
  };

  const existing = await getPracticeRecordings();
  const next = [recording, ...existing];
  await FileSystem.writeAsStringAsync(INDEX_PATH, JSON.stringify(next));
  return recording;
}

export async function deletePracticeRecording(id: string) {
  const existing = await getPracticeRecordings();
  const recording = existing.find((item) => item.id === id);
  if (recording) {
    const info = await FileSystem.getInfoAsync(recording.uri);
    if (info.exists) {
      await FileSystem.deleteAsync(recording.uri, { idempotent: true });
    }
    if (recording.audioUri) {
      const audioInfo = await FileSystem.getInfoAsync(recording.audioUri);
      if (audioInfo.exists) {
        await FileSystem.deleteAsync(recording.audioUri, { idempotent: true });
      }
    }
  }

  const next = existing.filter((item) => item.id !== id);
  await ensureDirectory();
  await FileSystem.writeAsStringAsync(INDEX_PATH, JSON.stringify(next));
  return next;
}

export function getDurationSeconds(recording: PracticeRecording) {
  if (typeof recording.durationSeconds === "number") {
    return recording.durationSeconds;
  }
  return Math.max(0, Math.round((recording.durationMs || 0) / 1000));
}

export function formatDuration(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString();
}
