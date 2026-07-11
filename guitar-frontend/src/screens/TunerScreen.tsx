import { useAudioRecorder } from "@siteed/audio-studio";
import { Stack, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";

import {
  STANDARD_GUITAR_STRINGS,
  centsFromTarget,
  detectPitch,
} from "../utils/pitchDetection";

export default function TunerScreen() {
  const router = useRouter();
  const { startRecording, stopRecording } = useAudioRecorder();
  const [targetId, setTargetId] = useState("6");
  const [frequency, setFrequency] = useState<number | null>(null);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const mountedRef = useRef(true);
  const pitchHistoryRef = useRef<number[]>([]);
  const target = STANDARD_GUITAR_STRINGS.find((item) => item.id === targetId)!;
  const cents = frequency ? centsFromTarget(frequency, target.frequency) : null;
  const clampedCents = Math.max(-50, Math.min(50, cents || 0));
  const inTune = cents !== null && Math.abs(cents) <= 5;

  const stopListening = useCallback(async () => {
    try {
      await stopRecording();
    } catch {}
    if (mountedRef.current) setListening(false);
  }, [stopRecording]);

  const startListening = useCallback(async () => {
    setError("");
    try {
      await startRecording({
        sampleRate: 16000,
        channels: 1,
        encoding: "pcm_16bit",
        interval: 180,
        bufferDurationSeconds: 0.2,
        streamFormat: "float32",
        output: { primary: { enabled: false } },
        keepFullAnalysis: false,
        keepAwake: false,
        showNotification: false,
        android: { audioFocusStrategy: "interactive" },
        onAudioStream: async (event) => {
          if (event.data instanceof Float32Array) {
            const detected = detectPitch(event.data, 16000, target.frequency);
            if (detected && mountedRef.current) {
              const history = [...pitchHistoryRef.current, detected].slice(-5);
              pitchHistoryRef.current = history;
              const sorted = [...history].sort((a, b) => a - b);
              setFrequency(sorted[Math.floor(sorted.length / 2)]);
            }
          }
        },
      });
      if (mountedRef.current) setListening(true);
    } catch {
      if (mountedRef.current) setError("Microphone access is required to use the tuner.");
    }
  }, [startRecording, target.frequency]);

  useEffect(() => {
    mountedRef.current = true;
    startListening();
    return () => {
      mountedRef.current = false;
      stopRecording().catch(() => {});
    };
  }, [startListening, stopRecording]);

  const guidance =
    cents === null
      ? "Pluck the selected string"
      : inTune
        ? "In tune"
        : cents < 0
          ? "Tune up"
          : "Tune down";

  return (
    <View style={{ flex: 1, backgroundColor: "#121212", padding: 20 }}>
      <Stack.Screen options={{ title: "Guitar Tuner" }} />
      <Text style={{ color: "white", fontSize: 30, fontWeight: "bold", marginTop: 50 }}>Guitar Tuner</Text>
      <Text style={{ color: "#9CA3AF", fontSize: 16, marginTop: 8 }}>Standard tuning: E A D G B E</Text>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 28 }}>
        {STANDARD_GUITAR_STRINGS.map((string) => (
          <TouchableOpacity
            key={string.id}
            onPress={() => {
              setTargetId(string.id);
              setFrequency(null);
              pitchHistoryRef.current = [];
            }}
            style={{ width: "30%", flexGrow: 1, backgroundColor: string.id === targetId ? "#3B82F6" : "#1F2937", paddingVertical: 14, borderRadius: 8, alignItems: "center" }}
          >
            <Text style={{ color: "white", fontSize: 20, fontWeight: "bold" }}>{string.note}</Text>
            <Text style={{ color: string.id === targetId ? "white" : "#9CA3AF", marginTop: 2 }}>{string.label} string</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ marginTop: 38, alignItems: "center" }}>
        <Text style={{ color: inTune ? "#22C55E" : "white", fontSize: 72, fontWeight: "bold" }}>{target.note}</Text>
        <Text style={{ color: "#9CA3AF", fontSize: 18 }}>{frequency ? `${frequency.toFixed(1)} Hz` : `${target.frequency.toFixed(2)} Hz target`}</Text>
        <Text style={{ color: inTune ? "#22C55E" : "#F59E0B", fontSize: 24, fontWeight: "bold", marginTop: 14 }}>{guidance}</Text>
      </View>

      <View style={{ marginTop: 38 }}>
        <View style={{ height: 12, borderRadius: 6, backgroundColor: "#374151", position: "relative" }}>
          <View style={{ position: "absolute", left: "49.5%", width: 3, top: -8, bottom: -8, backgroundColor: "#22C55E" }} />
          <View style={{ position: "absolute", left: `${((clampedCents + 50) / 100) * 96}%`, top: -10, width: 14, height: 32, marginLeft: -7, borderRadius: 7, backgroundColor: inTune ? "#22C55E" : "#F59E0B" }} />
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 14 }}>
          <Text style={{ color: "#9CA3AF" }}>Flat -50</Text>
          <Text style={{ color: "#9CA3AF" }}>{cents === null ? "0 cents" : `${cents > 0 ? "+" : ""}${cents.toFixed(1)} cents`}</Text>
          <Text style={{ color: "#9CA3AF" }}>Sharp +50</Text>
        </View>
      </View>

      {!!error && <Text style={{ color: "#EF4444", textAlign: "center", marginTop: 24 }}>{error}</Text>}
      <TouchableOpacity onPress={listening ? stopListening : startListening} style={{ backgroundColor: listening ? "#374151" : "#3B82F6", padding: 16, borderRadius: 8, marginTop: 32 }}>
        <Text style={{ color: "white", textAlign: "center", fontWeight: "bold", fontSize: 17 }}>{listening ? "Stop Listening" : "Start Listening"}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.back()} style={{ padding: 16, marginTop: 8 }}>
        <Text style={{ color: "white", textAlign: "center", fontSize: 17 }}>Close</Text>
      </TouchableOpacity>
    </View>
  );
}
