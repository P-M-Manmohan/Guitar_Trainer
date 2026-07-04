import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

import {
  PracticeRecording,
  formatDateTime,
  formatDuration,
  getPracticeRecordings,
} from "../utils/practiceRecordings";

export default function PracticeHistoryScreen() {
  const [recordings, setRecordings] = useState<PracticeRecording[]>([]);

  useFocusEffect(
    useCallback(() => {
      getPracticeRecordings().then(setRecordings);
    }, [])
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#121212" }}
      contentContainerStyle={{
        padding: 20,
        paddingTop: 60,
        paddingBottom: 40,
      }}
    >
      <Text
        style={{
          color: "white",
          fontSize: 32,
          fontWeight: "bold",
        }}
      >
        Practice History
      </Text>

      {recordings.length === 0 && (
        <View
          style={{
            backgroundColor: "#1F2937",
            borderRadius: 15,
            padding: 20,
            marginTop: 24,
          }}
        >
          <Text style={{ color: "#BBBBBB", fontSize: 16 }}>
            No saved practice recordings yet.
          </Text>
        </View>
      )}

      {recordings.map((recording) => (
        <TouchableOpacity
          key={recording.id}
          onPress={() =>
            router.push({
              pathname: "/recording/[id]",
              params: { id: recording.id },
            })
          }
          style={{
            backgroundColor: "#1F2937",
            borderRadius: 15,
            padding: 18,
            marginTop: 16,
          }}
        >
          <Text
            style={{
              color: "white",
              fontSize: 18,
              fontWeight: "bold",
            }}
          >
            {recording.name}
          </Text>

          <Text style={{ color: "#BBBBBB", marginTop: 8 }}>
            {formatDateTime(recording.createdAt)}
          </Text>

          <Text style={{ color: "#3B82F6", marginTop: 8 }}>
            Duration {formatDuration(recording.durationMs)}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
