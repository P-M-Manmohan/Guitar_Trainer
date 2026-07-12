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
  type HandLandmark,
  type PracticeAnalysisResponse,
} from "../services/practiceAnalysis";
import { savePracticeRecording } from "../utils/practiceRecordings";
import { apiPost } from "../services/api";

const ML_WIDTH = 216;
const ML_HEIGHT = 384;
const MAX_DURATION_MS = 30 * 60 * 1000;
const FEEDBACK_DURATION_MS = 3000;

const HAND_CONNECTIONS: [number, number, string][] = [
  [0, 1, "#D1D5DB"], [0, 5, "#D1D5DB"], [5, 9, "#D1D5DB"],
  [9, 13, "#D1D5DB"], [13, 17, "#D1D5DB"], [0, 17, "#D1D5DB"],
  [1, 2, "#A78BFA"], [2, 3, "#A78BFA"], [3, 4, "#A78BFA"],
  [5, 6, "#FACC15"], [6, 7, "#FACC15"], [7, 8, "#FACC15"],
  [9, 10, "#4ADE80"], [10, 11, "#4ADE80"], [11, 12, "#4ADE80"],
  [13, 14, "#60A5FA"], [14, 15, "#60A5FA"], [15, 16, "#60A5FA"],
  [17, 18, "#F472B6"], [18, 19, "#F472B6"], [19, 20, "#F472B6"],
];

function displayChordName(chord: string) {
  if (chord.endsWith("m")) return `${chord.slice(0, -1)} Minor`;
  if (chord.endsWith("7")) return chord;
  return `${chord} Major`;
}

function HandSkeleton({ landmarks }: { landmarks: HandLandmark[] }) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  if (landmarks.length !== 21) return null;

  const scale = Math.max(size.width / ML_WIDTH, size.height / ML_HEIGHT);
  const renderedWidth = ML_WIDTH * scale;
  const renderedHeight = ML_HEIGHT * scale;
  const offsetX = (size.width - renderedWidth) / 2;
  const offsetY = (size.height - renderedHeight) / 2;
  const points = landmarks.map((landmark) => ({
    x: offsetX + landmark.x * renderedWidth,
    y: offsetY + landmark.y * renderedHeight,
  }));

  return (
    <View
      pointerEvents="none"
      onLayout={(event) => setSize(event.nativeEvent.layout)}
      style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
    >
      {size.width > 0 && HAND_CONNECTIONS.map(([from, to, color]) => {
        const start = points[from];
        const end = points[to];
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        return (
          <View
            key={`${from}-${to}`}
            style={{
              position: "absolute",
              left: (start.x + end.x) / 2 - length / 2,
              top: (start.y + end.y) / 2 - 1.5,
              width: length,
              height: 3,
              borderRadius: 2,
              backgroundColor: color,
              transform: [{ rotateZ: `${angle}rad` }],
            }}
          />
        );
      })}
      {size.width > 0 && points.map((point, index) => (
        <View
          key={`landmark-${index}`}
          style={{
            position: "absolute",
            left: point.x - 4,
            top: point.y - 4,
            width: 8,
            height: 8,
            borderRadius: 4,
            borderWidth: 1,
            borderColor: "white",
            backgroundColor: "#22C55E",
          }}
        />
      ))}
    </View>
  );
}

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
  if (status === "correct") return "Perfect!";
  if (status === "recognized") return "Chord Detected";
  if (status === "no_chord_detected") return "Not a Chord";
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
  const [liveChord, setLiveChord] = useState("Waiting...");
  const [liveLandmarks, setLiveLandmarks] = useState<HandLandmark[]>([]);
  const [cameraError, setCameraError] = useState("");

  const hasPermission = hasCameraPermission && microphonePermission?.granted;

  const showFeedback = useCallback((response: PracticeAnalysisResponse) => {
    if (response.raw_status !== response.stable_status) {
      return;
    }
    const visibleStatuses = new Set([
      "fix_fingering",
      "correct",
      "recognized",
      "no_chord_detected",
    ]);
    if (!visibleStatuses.has(response.status)) {
      return;
    }
    const message = response.instruction || response.summary;
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
          expected_fingerings: expectedFingerings.length ? expectedFingerings : undefined,
          neck_bbox: {
            top_left: [0.08, 0.38],
            top_right: [0.92, 0.38],
            bottom_left: [0.08, 0.63],
            bottom_right: [0.92, 0.63],
          },
        });
        if (mode === "free") {
          setLiveLandmarks(response.landmarks || []);
          if (!response.hand_detected) {
            setLiveChord("No hand detected");
          } else if (response.status === "recognized") {
            setLiveChord(displayChordName(response.target_chord));
          } else if (response.status === "analyzing") {
            setLiveChord("Adjusting...");
          } else {
            setLiveChord("Adjusting...");
          }
        } else {
          showFeedback(response);
        }
      } catch {
        // Practice continues if an individual inference request is unavailable.
        if (mode === "free") setLiveChord("ML service unavailable");
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
      runAtTargetFps(mode === "free" ? 2 : 1, () => {
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
    [analysisEnabled, mode, resize, sendFrameToJS]
  );

  const finishRecording = useCallback((video: VideoFile, audioUri: string | null) => {
    recordingRef.current = false;
    setRecording(false);
    setAnalysisEnabled(false);
    setLiveLandmarks([]);
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
      const durationSeconds = Math.max(1, Math.round(durationMs / 1000));
      await savePracticeRecording({
        tempUri,
        tempAudioUri: tempAudioUri || undefined,
        name: recordingName,
        durationSeconds,
        source,
      });
      // A saved local recording is the source of truth; a temporary API failure
      // must not discard it.
      await apiPost<void>("/practice/time", { seconds: durationSeconds }).catch(() => {});
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

      {mode === "free" && <HandSkeleton landmarks={liveLandmarks} />}

      {mode === "selected" && (
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
            borderRadius: 6,
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
      )}

      <View style={{ position: "absolute", top: 55, left: 20, right: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <TouchableOpacity onPress={() => setMetronomeVisible(true)} style={{ backgroundColor: "#3B82F6", width: 48, height: 48, borderRadius: 24, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ color: "white", fontWeight: "bold" }}>M</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={closeRecording} style={{ backgroundColor: "#EF4444", paddingVertical: 12, paddingHorizontal: 18, borderRadius: 24 }}>
          <Text style={{ color: "white", fontWeight: "bold" }}>Close</Text>
        </TouchableOpacity>
      </View>

      {mode === "free" && (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 120,
            left: 20,
            backgroundColor: "rgba(0,0,0,0.72)",
            borderRadius: 8,
            paddingHorizontal: 14,
            paddingVertical: 10,
          }}
        >
          <Text style={{ color: "#4ADE80", fontSize: 22, fontWeight: "bold" }}>
            Chord: {liveChord}
          </Text>
        </View>
      )}

      {mode === "selected" && feedback && (
        <View style={{ position: "absolute", top: 125, left: 20, right: 20, backgroundColor: "rgba(17,24,39,0.94)", borderLeftWidth: 4, borderLeftColor: feedback.title === "Chord Detected" || feedback.title === "Perfect!" ? "#22C55E" : "#F59E0B", padding: 16, borderRadius: 8 }}>
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
