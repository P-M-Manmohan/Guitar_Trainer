import { useAudioRecorder } from "@siteed/audio-studio";
import { useMicrophonePermissions } from "expo-camera";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Camera,
  runAtTargetFps,
  useCameraDevice,
  useCameraFormat,
  useCameraPermission,
  useFrameProcessor,
  type VideoFile,
} from "react-native-vision-camera";
import { useRunOnJS } from "react-native-worklets-core";
import { useResizePlugin } from "vision-camera-resize-plugin";

import MetronomeModal from "../components/MetronomeModal";
import {
  analyzePractice,
  type ExpectedFingering,
  type PracticeAnalysisResponse,
} from "../services/practiceAnalysis";
import { savePracticeRecording } from "../utils/practiceRecordings";

const ML_WIDTH = 216;
const ML_HEIGHT = 384;
const MAX_DURATION_MS = 30 * 60 * 1000;
const FEEDBACK_DURATION_MS = 5000;

function bytesToBase64(bytes: Uint8Array) {
  "worklet";
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let result = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index];
    const second = index + 1 < bytes.length ? bytes[index + 1] : 0;
    const third = index + 2 < bytes.length ? bytes[index + 2] : 0;
    const triplet = (first << 16) | (second << 8) | third;
    result += chars[(triplet >> 18) & 63];
    result += chars[(triplet >> 12) & 63];
    result += index + 1 < bytes.length ? chars[(triplet >> 6) & 63] : "=";
    result += index + 2 < bytes.length ? chars[triplet & 63] : "=";
  }
  return result;
}

function parseExpectedFingerings(value: string | string[] | undefined) {
  if (typeof value !== "string") {
    return [];
  }
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as ExpectedFingering[]) : [];
  } catch {
    return [];
  }
}

function asFileUri(path: string) {
  return path.startsWith("file://") ? path : `file://${path}`;
}

function feedbackTitle(status: string) {
  if (status === "fix_fingering") return "Adjust Finger Placement";
  if (status === "recognized") return "Chord Detected";
  if (status === "check_tuning_or_strum") return "Check Your Sound";
  return "Practice Feedback";
}

