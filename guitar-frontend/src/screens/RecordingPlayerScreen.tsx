import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect, useMemo, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";

import {
  PracticeRecording,
  getPracticeRecordings,
} from "../utils/practiceRecordings";

export default function RecordingPlayerScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [recording, setRecording] = useState<PracticeRecording | null>(null);
  const recordingId = useMemo(() => (typeof id === "string" ? id : ""), [id]);

  useEffect(() => {
    getPracticeRecordings().then((items) => {
      setRecording(items.find((item) => item.id === recordingId) || null);
    });
  }, [recordingId]);

  const player = useVideoPlayer(recording?.uri || "", (videoPlayer) => {
    videoPlayer.loop = false;
  });

  if (!recording) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#121212",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <Stack.Screen options={{ title: "Recording" }} />

        <Text style={{ color: "white", textAlign: "center" }}>
          Recording not found.
        </Text>

        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            backgroundColor: "#3B82F6",
            padding: 14,
            borderRadius: 12,
            marginTop: 20,
          }}
        >
          <Text style={{ color: "white", textAlign: "center" }}>
            Close
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <Stack.Screen options={{ title: recording.name }} />

      <VideoView
        player={player}
        style={{ flex: 1 }}
        allowsFullscreen
        allowsPictureInPicture
        nativeControls
      />
    </View>
  );
}
