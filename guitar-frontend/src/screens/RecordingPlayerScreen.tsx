import { useLocalSearchParams, useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";

import {
  PracticeRecording,
  getPracticeRecordings,
} from "../utils/practiceRecordings";

export default function RecordingPlayerScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [recording, setRecording] = useState<PracticeRecording | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    getPracticeRecordings().then((items) => {
      setRecording(items.find((item) => item.id === id) || null);
    });
  }, [id]);

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

  const togglePlayback = () => {
    if (playing) {
      player.pause();
      setPlaying(false);
    } else {
      player.play();
      setPlaying(true);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <VideoView
        player={player}
        style={{ flex: 1 }}
        allowsFullscreen
        allowsPictureInPicture
      />

      <View
        style={{
          position: "absolute",
          bottom: 40,
          left: 20,
          right: 20,
          flexDirection: "row",
          gap: 12,
        }}
      >
        <TouchableOpacity
          onPress={togglePlayback}
          style={{
            flex: 1,
            backgroundColor: "#3B82F6",
            padding: 16,
            borderRadius: 14,
          }}
        >
          <Text
            style={{
              color: "white",
              textAlign: "center",
              fontWeight: "bold",
            }}
          >
            {playing ? "Pause" : "Play"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            flex: 1,
            backgroundColor: "#EF4444",
            padding: 16,
            borderRadius: 14,
          }}
        >
          <Text
            style={{
              color: "white",
              textAlign: "center",
              fontWeight: "bold",
            }}
          >
            Close
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
