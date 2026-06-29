import { router } from "expo-router";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import HomeButton from "../components/HomeButton";
import { useProgressStore } from "../store/progressStore";

export default function HomeScreen() {
  const completedLessons =
  useProgressStore(
    (state) => state.completedLessons
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
        🎸 Guitar Coach
      </Text>

      <Text
        style={{
          color: "#BBBBBB",
          fontSize: 18,
          marginTop: 10,
        }}
      >
        Ready to practice today?
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
      color: "white",
      fontSize: 20,
      fontWeight: "bold",
    }}
  >
    Progress
  </Text>

  <Text
    style={{
      color: "#BBBBBB",
      marginTop: 10,
      fontSize: 16,
    }}
  >
    Lessons Completed: {completedLessons.length}
  </Text>
</View>
      </Text>

      {/* Progress Card */}

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
          Today's Practice
        </Text>

        <Text
          style={{
            color: "#3B82F6",
            fontSize: 40,
            fontWeight: "bold",
            marginTop: 10,
          }}
        >
          0 min
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

      {/* Start Practice Button */}

      <TouchableOpacity
      onPress={() => router.push("/practice")}
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
  title="📚 Lessons"
  onPress={() => router.push("/lessons")}
/>
<HomeButton title="🎵 Chords" />
<HomeButton
  title="📈 Progress"
  onPress={() => router.push("/profile")}
/>
<HomeButton title="🎸 Tuner" />

      {/* Recent Activity */}

      <Text
        style={{
          color: "white",
          fontSize: 22,
          fontWeight: "bold",
          marginTop: 35,
        }}
      >
        Recent Activity
      </Text>

      <View
        style={{
          backgroundColor: "#1F2937",
          padding: 20,
          borderRadius: 15,
          marginTop: 15,
        }}
      >
        <Text
          style={{
            color: "white",
          }}
        >
          ✓ Learned G Major
        </Text>

        <Text
          style={{
            color: "white",
            marginTop: 10,
          }}
        >
          ✓ Practiced 12 minutes
        </Text>

        <Text
          style={{
            color: "white",
            marginTop: 10,
          }}
        >
          ✓ Completed Lesson 1
        </Text>
      </View>
    </ScrollView>
  );
}