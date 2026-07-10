import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

import { SERVER_ERROR, apiGet } from "../services/api";
import { formatDuration } from "../utils/practiceRecordings";

type UserProfile = {
  username?: string;
  practice_time?: number;
  lessons_completed?: number;
  completedLessons?: number;
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
  const loadProfile = useCallback(() => {
    apiGet<UserProfile>("/user/profile")
      .then((response) => {
        setProfile(response);
        setError("");
      })
      .catch(() => setError(SERVER_ERROR));
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const completed =
    profile?.lessons_completed ?? profile?.completedLessons ?? 0;

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
        {profile?.username ? `${profile.username}'s Profile` : "My Profile"}
      </Text>

      <StatCard
        label="Lessons Completed"
        value={error ? SERVER_ERROR : completed}
      />
      <StatCard label="Practice Time" value={error ? SERVER_ERROR : formatDuration(profile?.practice_time || 0)} />

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
    </ScrollView>
  );
}
