import {
  AudioDataEvent,
  AudioRecording,
  useAudioRecorder,
} from "@siteed/audio-studio";
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
import { useSharedValue } from "react-native-reanimated";
import {
  Camera,
  Recorder,
  useCameraPermission,
  useFrameOutput,
  useVideoOutput,
} from "react-native-vision-camera";
import { useResizer } from "react-native-vision-camera-resizer";
import { scheduleOnRN } from "react-native-worklets";

import MetronomeModal from "../components/MetronomeModal";
import {
  ExpectedFingering,
  PracticeAnalysisRequest,
  PracticeAnalysisResponse,
  analyzePractice,
} from "../services/practiceAnalysis";
import { savePracticeRecording } from "../utils/practiceRecordings";

const ML_FRAME_WIDTH = 216;
const ML_FRAME_HEIGHT = 384;
const ML_INTERVAL_MS = 1200;
const MAX_SESSION_SECONDS = 30 * 60;

const NECK_GUIDE: PracticeAnalysisRequest["neck_bbox"] = {
  top_left: [0.08, 0.38],
  top_right: [0.92, 0.38],
  bottom_left: [0.08, 0.63],
  bottom_right: [0.92, 0.63],
};

const FEEDBACK_STATUSES = new Set([
  "fix_fingering",
  "check_tuning_or_strum",
  "need_audio",
  "no_hand_detected",
  "unsupported_chord",
]);

function bytesToBase64(bytes: Uint8Array) {
  "worklet";
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let result = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index];
    const second = index + 1 < bytes.length ? bytes[index + 1] : 0;
    const third = index + 2 < bytes.length ? bytes[index + 2] : 0;
    const combined = (first << 16) | (second << 8) | third;

    result += alphabet[(combined >> 18) & 63];
    result += alphabet[(combined >> 12) & 63];
    result += index + 1 < bytes.length ? alphabet[(combined >> 6) & 63] : "=";
    result += index + 2 < bytes.length ? alphabet[combined & 63] : "=";
  }
  return result;
}