export default function PracticeSessionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const source = typeof params.source === "string" ? params.source : "Practice";
  const targetChord = typeof params.targetChord === "string" ? params.targetChord : undefined;
  const fingerInstruction =
    typeof params.fingerInstruction === "string" ? params.fingerInstruction : "";
  const expectedFingerings = useMemo(
    () => parseExpectedFingerings(params.expectedFingerings),
    [params.expectedFingerings]
  );
  const mode = targetChord ? "selected" : "free";
  const sessionIdRef = useRef(`${Date.now()}-${Math.random().toString(36).slice(2)}`);

  const cameraRef = useRef<Camera>(null);
  const startedAtRef = useRef<number | null>(null);
  const startingRef = useRef(false);
  const stoppingRef = useRef(false);
  const recordingRef = useRef(false);
  const requestInFlightRef = useRef(false);
  const latestAudioRef = useRef<string | null>(null);
  const lastFeedbackRef = useRef({ key: "", at: 0 });
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxDurationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const device = useCameraDevice("front");
  const format = useCameraFormat(device, [
    { videoResolution: { width: 1280, height: 720 } },
    { fps: 30 },
  ]);
  const { hasPermission: hasCameraPermission, requestPermission: requestCameraPermission } =
    useCameraPermission();
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();
  const { startRecording: startAudioRecording, stopRecording: stopAudioRecording } =
    useAudioRecorder();
  const { resize } = useResizePlugin();

  const [recording, setRecording] = useState(false);
  const [analysisEnabled, setAnalysisEnabled] = useState(false);
  const [tempUri, setTempUri] = useState<string | null>(null);
  const [tempAudioUri, setTempAudioUri] = useState<string | null>(null);
  const [durationMs, setDurationMs] = useState(0);
  const [recordingName, setRecordingName] = useState("");
  const [saveVisible, setSaveVisible] = useState(false);
  const [metronomeVisible, setMetronomeVisible] = useState(false);
  const [metronomePlaying, setMetronomePlaying] = useState(false);
  const [feedback, setFeedback] = useState<{ title: string; message: string } | null>(null);
  const [cameraError, setCameraError] = useState("");

  const hasPermission = hasCameraPermission && microphonePermission?.granted;

  const showFeedback = useCallback((response: PracticeAnalysisResponse) => {
    if (response.frames_considered < 3 || response.raw_status !== response.stable_status) {
      return;
    }
    const visibleStatuses = new Set([
      "fix_fingering",
      "check_tuning_or_strum",
      "recognized",
    ]);
    if (!visibleStatuses.has(response.status)) {
      return;
    }
    const message = response.instruction || response.summary;
    const key = `${response.target_chord}:${response.status}:${message}`;
    const now = Date.now();
    if (key === lastFeedbackRef.current.key && now - lastFeedbackRef.current.at < 7000) {
      return;
    }
    lastFeedbackRef.current = { key, at: now };
    setFeedback({ title: feedbackTitle(response.status), message });
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => setFeedback(null), FEEDBACK_DURATION_MS);
  }, []);

  const submitFrame = useCallback(
    async (image: string) => {
      if (!analysisEnabled || requestInFlightRef.current) return;
      requestInFlightRef.current = true;
      try {
        const response = await analyzePractice({
          mode,
          session_id: sessionIdRef.current,
          target_chord: targetChord,
          image,
          image_format: "rgb",
          image_width: ML_WIDTH,
          image_height: ML_HEIGHT,
          audio: latestAudioRef.current || undefined,
          audio_format: "pcm_s16le",
          audio_sample_rate: 16000,
          audio_channels: 1,
          expected_fingerings: expectedFingerings.length ? expectedFingerings : undefined,
          neck_bbox: {
            top_left: [0.08, 0.38],
            top_right: [0.92, 0.38],
            bottom_left: [0.08, 0.63],
            bottom_right: [0.92, 0.63],
          },
        });
        showFeedback(response);
      } catch {
        // Practice continues if an individual inference request is unavailable.
      } finally {
        requestInFlightRef.current = false;
      }
    },
    [analysisEnabled, expectedFingerings, mode, showFeedback, targetChord]
  );

  const sendFrameToJS = useRunOnJS(submitFrame, [submitFrame]);
  const frameProcessor = useFrameProcessor(
    (frame) => {
      "worklet";
      if (!analysisEnabled) return;
      runAtTargetFps(1, () => {
        "worklet";
        const landscape = frame.orientation.startsWith("landscape");
        const rotation =
          frame.orientation === "landscape-left"
            ? "90deg"
            : frame.orientation === "landscape-right"
              ? "270deg"
              : frame.orientation === "portrait-upside-down"
                ? "180deg"
                : "0deg";
        const rgb = resize(frame, {
          scale: landscape
            ? { width: ML_HEIGHT, height: ML_WIDTH }
            : { width: ML_WIDTH, height: ML_HEIGHT },
          rotation,
          mirror: frame.isMirrored,
          pixelFormat: "rgb",
          dataType: "uint8",
        });
        sendFrameToJS(bytesToBase64(rgb));
      });
    },
    [analysisEnabled, resize, sendFrameToJS]
  );

  const finishRecording = useCallback((video: VideoFile, audioUri: string | null) => {
    recordingRef.current = false;
    setRecording(false);
    setAnalysisEnabled(false);
    setMetronomePlaying(false);
    setTempUri(asFileUri(video.path));
    setTempAudioUri(audioUri);
    const elapsed = Date.now() - (startedAtRef.current || Date.now());
    setDurationMs(Math.max(elapsed, video.duration * 1000));
    setSaveVisible(true);
    stoppingRef.current = false;
  }, []);

  const stopSession = useCallback(async () => {
    if (stoppingRef.current || !recordingRef.current) return;
    stoppingRef.current = true;
    setAnalysisEnabled(false);
    if (maxDurationTimerRef.current) clearTimeout(maxDurationTimerRef.current);

    let audioUri: string | null = null;
    try {
      const audio = await stopAudioRecording();
      audioUri = audio?.fileUri || null;
    } catch {
      // Keep the video even if audio finalization fails.
    }

    try {
      pendingAudioUriRef.current = audioUri;
      await cameraRef.current?.stopRecording();
      // VisionCamera delivers the file through onRecordingFinished below.
    } catch {
      stoppingRef.current = false;
      recordingRef.current = false;
      setRecording(false);
      Alert.alert("Recording Error", "Could not finish the practice video.");
    }
  }, [stopAudioRecording]);

  const pendingAudioUriRef = useRef<string | null>(null);

  const startSession = useCallback(async () => {
    if (!cameraRef.current || startingRef.current || recording || !hasPermission) return;
    startingRef.current = true;
    try {
      await startAudioRecording({
        sampleRate: 16000,
        channels: 1,
        encoding: "pcm_16bit",
        interval: 1000,
        bufferDurationSeconds: 0.2,
        streamFormat: "raw",
        keepAwake: false,
        showNotification: false,
        keepFullAnalysis: false,
        output: { primary: { enabled: true, format: "wav" } },
        android: { audioFocusStrategy: "background" },
        onAudioStream: async (event) => {
          if (typeof event.data === "string") latestAudioRef.current = event.data;
        },
      });

      cameraRef.current.startRecording({
        fileType: "mp4",
        onRecordingFinished: (video) =>
          finishRecording(video, pendingAudioUriRef.current),
        onRecordingError: () => {
          stoppingRef.current = false;
          recordingRef.current = false;
          setRecording(false);
          setAnalysisEnabled(false);
          Alert.alert("Recording Error", "Could not record the practice video.");
        },
      });
      startedAtRef.current = Date.now();
      recordingRef.current = true;
      setRecording(true);
      setAnalysisEnabled(true);
      maxDurationTimerRef.current = setTimeout(() => {
        stopSession().catch(() => {});
      }, MAX_DURATION_MS);
    } catch {
      setCameraError("Could not start the camera and microphone recording.");
      try {
        await stopAudioRecording();
      } catch {}
    } finally {
      startingRef.current = false;
    }
  }, [finishRecording, hasPermission, recording, startAudioRecording, stopAudioRecording, stopSession]);

  useEffect(() => {
    const camera = cameraRef.current;
    return () => {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
      if (maxDurationTimerRef.current) clearTimeout(maxDurationTimerRef.current);
      if (recordingRef.current) {
        camera?.cancelRecording().catch(() => {});
        stopAudioRecording().catch(() => {});
      }
    };
  }, [stopAudioRecording]);

  const requestPermissions = async () => {
    await requestCameraPermission();
    await requestMicrophonePermission();
  };

  const closeRecording = () => {
    if (recording) {
      stopSession().catch(() => {});
      return;
    }
    setMetronomePlaying(false);
    router.back();
  };

  const saveRecording = async () => {
    if (!tempUri) return;
    try {
      await savePracticeRecording({
        tempUri,
        tempAudioUri: tempAudioUri || undefined,
        name: recordingName,
        durationSeconds: Math.max(1, Math.round(durationMs / 1000)),
        source,
      });
      setSaveVisible(false);
      router.replace("/profile");
    } catch {
      Alert.alert("Save Error", "Could not save this recording locally.");
    }
  };

  const cancelSave = () => {
    setSaveVisible(false);
    setMetronomePlaying(false);
    router.back();
  };

  if (!hasPermission) {
    return (
      <View style={{ flex: 1, backgroundColor: "#121212", justifyContent: "center", padding: 24 }}>
        <Text style={{ color: "white", fontSize: 24, fontWeight: "bold", textAlign: "center" }}>
          Camera and microphone access are needed for practice recording.
        </Text>
        <TouchableOpacity onPress={requestPermissions} style={{ backgroundColor: "#3B82F6", padding: 16, borderRadius: 12, marginTop: 24 }}>
          <Text style={{ color: "white", textAlign: "center", fontSize: 18, fontWeight: "bold" }}>Allow Access</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={{ flex: 1, backgroundColor: "#121212", justifyContent: "center", padding: 24 }}>
        <Text style={{ color: "white", textAlign: "center", fontSize: 20 }}>Front camera unavailable.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <Camera
        ref={cameraRef}
        style={{ flex: 1 }}
        device={device}
        format={format}
        isActive={!saveVisible}
        video
        audio={false}
        fps={30}
        pixelFormat="yuv"
        frameProcessor={frameProcessor}
        onInitialized={startSession}
        onError={(error) => setCameraError(error.message)}
      />

      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: "8%",
          right: "8%",
          top: "38%",
          height: "25%",
          borderWidth: 2,
          borderColor: "rgba(96,165,250,0.9)",
          borderRadius: 8,
        }}
      >
        <Text
          style={{
            position: "absolute",
            top: -28,
            alignSelf: "center",
            color: "white",
            backgroundColor: "rgba(0,0,0,0.65)",
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 6,
          }}
        >
          Keep the first five frets inside the guide
        </Text>
      </View>

      <View style={{ position: "absolute", top: 55, left: 20, right: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <TouchableOpacity onPress={() => setMetronomeVisible(true)} style={{ backgroundColor: "#3B82F6", width: 48, height: 48, borderRadius: 24, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ color: "white", fontWeight: "bold" }}>M</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={closeRecording} style={{ backgroundColor: "#EF4444", paddingVertical: 12, paddingHorizontal: 18, borderRadius: 24 }}>
          <Text style={{ color: "white", fontWeight: "bold" }}>Close</Text>
        </TouchableOpacity>
      </View>

      {feedback && (
        <View style={{ position: "absolute", top: 125, left: 20, right: 20, backgroundColor: "rgba(17,24,39,0.94)", borderLeftWidth: 4, borderLeftColor: feedback.title === "Chord Detected" ? "#22C55E" : "#F59E0B", padding: 16, borderRadius: 8 }}>
          <Text style={{ color: "white", fontWeight: "bold", fontSize: 18 }}>{feedback.title}</Text>
          <Text style={{ color: "white", fontSize: 16, lineHeight: 22, marginTop: 6 }}>{feedback.message || fingerInstruction}</Text>
        </View>
      )}

      <View style={{ position: "absolute", bottom: 45, alignSelf: "center", backgroundColor: "rgba(0,0,0,0.65)", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20 }}>
        <Text style={{ color: cameraError ? "#FCA5A5" : "white" }}>{cameraError || (recording ? "Recording and analyzing..." : "Preparing camera...")}</Text>
      </View>

      <Modal visible={saveVisible} transparent animationType="fade" onRequestClose={cancelSave}>
        <View style={{ flex: 1, justifyContent: "center", padding: 24, backgroundColor: "rgba(0,0,0,0.7)" }}>
          <View style={{ backgroundColor: "#1F2937", borderRadius: 8, padding: 20 }}>
            <Text style={{ color: "white", fontSize: 22, fontWeight: "bold" }}>Name Recording</Text>
            <TextInput value={recordingName} onChangeText={setRecordingName} placeholder="Practice Session" placeholderTextColor="#9CA3AF" style={{ color: "white", borderColor: "#3B82F6", borderWidth: 1, borderRadius: 8, padding: 14, marginTop: 16 }} />
            <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
              <TouchableOpacity onPress={cancelSave} style={{ flex: 1, backgroundColor: "#374151", padding: 15, borderRadius: 8 }}>
                <Text style={{ color: "white", fontWeight: "bold", textAlign: "center" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveRecording} style={{ flex: 1, backgroundColor: "#22C55E", padding: 15, borderRadius: 8 }}>
                <Text style={{ color: "white", fontWeight: "bold", textAlign: "center" }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <MetronomeModal visible={metronomeVisible} keepPlayingOnClose playing={metronomePlaying} onPlayingChange={setMetronomePlaying} onClose={() => setMetronomeVisible(false)} />
    </View>
  );
}
