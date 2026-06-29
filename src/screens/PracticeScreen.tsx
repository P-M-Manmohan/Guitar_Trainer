import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useProgressStore } from "../store/progressStore";

type PracticeCardProps = {
  emoji: string;
  title: string;
  description: string;
  onPress: () => void;
};

function PracticeCard({
  emoji,
  title,
  description,
  onPress,
}: PracticeCardProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: "#1F2937",
        borderRadius: 15,
        padding: 20,
        marginTop: 18,
      }}
    >
      <Text
        style={{
          color: "white",
          fontSize: 22,
          fontWeight: "bold",
        }}
      >
        {emoji} {title}
      </Text>

      <Text
        style={{
          color: "#BBBBBB",
          marginTop: 8,
          fontSize: 16,
        }}
      >
        {description}
      </Text>
    </TouchableOpacity>
  );
}

export default function PracticeScreen() {
  const practiceMinutes = useProgressStore(
    (state) => state.practiceMinutes
  );

  const addPracticeMinutes = useProgressStore(
    (state) => state.addPracticeMinutes
  );

  const goal = 30;

  const progress = Math.min(
    (practiceMinutes / goal) * 100,
    100
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
      <Text
        style={{
          color: "white",
          fontSize: 34,
          fontWeight: "bold",
          marginTop: 60,
        }}
      >
        🎸 Practice
      </Text>

      {/* Daily Goal */}

      <View
        style={{
          backgroundColor: "#1F2937",
          padding: 20,
          borderRadius: 15,
          marginTop: 30,
        }}
      >
        <Text
          style={{
            color: "white",
            fontSize: 22,
            fontWeight: "bold",
          }}
        >
          Today's Goal
        </Text>

        <Text
          style={{
            color: "#BBBBBB",
            marginTop: 10,
            fontSize: 18,
          }}
        >
          {practiceMinutes} / {goal} Minutes
        </Text>

        <View
          style={{
            backgroundColor: "#444",
            height: 12,
            borderRadius: 8,
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

      <PracticeCard
        emoji="🎯"
        title="Quick Practice"
        description="Add 10 minutes to today's practice."
        onPress={() => addPracticeMinutes(10)}
      />

      <PracticeCard
        emoji="🎼"
        title="Chord Practice"
        description="Practice chords with AI feedback."
        onPress={() =>
          Alert.alert(
            "Coming Soon",
            "Chord Practice will be available in the next version."
          )
        }
      />

      <PracticeCard
        emoji="📷"
        title="Hand Placement"
        description="Check finger positioning using your camera."
        onPress={() =>
          Alert.alert(
            "Coming Soon",
            "Computer vision will be added later."
          )
        }
      />

      <PracticeCard
        emoji="🎤"
        title="Audio Analysis"
        description="Analyze your guitar playing."
        onPress={() =>
          Alert.alert(
            "Coming Soon",
            "Audio analysis will be added later."
          )
        }
      />

      <PracticeCard
        emoji="🎵"
        title="Guitar Tuner"
        description="Tune your guitar."
        onPress={() =>
          Alert.alert(
            "Coming Soon",
            "The tuner will be added later."
          )
        }
      />

      <PracticeCard
        emoji="⏱"
        title="Metronome"
        description="Practice with adjustable BPM."
        onPress={() =>
          Alert.alert(
            "Coming Soon",
            "The metronome will be added later."
          )
        }
      />

      <PracticeCard
        emoji="📈"
        title="Practice History"
        description="Review your previous sessions."
        onPress={() =>
          Alert.alert(
            "Coming Soon",
            "Practice history will be added later."
          )
        }
      />
    </ScrollView>
  );
}