function stringParam(value: string | string[] | undefined, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function parseFingerings(value: string): ExpectedFingering[] {
  if (!value) {
    return [];
  }
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function fileUri(path: string) {
  return path.startsWith("file://") ? path : `file://${path}`;
}

export default function PracticeSessionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const source = stringParam(params.source, "Practice");
  const targetChord = stringParam(params.targetChord);
  const fallbackInstruction = stringParam(params.fallbackInstruction);
  const expectedFingerings = useMemo(
    () => parseFingerings(stringParam(params.expectedFingerings)),
    [params.expectedFingerings],
  );

  const { hasPermission: hasCameraPermission, requestPermission } =
    useCameraPermission();
  const [microphonePermission, requestMicrophonePermission] =
    useMicrophonePermissions();
  const {
    startRecording: startAudioRecording,
    stopRecording: stopAudioRecording,
  } = useAudioRecorder();

  const recorderRef = useRef<Recorder | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const recordingRef = useRef(false);
  const startRequestedRef = useRef(false);
  const closingRef = useRef(false);
  const audioActiveRef = useRef(false);
  const audioFinishedRef = useRef(false);
  const videoFinishedRef = useRef(false);
  const videoUriRef = useRef<string | null>(null);
  const audioRecordingRef = useRef<AudioRecording | null>(null);
  const latestAudioRef = useRef<string | null>(null);
  const analysisInFlightRef = useRef(false);
  const sessionIdRef = useRef(
    `practice-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  );
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFeedbackRef = useRef({ message: "", shownAt: 0 });

  const [recording, setRecording] = useState(false);
  const [tempUri, setTempUri] = useState<string | null>(null);
  const [tempAudioUri, setTempAudioUri] = useState<string | null>(null);
  const [durationMs, setDurationMs] = useState(0);
  const [recordingName, setRecordingName] = useState("");
  const [saveVisible, setSaveVisible] = useState(false);
  const [metronomeVisible, setMetronomeVisible] = useState(false);
  const [metronomePlaying, setMetronomePlaying] = useState(false);
  const [liveError, setLiveError] = useState("");
  const [feedback, setFeedback] = useState<{
    title: string;
    message: string;
    warning: boolean;
  } | null>(null);

  const analysisActive = useSharedValue(false);
  const lastMlFrameAt = useSharedValue(0);
  const videoOutput = useVideoOutput({
    targetResolution: { width: 720, height: 1280 },
    targetBitRate: 2_500_000,
    enableAudio: false,
    fileType: "mp4",
  });
  const resizerState = useResizer({
    width: ML_FRAME_WIDTH,
    height: ML_FRAME_HEIGHT,
    channelOrder: "rgb",
    dataType: "uint8",
    scaleMode: "cover",
    pixelLayout: "interleaved",
  });

  const hasPermission =
    hasCameraPermission && microphonePermission?.granted === true;

  const clearFeedback = useCallback(() => {
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
    }
    setFeedback(null);
  }, []);

  const showFeedback = useCallback(
    (response: PracticeAnalysisResponse) => {
      if (
        response.frames_considered < 3 ||
        response.raw_status !== response.stable_status ||
        !FEEDBACK_STATUSES.has(response.stable_status)
      ) {
        return;
      }

      const message =
        response.instruction ||
        (response.stable_status === "fix_fingering"
          ? fallbackInstruction
          : response.summary);
      const now = Date.now();
      if (
        message === lastFeedbackRef.current.message &&
        now - lastFeedbackRef.current.shownAt < 6000
      ) {
        return;
      }

      lastFeedbackRef.current = { message, shownAt: now };
      setFeedback({
        title:
          response.stable_status === "fix_fingering"
            ? "Adjust Finger Placement"
            : response.stable_status === "check_tuning_or_strum"
              ? "Check Your Sound"
              : "Live Practice",
        message,
        warning: response.stable_status !== "need_audio",
      });
      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current);
      }
      feedbackTimerRef.current = setTimeout(() => {
        setFeedback(null);
        feedbackTimerRef.current = null;
      }, 5000);
    },
    [fallbackInstruction],
  );

  const handleMlFrame = useCallback(
    async (image: string) => {
      if (
        !recordingRef.current ||
        !targetChord ||
        analysisInFlightRef.current
      ) {
        return;
      }

      analysisInFlightRef.current = true;
      try {
        const response = await analyzePractice({
          session_id: sessionIdRef.current,
          target_chord: targetChord,
          image,
          image_format: "rgb",
          image_width: ML_FRAME_WIDTH,
          image_height: ML_FRAME_HEIGHT,
          audio: latestAudioRef.current || undefined,
          audio_format: "pcm_s16le",
          audio_sample_rate: 16000,
          audio_channels: 1,
          expected_fingerings:
            expectedFingerings.length > 0 ? expectedFingerings : undefined,
          neck_bbox: NECK_GUIDE,
        });
        if (recordingRef.current) {
          setLiveError("");
          showFeedback(response);
        }
      } catch {
        if (recordingRef.current) {
          setLiveError("Server Error!");
        }
      } finally {
        analysisInFlightRef.current = false;
      }
    },
    [expectedFingerings, showFeedback, targetChord],
  );

  const receiveMlFrame = useCallback(
    (image: string) => {
      void handleMlFrame(image);
    },
    [handleMlFrame],
  );

  const resizer = resizerState.resizer;
  const frameOutput = useFrameOutput({
    targetResolution: { width: 432, height: 768 },
    pixelFormat: "yuv",
    dropFramesWhileBusy: true,
    onFrame(frame) {
      "worklet";
      const now = Date.now();
      if (
        !analysisActive.value ||
        !resizer ||
        now - lastMlFrameAt.value < ML_INTERVAL_MS
      ) {
        frame.dispose();
        return;
      }

      lastMlFrameAt.value = now;
      let resizedFrame;
      try {
        resizedFrame = resizer.resize(frame);
        const bytes = new Uint8Array(resizedFrame.getPixelBuffer());
        scheduleOnRN(receiveMlFrame, bytesToBase64(bytes));
      } finally {
        resizedFrame?.dispose();
        frame.dispose();
      }
    },
  });
  const cameraOutputs = useMemo(
    () => [videoOutput, frameOutput],
    [frameOutput, videoOutput],
  );

  const finalizeIfReady = useCallback(() => {
    if (
      !closingRef.current ||
      !audioFinishedRef.current ||
      !videoFinishedRef.current
    ) {
      return;
    }

    const videoUri = videoUriRef.current;
    if (!videoUri) {
      Alert.alert("Recording Error", "The practice video could not be finalized.");
      router.back();
      return;
    }

    const audioRecording = audioRecordingRef.current;
    setTempUri(videoUri);
    setTempAudioUri(audioRecording?.fileUri || null);
    setDurationMs(
      audioRecording?.durationMs ||
        Math.max(1000, Date.now() - (startedAtRef.current || Date.now())),
    );
    setSaveVisible(true);
    closingRef.current = false;
  }, [router]);

  const stopAudioAndStore = useCallback(async () => {
    if (!audioActiveRef.current) {
      return;
    }
    audioActiveRef.current = false;
    try {
      audioRecordingRef.current = await stopAudioRecording();
    } catch {
      Alert.alert(
        "Audio Error",
        "The video was recorded, but its separate audio track could not be finalized.",
      );
    } finally {
      audioFinishedRef.current = true;
      finalizeIfReady();
    }
  }, [finalizeIfReady, stopAudioRecording]);

  const stopLiveAnalysis = useCallback(() => {
    analysisActive.value = false;
    recordingRef.current = false;
    setRecording(false);
    setMetronomePlaying(false);
    clearFeedback();
  }, [analysisActive, clearFeedback]);

  const handleVideoFinished = useCallback(
    (path: string) => {
      videoUriRef.current = fileUri(path);
      videoFinishedRef.current = true;

      if (!closingRef.current) {
        closingRef.current = true;
        stopLiveAnalysis();
        void stopAudioAndStore();
      }
      finalizeIfReady();
    },
    [finalizeIfReady, stopAudioAndStore, stopLiveAnalysis],
  );

  const startSession = useCallback(async () => {
    if (startRequestedRef.current || !hasPermission) {
      return;
    }
    startRequestedRef.current = true;
    audioFinishedRef.current = false;
    videoFinishedRef.current = false;
    audioRecordingRef.current = null;
    videoUriRef.current = null;

    try {
      const recorder = await videoOutput.createRecorder({
        maxDuration: MAX_SESSION_SECONDS,
      });
      recorderRef.current = recorder;

      await startAudioRecording({
        sampleRate: 16000,
        channels: 1,
        encoding: "pcm_16bit",
        interval: ML_INTERVAL_MS,
        bufferDurationSeconds: 0.2,
        streamFormat: "raw",
        keepAwake: false,
        showNotification: false,
        output: { primary: { enabled: true, format: "wav" } },
        android: { audioFocusStrategy: "background" },
        ios: {
          audioSession: {
            category: "PlayAndRecord",
            mode: "VideoRecording",
            categoryOptions: ["DefaultToSpeaker", "MixWithOthers"],
          },
        },
        onAudioStream: async (event: AudioDataEvent) => {
          if (typeof event.data === "string") {
            latestAudioRef.current = event.data;
          }
        },
      });
      audioActiveRef.current = true;

      await recorder.startRecording(
        (path) => handleVideoFinished(path),
        () => {
          videoFinishedRef.current = true;
          closingRef.current = true;
          stopLiveAnalysis();
          void stopAudioAndStore();
          finalizeIfReady();
        },
      );

      startedAtRef.current = Date.now();
      recordingRef.current = true;
      setRecording(true);
      analysisActive.value = Boolean(targetChord);
    } catch {
      if (audioActiveRef.current) {
        await stopAudioAndStore();
      }
      Alert.alert("Recording Error", "Could not start the practice session.");
      router.back();
    }
  }, [
    analysisActive,
    finalizeIfReady,
    handleVideoFinished,
    hasPermission,
    router,
    startAudioRecording,
    stopAudioAndStore,
    stopLiveAnalysis,
    targetChord,
    videoOutput,
  ]);

  const requestPermissions = async () => {
    await requestPermission();
    await requestMicrophonePermission();
  };

  const closeRecording = () => {
    if (recordingRef.current && recorderRef.current) {
      closingRef.current = true;
      stopLiveAnalysis();
      void stopAudioAndStore();
      void recorderRef.current.stopRecording().catch(() => {
        videoFinishedRef.current = true;
        finalizeIfReady();
      });
      return;
    }
    router.back();
  };

  const saveRecording = async () => {
    if (!tempUri) {
      return;
    }

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
    setTempUri(null);
    setTempAudioUri(null);
    setMetronomePlaying(false);
    router.back();
  };

  useEffect(() => {
    return () => {
      analysisActive.value = false;
      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current);
      }
      if (recordingRef.current && recorderRef.current) {
        void recorderRef.current.stopRecording();
      }
      if (audioActiveRef.current) {
        audioActiveRef.current = false;
        void stopAudioRecording();
      }
    };
  }, [analysisActive, stopAudioRecording]);

  if (!hasPermission) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#121212",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <Text
          style={{
            color: "white",
            fontSize: 24,
            fontWeight: "bold",
            textAlign: "center",
          }}
        >
          Camera and microphone access are needed for practice recording.
        </Text>

        <TouchableOpacity
          onPress={requestPermissions}
          style={{
            backgroundColor: "#3B82F6",
            padding: 16,
            borderRadius: 8,
            marginTop: 24,
          }}
        >
          <Text
            style={{
              color: "white",
              textAlign: "center",
              fontSize: 18,
              fontWeight: "bold",
            }}
          >
            Allow Access
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <Camera
        style={{ flex: 1 }}
        device="front"
        isActive={!saveVisible}
        outputs={cameraOutputs}
        mirrorMode="auto"
        resizeMode="cover"
        onConfigured={() => void startSession()}
        onError={() => setLiveError("Camera Error!")}
      />

      {targetChord ? (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: "38%",
            left: "8%",
            width: "84%",
            height: "25%",
            borderWidth: 2,
            borderColor: "rgba(255,255,255,0.75)",
            borderRadius: 8,
            justifyContent: "flex-end",
          }}
        >
          <Text
            style={{
              color: "white",
              backgroundColor: "rgba(0,0,0,0.65)",
              paddingHorizontal: 10,
              paddingVertical: 7,
              fontSize: 13,
            }}
          >
            Keep your fretting hand and first five frets inside this guide.
          </Text>
        </View>
      ) : null}

      <View
        style={{
          position: "absolute",
          top: 55,
          left: 20,
          right: 20,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <TouchableOpacity
          onPress={() => setMetronomeVisible(true)}
          style={{
            backgroundColor: "#3B82F6",
            width: 48,
            height: 48,
            borderRadius: 24,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text style={{ color: "white", fontWeight: "bold" }}>M</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={closeRecording}
          style={{
            backgroundColor: "#EF4444",
            paddingVertical: 12,
            paddingHorizontal: 18,
            borderRadius: 24,
          }}
        >
          <Text style={{ color: "white", fontWeight: "bold" }}>Close</Text>
        </TouchableOpacity>
      </View>

      {feedback ? (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 120,
            left: 20,
            right: 20,
            backgroundColor: feedback.warning
              ? "rgba(127,29,29,0.94)"
              : "rgba(30,64,175,0.94)",
            borderRadius: 8,
            padding: 16,
          }}
        >
          <Text style={{ color: "white", fontSize: 18, fontWeight: "bold" }}>
            {feedback.title}
          </Text>
          <Text style={{ color: "white", fontSize: 15, lineHeight: 22, marginTop: 6 }}>
            {feedback.message}
          </Text>
        </View>
      ) : null}

      <View
        style={{
          position: "absolute",
          bottom: 45,
          alignSelf: "center",
          backgroundColor: "rgba(0,0,0,0.65)",
          paddingVertical: 10,
          paddingHorizontal: 16,
          borderRadius: 20,
        }}
      >
        <Text style={{ color: liveError ? "#FCA5A5" : "white" }}>
          {liveError ||
            (recording
              ? targetChord
                ? `Recording and analyzing ${targetChord}...`
                : "Recording..."
              : "Preparing camera...")}
        </Text>
      </View>

      <Modal
        visible={saveVisible}
        transparent
        animationType="fade"
        onRequestClose={cancelSave}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            padding: 24,
            backgroundColor: "rgba(0,0,0,0.7)",
          }}
        >
          <View
            style={{
              backgroundColor: "#1F2937",
              borderRadius: 8,
              padding: 20,
            }}
          >
            <Text style={{ color: "white", fontSize: 22, fontWeight: "bold" }}>
              Name Recording
            </Text>

            <TextInput
              value={recordingName}
              onChangeText={setRecordingName}
              placeholder="Practice Session"
              placeholderTextColor="#9CA3AF"
              style={{
                color: "white",
                borderColor: "#3B82F6",
                borderWidth: 1,
                borderRadius: 8,
                padding: 14,
                marginTop: 16,
              }}
            />

            <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
              <TouchableOpacity
                onPress={cancelSave}
                style={{
                  flex: 1,
                  backgroundColor: "#374151",
                  padding: 15,
                  borderRadius: 8,
                }}
              >
                <Text style={{ color: "white", fontWeight: "bold", textAlign: "center" }}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={saveRecording}
                style={{
                  flex: 1,
                  backgroundColor: "#22C55E",
                  padding: 15,
                  borderRadius: 8,
                }}
              >
                <Text style={{ color: "white", fontWeight: "bold", textAlign: "center" }}>
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <MetronomeModal
        visible={metronomeVisible}
        keepPlayingOnClose
        playing={metronomePlaying}
        onPlayingChange={setMetronomePlaying}
        onClose={() => setMetronomeVisible(false)}
      />
    </View>
  );
}
