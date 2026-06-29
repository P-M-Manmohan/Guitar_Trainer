import {
    Alert,
    ScrollView,
    Text,
    TouchableOpacity,
    View
} from "react-native";

type Chord = {
  id: string;
  name: string;
  category: string;
  difficulty: string;
  description: string;
  fingers: string[];
};

type Props = {
  chord: Chord;
};

export default function ChordDetailScreen({
  chord,
}: Props) {
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
      {/* Title */}

      <Text
        style={{
          color: "white",
          fontSize: 34,
          fontWeight: "bold",
          marginTop: 60,
        }}
      >
        🎸 {chord.name}
      </Text>

      {/* Difficulty */}

      <View
        style={{
          flexDirection: "row",
          marginTop: 12,
        }}
      >
        <Text
          style={{
            color: "#22C55E",
            fontSize: 18,
          }}
        >
          ⭐ {chord.difficulty}
        </Text>

        <Text
          style={{
            color: "#3B82F6",
            fontSize: 18,
            marginLeft: 20,
          }}
        >
          {chord.category}
        </Text>
      </View>

      {/* Description */}

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
            fontSize: 18,
            lineHeight: 28,
          }}
        >
          {chord.description}
        </Text>
      </View>

      {/* Diagram */}

      <View
        style={{
          backgroundColor: "#1F2937",
          padding: 20,
          borderRadius: 15,
          marginTop: 25,
          alignItems: "center",
        }}
      >
        <Text
          style={{
            color: "white",
            fontSize: 22,
            fontWeight: "bold",
          }}
        >
          Chord Diagram
        </Text>

        <View
          style={{
            marginTop: 20,
            width: 220,
            height: 220,
            borderRadius: 12,
            borderWidth: 2,
            borderColor: "#3B82F6",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text
            style={{
              color: "#BBBBBB",
            }}
          >
            Diagram Coming Soon
          </Text>
        </View>
      </View>

      {/* Finger Placement */}

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
            fontSize: 22,
            fontWeight: "bold",
          }}
        >
          Finger Placement
        </Text>

        {chord.fingers.map((finger, index) => (
          <Text
            key={index}
            style={{
              color: "white",
              fontSize: 18,
              marginTop: 12,
            }}
          >
            {index + 1}. {finger}
          </Text>
        ))}
      </View>

      {/* Strings */}

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
            fontSize: 22,
            fontWeight: "bold",
          }}
        >
          Strings to Play
        </Text>

        <Text
          style={{
            color: "white",
            marginTop: 15,
            fontSize: 18,
          }}
        >
          ✓ Play all recommended strings
        </Text>

        <Text
          style={{
            color: "#BBBBBB",
            marginTop: 10,
            fontSize: 16,
          }}
        >
          Avoid muted strings unless specified.
        </Text>
      </View>

      {/* Common Mistakes */}

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
            fontSize: 22,
            fontWeight: "bold",
          }}
        >
          Common Mistakes
        </Text>

        <Text
          style={{
            color: "white",
            marginTop: 15,
          }}
        >
          • Fingers touching nearby strings
        </Text>

        <Text
          style={{
            color: "white",
            marginTop: 10,
          }}
        >
          • Not pressing close enough to the fret
        </Text>

        <Text
          style={{
            color: "white",
            marginTop: 10,
          }}
        >
          • Wrist positioned too low
        </Text>
      </View>

      {/* Buttons */}

      <TouchableOpacity
        onPress={() =>
          Alert.alert(
            "Practice",
            "Practice mode coming soon!"
          )
        }
        style={{
          backgroundColor: "#3B82F6",
          padding: 18,
          borderRadius: 15,
          marginTop: 30,
        }}
      >
        <Text
          style={{
            color: "white",
            textAlign: "center",
            fontSize: 20,
            fontWeight: "bold",
          }}
        >
          ▶ Practice Chord
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() =>
          Alert.alert(
            "AI Hand Placement",
            "Camera feature coming soon!"
          )
        }
        style={{
          backgroundColor: "#22C55E",
          padding: 18,
          borderRadius: 15,
          marginTop: 15,
        }}
      >
        <Text
          style={{
            color: "white",
            textAlign: "center",
            fontSize: 20,
            fontWeight: "bold",
          }}
        >
          📷 Check My Hand
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() =>
          Alert.alert(
            "Audio Analysis",
            "Microphone feature coming soon!"
          )
        }
        style={{
          backgroundColor: "#F59E0B",
          padding: 18,
          borderRadius: 15,
          marginTop: 15,
        }}
      >
        <Text
          style={{
            color: "white",
            textAlign: "center",
            fontSize: 20,
            fontWeight: "bold",
          }}
        >
          🎤 Listen & Compare
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}