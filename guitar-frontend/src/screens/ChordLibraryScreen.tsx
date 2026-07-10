
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";


import {
  SERVER_ERROR,
  apiGet,
  qualityToPath,
} from "../services/api";

const SCALES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const QUALITIES = ["Maj", "Min"] as const;

type ChordQuality = (typeof QUALITIES)[number];

type BackendChord = {
  degree?: string;
  symbol?: string;
  name?: string;
  quality?: string;
  notes?: string[];
};

function chordRoute(chord: BackendChord, fallbackRoot: string) {
  const symbol = chord.symbol || fallbackRoot;
  const root = symbol.match(/^([A-G](?:#|b)?)/)?.[1] || fallbackRoot;
  const backendQuality = (chord.quality || "major").toLowerCase();
  const quality = backendQuality.includes("diminished")
    ? "diminished"
    : backendQuality.includes("minor")
      ? "minor"
      : "major";

  return { symbol, root, quality };
}

function Selector({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <View style={{ flex: 1 }}>
      <Text style={{ color: "#BBBBBB", marginBottom: 8 }}>
        {label}
      </Text>

      <TouchableOpacity
        onPress={() => setOpen(true)}
        style={{
          backgroundColor: "#1F2937",
          borderRadius: 12,
          padding: 14,
        }}
      >
        <Text style={{ color: "white", fontSize: 16 }}>
          {value} ▼
        </Text>
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.65)",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <View
            style={{
              backgroundColor: "#1F2937",
              borderRadius: 15,
              padding: 14,
            }}
          >
            {options.map((option) => (
              <TouchableOpacity
                key={option}
                onPress={() => {
                  onChange(option);
                  setOpen(false);
                }}
                style={{
                  padding: 14,
                  borderRadius: 10,
                  backgroundColor: option === value ? "#3B82F6" : "transparent",
                }}
              >
                <Text style={{ color: "white", fontSize: 18 }}>
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default function ChordLibraryScreen() {
  const [scale, setScale] = useState("C");
  const [quality, setQuality] = useState<ChordQuality>("Maj");
  const [chords, setChords] = useState<BackendChord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const searchChords = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiGet<{ chords?: BackendChord[] }>(
        `/scales/${encodeURIComponent(scale)}/${qualityToPath(quality)}`
      );
      setChords(response.chords || []);
    } catch {
      setChords([]);
      setError(SERVER_ERROR);
    } finally {
      setLoading(false);

    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#121212" }}
      contentContainerStyle={{

        padding: 20,
      }}
    >
      <Text
        style={{
          color: "white",
          fontSize: 30,
          fontWeight: "bold",
          marginTop: 60,
          marginBottom: 30,
        }}
      >
        Chord Library
      </Text>


      <View
        style={{
          flexDirection: "row",
          gap: 10,
          alignItems: "flex-end",
        }}
      >
        <Selector
          label="Scale"
          value={scale}
          options={SCALES}
          onChange={setScale}
        />

        <Selector
          label="Chord Quality"
          value={quality}
          options={QUALITIES}
          onChange={(value) => setQuality(value as ChordQuality)}
        />

        <TouchableOpacity
          onPress={searchChords}
          style={{
            backgroundColor: "#3B82F6",
            width: 52,
            height: 52,
            borderRadius: 14,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="search" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <Text
        style={{
          color: "white",
          fontSize: 22,
          fontWeight: "bold",
          marginTop: 32,
        }}
      >
        Available Chords
      </Text>

      {loading && (
        <Text style={{ color: "#BBBBBB", marginTop: 16 }}>
          Loading...
        </Text>
      )}

      {!!error && (
        <Text style={{ color: "#EF4444", marginTop: 16 }}>
          {error}
        </Text>
      )}

      {!loading && !error && chords.length === 0 && (
        <Text style={{ color: "#BBBBBB", marginTop: 16 }}>
          Choose a scale and quality, then press search.
        </Text>
      )}

      {chords.map((chord, index) => {
        const { symbol, root, quality: chordQuality } = chordRoute(chord, scale);
        const name = chord.name || symbol;
        return (
          <TouchableOpacity
            key={`${symbol}-${index}`}
            onPress={() =>
              router.push({
                pathname: "/chords/[id]",
                params: {
                  id: symbol,
                  root,
                  quality: chordQuality,
                  name,
                },
              })
            }
            style={{
              backgroundColor: "#1F2937",
              padding: 16,
              borderRadius: 12,
              marginTop: 12,
            }}
          >
            <Text
              style={{
                color: "white",
                fontSize: 18,
                fontWeight: "600",
              }}
            >
              {name}
            </Text>

            {!!chord.notes?.length && (
              <Text style={{ color: "#BBBBBB", marginTop: 6 }}>
                {chord.notes.join(" • ")}
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>

  );
}
