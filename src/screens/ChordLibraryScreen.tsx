import { router } from "expo-router";
import { ScrollView, Text, TouchableOpacity } from "react-native";
import { chords } from "../data/chords";

export default function ChordLibraryScreen() {
  return (
    <ScrollView
      style={{
        flex: 1,
        backgroundColor: "#121212",
      }}
      contentContainerStyle={{
        padding: 20,
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
        🎸 Chord Library
      </Text>

      {chords.map((chord) => (
        <TouchableOpacity
          key={chord.id}
          onPress={() =>
            router.push({
              pathname: "/chords/[id]",
              params: { id: chord.id },
            })
          }
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
            }}
          >
            {chord.name}
          </Text>

          <Text
            style={{
              color: "#BBBBBB",
              marginTop: 6,
            }}
          >
            {chord.category}
          </Text>

          <Text
            style={{
              color: "#3B82F6",
              marginTop: 6,
            }}
          >
            {chord.difficulty}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}