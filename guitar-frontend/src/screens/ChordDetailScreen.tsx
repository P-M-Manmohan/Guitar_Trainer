import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { SERVER_ERROR, apiGet } from "../services/api";
import type { ExpectedFingering } from "../services/practiceAnalysis";

type Chord = {
  id: string;
  name: string;
  category: string;
  difficulty: string;
  description: string;
  fingers: string[];
};

type ChordPosition = {
  position_index?: number;
  frets?: string;
  fingers?: string;
  barres?: number | null;
  capo?: boolean;
};

type Props = {
  chord: Chord;
  root: string;
  quality: string;
};

function linesFromChordResponse(response: any): string[] {
  if (Array.isArray(response)) {
    return response.map(String);
  }

  if (Array.isArray(response?.positions)) {
    return response.positions.map((position: ChordPosition, index: number) => {
      const parts = [
        `Position ${position.position_index ?? index + 1}`,
        position.frets ? `Frets: ${position.frets}` : "",
        position.fingers ? `Fingers: ${position.fingers}` : "",
        position.barres ? `Barre: ${position.barres}` : "",
        position.capo ? "Capo required" : "",
      ].filter(Boolean);
      return parts.join(" | ");
    });
  }

  if (response?.fingers && Array.isArray(response.fingers)) {
    return response.fingers.map(String);
  }

  if (typeof response?.fingerPlacement === "string") {
    return [response.fingerPlacement];
  }

  return [];
}

function diagramSource(response: any) {
  const value =
    response?.image ||
    response?.diagram ||
    response?.diagramUrl ||
    response?.url;

  if (typeof value === "string" && value.length > 0) {
    return { uri: value };
  }

  return null;
}

const FINGER_NAMES: Record<string, string> = {
  "1": "index",
  "2": "middle",
  "3": "ring",
  "4": "pinky",
  T: "thumb",
};

function fretNumber(value: string) {
  if (/\d/.test(value)) {
    return Number(value);
  }
  if (/^[a-z]$/i.test(value)) {
    return value.toLowerCase().charCodeAt(0) - 87;
  }
  return -1;
}

function expectedFingeringsFromResponse(response: any): ExpectedFingering[] {
  if (!Array.isArray(response?.positions)) {
    return [];
  }

  return response.positions.flatMap((position: ChordPosition) => {
    const frets = position.frets || "";
    const fingers = position.fingers || "";
    const expected: ExpectedFingering = {};

    for (let index = 0; index < Math.min(6, frets.length, fingers.length); index += 1) {
      const finger = FINGER_NAMES[fingers[index]?.toUpperCase()];
      const fret = fretNumber(frets[index]);
      if (finger && fret > 0) {
        // Backend shapes run low E to high E; guitar string numbers run 6 to 1.
        expected[finger] = { string: 6 - index, fret };
      }
    }

    return Object.keys(expected).length > 0 ? [expected] : [];
  });
}

function targetChordName(root: string, quality: string) {
  if (quality === "minor") {
    return `${root}m`;
  }
  if (quality === "diminished") {
    return `${root}dim`;
  }
  return root;
}

export default function ChordDetailScreen({
  chord,
  root,
  quality,
}: Props) {
  const [diagram, setDiagram] = useState<any>(null);
  const [diagramError, setDiagramError] = useState("");
  const [fingerLines, setFingerLines] = useState<string[]>(chord.fingers || []);
  const [fingerError, setFingerError] = useState("");
  const [expectedFingerings, setExpectedFingerings] = useState<ExpectedFingering[]>([]);
  const [loadingFingering, setLoadingFingering] = useState(true);

  useEffect(() => {
    let active = true;

    apiGet(`/chord/diagram/${encodeURIComponent(root)}/${quality}`)
      .then((response) => {
        if (active) {
          setDiagram(diagramSource(response));
          setDiagramError("");
        }
      })
      .catch(() => {
        if (active) {
          setDiagramError(SERVER_ERROR);
        }
      });

    setLoadingFingering(true);
    apiGet(`/chords/${encodeURIComponent(root)}/${quality}`)
      .then((response) => {
        if (active) {
          const nextLines = linesFromChordResponse(response);
          setFingerLines(nextLines.length ? nextLines : chord.fingers || []);
          setExpectedFingerings(expectedFingeringsFromResponse(response));
          setFingerError("");
          setLoadingFingering(false);
        }
      })
      .catch(() => {
        if (active) {
          setExpectedFingerings([]);
          setFingerError(SERVER_ERROR);
          setLoadingFingering(false);
        }
      });

    return () => {
      active = false;
    };
  }, [chord.fingers, quality, root]);

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
        {chord.name}
      </Text>

      <View
        style={{
          flexDirection: "row",
          marginTop: 12,
        }}
      >
        {!!chord.difficulty && (
          <Text
            style={{
              color: "#22C55E",
              fontSize: 18,
            }}
          >
            {chord.difficulty}
          </Text>
        )}

        <Text
          style={{
            color: "#3B82F6",
            fontSize: 18,
            marginLeft: chord.difficulty ? 20 : 0,
          }}
        >
          {quality}
        </Text>
      </View>

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
            overflow: "hidden",
          }}
        >
          {diagram ? (
            <Image
              source={diagram}
              style={{ width: "100%", height: "100%" }}
              resizeMode="contain"
            />
          ) : (
            <Text
              style={{
                color: diagramError ? "#EF4444" : "#BBBBBB",
                textAlign: "center",
              }}
            >
              {diagramError || "Diagram Coming Soon"}
            </Text>
          )}
        </View>
      </View>

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

        {!!fingerError && (
          <Text style={{ color: "#EF4444", fontSize: 18, marginTop: 12 }}>
            {fingerError}
          </Text>
        )}

        {!fingerError &&
          fingerLines.map((finger, index) => (
            <Text
              key={`${finger}-${index}`}
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

      <TouchableOpacity
        onPress={() =>
          router.push({
            pathname: "/practice-session",
            params: {
              source: `${chord.name} Practice`,
              targetChord: targetChordName(root, quality),
              expectedFingerings: JSON.stringify(expectedFingerings),
              fingerInstruction: fingerLines.join(" "),
            },
          })
        }
        disabled={loadingFingering || expectedFingerings.length === 0}
        style={{
          backgroundColor:
            loadingFingering || expectedFingerings.length === 0
              ? "#4B5563"
              : "#3B82F6",
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
          {loadingFingering ? "Loading Chord..." : "Practice Chord"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
