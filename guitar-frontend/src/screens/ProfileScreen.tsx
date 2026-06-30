import { ScrollView, Text, View } from "react-native";
import { useProgressStore } from "../store/progressStore";

export default function ProfileScreen() {
  const completedLessons = useProgressStore(
    (state) => state.completedLessons
  );

  const practiceMinutes = useProgressStore(
    (state) => state.practiceMinutes
  );

  const currentStreak = useProgressStore(
    (state) => state.currentStreak
  );

  const completed = completedLessons.length;

  const level =
    completed < 5
      ? "Beginner"
      : completed < 15
      ? "Intermediate"
      : "Advanced";

  const progress =
    level === "Beginner"
      ? (completed / 5) * 100
      : level === "Intermediate"
      ? ((completed - 5) / 10) * 100
      : 100;

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
        👤 My Profile
      </Text>

      {/* Statistics */}

      <View
        style={{
          backgroundColor: "#1F2937",
          borderRadius: 15,
          padding: 20,
          marginTop: 30,
        }}
      >
        <Text style={{ color: "white", fontSize: 18 }}>
          Lessons Completed
        </Text>

        <Text
          style={{
            color: "#3B82F6",
            fontSize: 34,
            fontWeight: "bold",
            marginTop: 8,
          }}
        >
          {completed}
        </Text>
      </View>

      <View
        style={{
          backgroundColor: "#1F2937",
          borderRadius: 15,
          padding: 20,
          marginTop: 20,
        }}
      >
        <Text style={{ color: "white", fontSize: 18 }}>
          Current Streak
        </Text>

        <Text
          style={{
            color: "#3B82F6",
            fontSize: 34,
            fontWeight: "bold",
            marginTop: 8,
          }}
        >
          {currentStreak} Days
        </Text>
      </View>

      <View
        style={{
          backgroundColor: "#1F2937",
          borderRadius: 15,
          padding: 20,
          marginTop: 20,
        }}
      >
        <Text style={{ color: "white", fontSize: 18 }}>
          ⏱ Practice Time
        </Text>

        <Text
          style={{
            color: "#3B82F6",
            fontSize: 34,
            fontWeight: "bold",
            marginTop: 8,
          }}
        >
          {practiceMinutes} min
        </Text>
      </View>

      {/* Level */}

      <View
        style={{
          backgroundColor: "#1F2937",
          borderRadius: 15,
          padding: 20,
          marginTop: 20,
        }}
      >
        <Text style={{ color: "white", fontSize: 18 }}>
          Level
        </Text>

        <Text
          style={{
            color: "#22C55E",
            fontSize: 30,
            fontWeight: "bold",
            marginTop: 10,
          }}
        >
          {level}
        </Text>

        {/* Progress Bar */}

        <View
          style={{
            backgroundColor: "#444",
            height: 12,
            borderRadius: 10,
            marginTop: 18,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              backgroundColor: "#22C55E",
              width: `${progress}%`,
              height: "100%",
            }}
          />
        </View>
      </View>

      {/* Achievements */}

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
          {completed >= 1 ? "✅" : "⬜"} First Lesson Completed
        </Text>

        <Text
          style={{
            color: "white",
            fontSize: 16,
            marginTop: 10,
          }}
        >
          {completed >= 5 ? "✅" : "⬜"} Five Lessons Completed
        </Text>

        <Text
          style={{
            color: "white",
            fontSize: 16,
            marginTop: 10,
          }}
        >
          {practiceMinutes >= 60 ? "✅" : "⬜"} One Hour Practice
        </Text>
      </View>
    </ScrollView>
  );
}