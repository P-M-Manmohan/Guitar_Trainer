import { CameraView, useCameraPermissions, useMicrophonePermissions } from "expo-camera";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  Alert,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import MetronomeModal from "../components/MetronomeModal";
import { savePracticeRecording } from "../utils/practiceRecordings";

export default function PracticeSessionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const source = typeof params.source === "string" ? params.source : "Practice";

  const cameraRef = useRef<any>(null);
  const startedAtRef = useRef<number | null>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();

  const [recording, setRecording] = useState(false);
  const [tempUri, setTempUri] = useState<string | null>(null);
  const [durationMs, setDurationMs] = useState(0);
  const [recordingName, setRecordingName] = useState("");
  const [saveVisible, setSaveVisible] = useState(false);
  const [metronomeVisible, setMetronomeVisible] = useState(false);
  const [metronomePlaying, setMetronomePlaying] = useState(false);

  const hasPermission =
    cameraPermission?.granted && microphonePermission?.granted;

  const requestPermissions = async () => {
    await requestCameraPermission();
    await requestMicrophonePermission();
  };

  const startRecording = async () => {
    if (!cameraRef.current || recording || !hasPermission) {
      return;
    }

    try {
      setRecording(true);
      startedAtRef.current = Date.now();
      const video = await cameraRef.current.recordAsync({
        maxDuration: 60 * 30,
      });
      if (video?.uri) {
        setRecording(false);
        setMetronomePlaying(false);
        setTempUri(video.uri);
        setDurationMs(Date.now() - (startedAtRef.current || Date.now()));
        setSaveVisible(true);
      }
    } catch {
      Alert.alert("Recording Error", "Could not record the practice video.");
      setRecording(false);
    }
  };

  const closeRecording = () => {
    if (recording && cameraRef.current) {
      cameraRef.current.stopRecording();
      setRecording(false);
      setMetronomePlaying(false);
      return;
    }
    setMetronomePlaying(false);
    router.back();
  };

  const saveRecording = async () => {
    if (!tempUri) {
      return;
    }

    try {
      await savePracticeRecording({
        tempUri,
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
    setMetronomePlaying(false);
    router.back();
  };

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
            borderRadius: 12,
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
      <CameraView
        ref={cameraRef}
        style={{ flex: 1 }}
        facing="front"
        mode="video"
        onCameraReady={startRecording}
      />

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
          <Text style={{ color: "white", fontWeight: "bold" }}>
            Close
          </Text>
        </TouchableOpacity>
      </View>

      <View
        style={{
          position: "absolute",
          bottom: 45,
          alignSelf: "center",
          backgroundColor: "rgba(0,0,0,0.55)",
          paddingVertical: 10,
          paddingHorizontal: 16,
          borderRadius: 20,
        }}
      >
        <Text style={{ color: "white" }}>
          {recording ? "Recording..." : "Preparing camera..."}
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
              borderRadius: 15,
              padding: 20,
            }}
          >
            <Text
              style={{
                color: "white",
                fontSize: 22,
                fontWeight: "bold",
              }}
            >
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
                borderRadius: 10,
                padding: 14,
                marginTop: 16,
              }}
            />

            <View
              style={{
                flexDirection: "row",
                gap: 12,
                marginTop: 16,
              }}
            >
              <TouchableOpacity
                onPress={cancelSave}
                style={{
                  flex: 1,
                  backgroundColor: "#374151",
                  padding: 15,
                  borderRadius: 12,
                }}
              >
                <Text
                  style={{
                    color: "white",
                    fontWeight: "bold",
                    textAlign: "center",
                  }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={saveRecording}
                style={{
                  flex: 1,
                  backgroundColor: "#22C55E",
                  padding: 15,
                  borderRadius: 12,
                }}
              >
                <Text
                  style={{
                    color: "white",
                    fontWeight: "bold",
                    textAlign: "center",
                  }}
                >
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
