import { router } from "expo-router";
import { useState } from "react";
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { chords } from "../data/chords";

export default function ChordLibraryScreen() {
  const [selectedType, setSelectedType] = useState<"Major" | "Minor">("Major");

  const [easyOpen, setEasyOpen] = useState(true);
  const [intermediateOpen, setIntermediateOpen] = useState(false);
  const [hardOpen, setHardOpen] = useState(false);

  const easyChords = chords.filter(
    (chord) =>
      chord.category === selectedType &&
      chord.difficulty === "Easy"
  );

  const intermediateChords = chords.filter(
    (chord) =>
      chord.category === selectedType &&
      chord.difficulty === "Intermediate"
  );

  const hardChords = chords.filter(
    (chord) =>
      chord.category === selectedType &&
      chord.difficulty === "Hard"
  );

  const renderChord = (chord: any) => (
    <TouchableOpacity
      key={chord.id}
      onPress={() => router.push(`/chords/${chord.id}`)}
      style={{
        backgroundColor: "#1F2937",
        padding: 16,
        borderRadius: 12,
        marginTop: 10,
        marginLeft: 12,
      }}
    >
      <Text
        style={{
          color: "white",
          fontSize: 18,
          fontWeight: "600",
        }}
      >
        {chord.name}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={{
        flex: 1,
        backgroundColor: "#121212",
      }}
      contentContainerStyle={{
        padding: 20,
        paddingBottom: 50,
      }}
    >
      <Text
        style={{
          color: "white",
          fontSize: 32,
          fontWeight: "bold",
          marginTop: 50,
          marginBottom: 30,
        }}
      >
        Chord Library
      </Text>

      {/* Major / Minor Selector */}

      <View
        style={{
          flexDirection: "row",
          marginBottom: 30,
        }}
      >
        <TouchableOpacity
          onPress={() => setSelectedType("Major")}
          style={{
            flex: 1,
            padding: 15,
            marginRight: 5,
            borderRadius: 12,
            backgroundColor:
              selectedType === "Major"
                ? "#3B82F6"
                : "#1F2937",
          }}
        >
          <Text
            style={{
              color: "white",
              textAlign: "center",
              fontWeight: "bold",
              fontSize: 18,
            }}
          >
            Major
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setSelectedType("Minor")}
          style={{
            flex: 1,
            padding: 15,
            marginLeft: 5,
            borderRadius: 12,
            backgroundColor:
              selectedType === "Minor"
                ? "#3B82F6"
                : "#1F2937",
          }}
        >
          <Text
            style={{
              color: "white",
              textAlign: "center",
              fontWeight: "bold",
              fontSize: 18,
            }}
          >
            Minor
          </Text>
        </TouchableOpacity>
      </View>

      {/* Easy */}

      <TouchableOpacity
        onPress={() => setEasyOpen(!easyOpen)}
        style={{
          backgroundColor: "#1F2937",
          padding: 18,
          borderRadius: 15,
        }}
      >
        <Text
          style={{
            color: "white",
            fontSize: 20,
            fontWeight: "bold",
          }}
        >
          {easyOpen ? "▼" : "▶"} Easy
        </Text>
      </TouchableOpacity>

      {easyOpen && easyChords.map(renderChord)}

      {/* Intermediate */}

      <TouchableOpacity
        onPress={() => setIntermediateOpen(!intermediateOpen)}
        style={{
          backgroundColor: "#1F2937",
          padding: 18,
          borderRadius: 15,
          marginTop: 20,
        }}
      >
        <Text
          style={{
            color: "white",
            fontSize: 20,
            fontWeight: "bold",
          }}
        >
          {intermediateOpen ? "▼" : "▶"} Intermediate
        </Text>
      </TouchableOpacity>

      {intermediateOpen && intermediateChords.map(renderChord)}

      {/* Hard */}

      <TouchableOpacity
        onPress={() => setHardOpen(!hardOpen)}
        style={{
          backgroundColor: "#1F2937",
          padding: 18,
          borderRadius: 15,
          marginTop: 20,
        }}
      >
        <Text
          style={{
            color: "white",
            fontSize: 20,
            fontWeight: "bold",
          }}
        >
          {hardOpen ? "▼" : "▶"} Hard
        </Text>
      </TouchableOpacity>

      {hardOpen && hardChords.map(renderChord)}
    </ScrollView>
  );
}