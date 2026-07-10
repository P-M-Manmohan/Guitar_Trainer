import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

import MetronomeModal from "../components/MetronomeModal";
import HomeButton from "../components/HomeButton";
import {
  formatDuration,
  getDurationSeconds,
  getPracticeRecordings,
} from "../utils/practiceRecordings";

export default function HomeScreen() {
  const router = useRouter();
  const [metronomeVisible, setMetronomeVisible] = useState(false);
  const [todayPractice, setTodayPractice] = useState("00:00:00");

  useFocusEffect(
    useCallback(() => {
      getPracticeRecordings().then((items) => {
        const today = new Date().toDateString();
        const totalSeconds = items
          .filter((item) => new Date(item.createdAt).toDateString() === today)
          .reduce((sum, item) => sum + getDurationSeconds(item), 0);
        setTodayPractice(formatDuration(totalSeconds));
      });
    }, [])
  );

  return (
    <ScrollView
      style={{
        flex: 1,
        backgroundColor: "#121212",
      }}
      contentContainerStyle={{
        padding: 20,
        paddingBottom: 40,
      }}
    >
      {/* Header */}

      <Text
        style={{
          color: "white",
          fontSize: 32,
          fontWeight: "bold",
          marginTop: 50,
        }}
      >
        🎸 Guitar Trainer
      </Text>

      <Text
        style={{
          color: "#BBBBBB",
          fontSize: 18,
          marginTop: 10,
        }}
      >
        Ready to practice today?
      </Text>

      {/* Today's Practice */}

      <View
        style={{
          backgroundColor: "#1F2937",
          padding: 20,
          borderRadius: 15,
          marginTop: 25,
        }}
      >
        <Text
          style={{
            color: "#BBBBBB",
            fontSize: 16,
          }}
        >
          {"Today's Practice"}
        </Text>

        <Text
          style={{
            color: "#3B82F6",
            fontSize: 40,
            fontWeight: "bold",
            marginTop: 10,
          }}
        >
          {todayPractice}
        </Text>

        <Text
          style={{
            color: "#BBBBBB",
            marginTop: 5,
          }}
        >
          Goal: 30 min
        </Text>
      </View>

      {/* Start Practice */}

      <TouchableOpacity

        onPress={() =>
          router.push({
            pathname: "/practice-session",
            params: { source: "Home Practice" },
          })
        }

        style={{
          backgroundColor: "#3B82F6",
          padding: 20,
          borderRadius: 15,
          marginTop: 25,
        }}
      >
        <Text
          style={{
            color: "white",
            fontSize: 20,
            fontWeight: "bold",
            textAlign: "center",
          }}
        >
          Start Practice
        </Text>
      </TouchableOpacity>

      {/* Quick Actions */}

      <Text
        style={{
          color: "white",
          fontSize: 22,
          fontWeight: "bold",
          marginTop: 35,
        }}
      >
        Quick Actions
      </Text>

      <HomeButton
        title="Lessons"
        onPress={() => router.push("/lessons")}
      />

      <HomeButton
        title="Chord Library"
        onPress={() => router.push("/chords")}
      />

      <HomeButton
        title="Metronome"
        onPress={() => setMetronomeVisible(true)}
      />

      <HomeButton
        title="Tuner"
        onPress={() => router.push("/tuner")}
      />

      <MetronomeModal
        visible={metronomeVisible}
        onClose={() => setMetronomeVisible(false)}
      />
    </ScrollView>
  );
}
