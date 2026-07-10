import {
  AudioDataEvent,
  useAudioRecorder,
} from "@siteed/audio-studio";
import { Ionicons } from "@expo/vector-icons";
import {
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from "expo-audio";
import { Stack } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  GuitarStringTarget,
  PitchReading,
  STANDARD_TUNING,
  centsBetween,
  detectPitch,
  median,
  nearestGuitarString,
} from "../utils/pitchDetection";

const SAMPLE_RATE = 16000;
const IN_TUNE_CENTS = 5;

export default function TunerScreen() {
  const { startRecording, stopRecording } = useAudioRecorder();
  const mountedRef = useRef(false);
  const listeningRef = useRef(false);
  const startingRef = useRef(false);
  const frequencyHistoryRef = useRef<number[]>([]);
  const lastSignalAtRef = useRef(0);

  const [selectedString, setSelectedString] =
    useState<GuitarStringTarget | null>(null);
  const [reading, setReading] = useState<PitchReading | null>(null);
  const [state, setState] = useState<
    "starting" | "listening" | "stopped" | "denied" | "error"
  >("starting");

  const processAudio = useCallback(async (event: AudioDataEvent) => {
    if (!(event.data instanceof Float32Array)) {
      return;
    }

    const detected = detectPitch(event.data, SAMPLE_RATE);
    const now = Date.now();
    if (!detected || detected.clarity < 0.68) {
      if (now - lastSignalAtRef.current > 650) {
        frequencyHistoryRef.current = [];
        if (mountedRef.current) {
          setReading(null);
        }
      }
      return;
    }

    lastSignalAtRef.current = now;
    const history = [...frequencyHistoryRef.current, detected.frequency].slice(-5);
    frequencyHistoryRef.current = history;
    if (mountedRef.current) {
      setReading({ ...detected, frequency: median(history) });
    }
  }, []);

  const beginListening = useCallback(async () => {
    if (listeningRef.current || startingRef.current) {
      return;
    }

    startingRef.current = true;
    if (mountedRef.current) {
      setState("starting");
    }
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        if (mountedRef.current) {
          setState("denied");
        }
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
        shouldPlayInBackground: false,
        shouldRouteThroughEarpiece: false,
      });
      await startRecording({
        sampleRate: SAMPLE_RATE,
        channels: 1,
        encoding: "pcm_32bit",
        streamFormat: "float32",
        interval: 120,
        bufferDurationSeconds: 0.12,
        keepAwake: false,
        showNotification: false,
        output: { primary: { enabled: false } },
        android: { audioFocusStrategy: "interactive" },
        ios: {
          audioSession: {
            category: "Record",
            mode: "Measurement",
          },
        },
        onAudioStream: processAudio,
      });

      if (!mountedRef.current) {
        await stopRecording();
        return;
      }
      listeningRef.current = true;
      setState("listening");
    } catch {
      if (mountedRef.current) {
        setState("error");
      }
    } finally {
      startingRef.current = false;
    }
  }, [processAudio, startRecording, stopRecording]);

  const endListening = useCallback(async () => {
    if (!listeningRef.current) {
      return;
    }
    listeningRef.current = false;
    frequencyHistoryRef.current = [];
    setReading(null);
    if (mountedRef.current) {
      setState("stopped");
    }
    try {
      await stopRecording();
      await setAudioModeAsync({ allowsRecording: false });
    } catch {
      if (mountedRef.current) {
        setState("error");
      }
    }
  }, [stopRecording]);

  useEffect(() => {
    mountedRef.current = true;
    void beginListening();

    return () => {
      mountedRef.current = false;
      if (listeningRef.current) {
        listeningRef.current = false;
        void stopRecording();
        void setAudioModeAsync({ allowsRecording: false });
      }
    };
  }, [beginListening, stopRecording]);

  const target = useMemo(
    () => selectedString || (reading ? nearestGuitarString(reading.frequency) : null),
    [reading, selectedString],
  );
  const cents = reading && target
    ? centsBetween(reading.frequency, target.frequency)
    : 0;
  const clampedCents = Math.max(-50, Math.min(50, cents));
  const inTune = Boolean(reading && target && Math.abs(cents) <= IN_TUNE_CENTS);
  const statusText = state === "starting"
    ? "Starting microphone..."
    : state === "denied"
    ? "Microphone access is required"
    : state === "error"
      ? "Microphone unavailable"
      : state === "stopped"
        ? "Listening paused"
        : !reading
          ? "Play a single string"
          : inTune
            ? "In tune"
            : cents < 0
              ? "Tune up"
              : "Tune down";
  const accentColor = inTune ? "#22C55E" : "#3B82F6";

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#121212" }}
      contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
    >
      <Stack.Screen options={{ title: "Guitar Tuner" }} />

      <Text
        style={{
          color: "white",
          fontSize: 30,
          fontWeight: "bold",
          marginTop: 30,
        }}
      >
        Guitar Tuner
      </Text>

      <View
        style={{
          marginTop: 24,
          backgroundColor: "#1F2937",
          borderRadius: 8,
          padding: 22,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "#9CA3AF", fontSize: 15 }}>
          {selectedString ? `String ${selectedString.stringNumber}` : "Auto"}
        </Text>

        <Text
          style={{
            color: accentColor,
            fontSize: 76,
            fontWeight: "bold",
            marginTop: 6,
          }}
        >
          {target?.note || "-"}
          <Text style={{ fontSize: 30 }}>{target?.octave || ""}</Text>
        </Text>

        <Text style={{ color: "white", fontSize: 18, marginTop: 4 }}>
          {reading ? `${reading.frequency.toFixed(1)} Hz` : "--.- Hz"}
        </Text>

        <View style={{ width: "100%", marginTop: 28 }}>
          <View
            style={{
              height: 8,
              backgroundColor: "#374151",
              borderRadius: 4,
              position: "relative",
            }}
          >
            <View
              style={{
                position: "absolute",
                left: "50%",
                top: -7,
                width: 2,
                height: 22,
                backgroundColor: "#9CA3AF",
              }}
            />
            {reading ? (
              <View
                style={{
                  position: "absolute",
                  left: `${50 + clampedCents}%`,
                  top: -10,
                  width: 5,
                  height: 28,
                  borderRadius: 3,
                  backgroundColor: accentColor,
                  transform: [{ translateX: -2.5 }],
                }}
              />
            ) : null}
          </View>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginTop: 10,
            }}
          >
            <Text style={{ color: "#9CA3AF" }}>-50</Text>
            <Text style={{ color: "#9CA3AF" }}>0 cents</Text>
            <Text style={{ color: "#9CA3AF" }}>+50</Text>
          </View>
        </View>

        <Text
          style={{
            color: inTune ? "#22C55E" : "white",
            fontSize: 22,
            fontWeight: "bold",
            marginTop: 24,
          }}
        >
          {statusText}
        </Text>
        {reading && target ? (
          <Text style={{ color: "#9CA3AF", fontSize: 16, marginTop: 8 }}>
            {inTune
              ? `${Math.round(Math.abs(cents))} cents`
              : `${Math.round(Math.abs(cents))} cents ${cents < 0 ? "flat" : "sharp"}`}
          </Text>
        ) : null}

        <View
          style={{
            width: "100%",
            height: 5,
            backgroundColor: "#374151",
            borderRadius: 3,
            marginTop: 24,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              width: `${Math.min(100, (reading?.rms || 0) * 900)}%`,
              height: "100%",
              backgroundColor: "#22C55E",
            }}
          />
        </View>
      </View>

      <Text
        style={{ color: "white", fontSize: 20, fontWeight: "bold", marginTop: 28 }}
      >
        String
      </Text>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 }}>
        <TouchableOpacity
          onPress={() => setSelectedString(null)}
          style={{
            width: "31%",
            backgroundColor: selectedString === null ? "#3B82F6" : "#1F2937",
            paddingVertical: 14,
            borderRadius: 8,
          }}
        >
          <Text style={{ color: "white", textAlign: "center", fontWeight: "bold" }}>
            Auto
          </Text>
        </TouchableOpacity>
        {STANDARD_TUNING.map((guitarString) => (
          <TouchableOpacity
            key={guitarString.stringNumber}
            onPress={() => setSelectedString(guitarString)}
            style={{
              width: "31%",
              backgroundColor:
                selectedString?.stringNumber === guitarString.stringNumber
                  ? "#3B82F6"
                  : "#1F2937",
              paddingVertical: 14,
              borderRadius: 8,
            }}
          >
            <Text style={{ color: "white", textAlign: "center", fontWeight: "bold" }}>
              {`${guitarString.stringNumber}  ${guitarString.note}${guitarString.octave}`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        onPress={() => {
          if (state === "denied") {
            void Linking.openSettings();
          } else if (state === "listening") {
            void endListening();
          } else {
            void beginListening();
          }
        }}
        disabled={state === "starting"}
        style={{
          backgroundColor: state === "listening" ? "#374151" : "#22C55E",
          padding: 16,
          borderRadius: 8,
          marginTop: 28,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        {state === "starting" ? (
          <ActivityIndicator color="white" />
        ) : (
          <Ionicons
            name={
              state === "denied"
                ? "settings-outline"
                : state === "listening"
                  ? "mic-off"
                  : "mic"
            }
            size={20}
            color="white"
          />
        )}
        <Text style={{ color: "white", fontSize: 17, fontWeight: "bold" }}>
          {state === "starting"
            ? "Starting..."
            : state === "denied"
              ? "Open Settings"
            : state === "listening"
              ? "Stop Listening"
              : "Start Listening"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
