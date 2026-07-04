import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

import { SERVER_ERROR, apiGet } from "../services/api";
import {
  formatDuration,
  getPracticeRecordings,
} from "../utils/practiceRecordings";

type UserProfile = {
  lessons_completed?: number;
  completedLessons?: number;
  current_streak?: number;
  currentStreak?: number;
  level?: string;
};

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <View
      style={{
        backgroundColor: "#1F2937",
        borderRadius: 15,
        padding: 20,
        marginTop: 20,
      }}
    >
      <Text style={{ color: "white", fontSize: 18 }}>
        {label}
      </Text>

      <Text
        style={{
          color: "#3B82F6",
          fontSize: 34,
          fontWeight: "bold",
          marginTop: 8,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

export default function ProfileScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState("");
  const [practiceTime, setPracticeTime] = useState("00:00:00");

  useEffect(() => {
    apiGet<UserProfile>("/user/1")
      .then((response) => {
        setProfile(response);
        setError("");
      })
      .catch(() => setError(SERVER_ERROR));
  }, []);

  useFocusEffect(
    useCallback(() => {
      getPracticeRecordings().then((items) => {
        const totalMs = items.reduce(
          (sum, item) => sum + item.durationMs,
          0
        );
        setPracticeTime(formatDuration(totalMs));
      });
    }, [])
  );

  const completed =
    profile?.lessons_completed ?? profile?.completedLessons ?? 0;
  const streak =
    profile?.current_streak ?? profile?.currentStreak ?? 0;
  const level = profile?.level ?? "Beginner";

  return (
    <ScrollView
      style={{
        flex: 1,
        backgroundColor: "#121212",
      }}
      contentContainerStyle={{
        padding: 20,
        paddingTop: 50,
        paddingBottom: 40,
      }}
    >
      <Text
        style={{
          color: "white",
          fontSize: 34,
          fontWeight: "bold",
          marginTop: 60,
        }}
      >
        My Profile
      </Text>

      <StatCard
        label="Lessons Completed"
        value={error ? SERVER_ERROR : completed}
      />
      <StatCard
        label="Current Streak"
        value={error ? SERVER_ERROR : `${streak} Days`}
      />
      <StatCard label="Practice Time" value={practiceTime} />
      <StatCard
        label="Level"
        value={error ? SERVER_ERROR : level}
      />

      <TouchableOpacity
        onPress={() => router.push("/practice-history")}
        style={{
          backgroundColor: "#3B82F6",
          padding: 18,
          borderRadius: 15,
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
          Practice History
        </Text>
      </TouchableOpacity>

      <View
        style={{
          backgroundColor: "#1F2937",
          borderRadius: 15,
          padding: 20,
          marginTop: 20,
        }}
      >
        <Text
          style={{
            color: "white",
            fontSize: 22,
            fontWeight: "bold",
            marginBottom: 15,
          }}
        >
          Achievements
        </Text>

        <Text style={{ color: "white", fontSize: 16 }}>
          {completed >= 1 ? "✓" : "□"} First Lesson Completed
        </Text>

        <Text
          style={{
            color: "white",
            fontSize: 16,
            marginTop: 10,
          }}
        >
          {completed >= 5 ? "✓" : "□"} Five Lessons Completed
        </Text>

        <Text
          style={{
            color: "white",
            fontSize: 16,
            marginTop: 10,
          }}
        >
          {practiceTime !== "00:00:00" ? "✓" : "□"} First Practice Recording
        </Text>
      </View>
    </ScrollView>
  );
}
