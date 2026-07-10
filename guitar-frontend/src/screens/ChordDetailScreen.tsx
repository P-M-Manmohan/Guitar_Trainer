import { router } from "expo-router";
import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { Dimensions, ScrollView, Text, TouchableOpacity, View } from "react-native";

import { SERVER_ERROR, apiGet } from "../services/api";
import type { ExpectedFingering } from "../services/practiceAnalysis";

type Chord = { id: string; name: string; category: string; difficulty: string; description: string; fingers: string[] };
type ChordPosition = { position_index?: number; frets: string; fingers: string; barres?: number | null; capo?: boolean; diagram: string };
type ChordResponse = { positions?: ChordPosition[] };
type Props = { chord: Chord; root: string; quality: string };

const FINGER_NAMES: Record<string, string> = { "1": "index", "2": "middle", "3": "ring", "4": "pinky", T: "thumb" };
const pageWidth = Dimensions.get("window").width - 40;

function fretNumber(value: string) {
  if (/\d/.test(value)) return Number(value);
  if (/^[a-z]$/i.test(value)) return value.toLowerCase().charCodeAt(0) - 87;
  return -1;
}

function diagramUri(svg: string) {
  if (!svg) return undefined;
  if (/^(https?:|data:)/.test(svg)) return svg;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function placementLines(position: ChordPosition) {
  const placements: string[] = [];
  for (let index = 0; index < Math.min(6, position.frets.length, position.fingers.length); index += 1) {
    const fingerNumber = position.fingers[index]?.toUpperCase();
    const fingerName = FINGER_NAMES[fingerNumber];
    const fret = fretNumber(position.frets[index]);
    if (fingerName && fret > 0) placements.push(`Finger ${fingerNumber} (${fingerName}) on fret ${fret}, string ${6 - index}`);
  }
  if (position.barres) placements.push(`Barre with finger 1 (index) across fret ${position.barres}`);
  const openStrings = [...position.frets].flatMap((fret, index) => fret === "0" ? [`Play string ${6 - index} open`] : []);
  const mutedStrings = [...position.frets].flatMap((fret, index) => /x/i.test(fret) ? [`Mute string ${6 - index}`] : []);
  return [...placements, ...openStrings, ...mutedStrings];
}

function expectedFingering(position: ChordPosition): ExpectedFingering {
  const expected: ExpectedFingering = {};
  for (let index = 0; index < Math.min(6, position.frets.length, position.fingers.length); index += 1) {
    const finger = FINGER_NAMES[position.fingers[index]?.toUpperCase()];
    const fret = fretNumber(position.frets[index]);
    if (finger && fret > 0) expected[finger] = { string: 6 - index, fret };
  }
  return expected;
}

function targetChordName(root: string, quality: string) {
  if (quality === "minor") return `${root}m`;
  if (quality === "diminished") return `${root}dim`;
  return root;
}

export default function ChordDetailScreen({ chord, root, quality }: Props) {
  const [positions, setPositions] = useState<ChordPosition[]>([]);
  const [activePosition, setActivePosition] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiGet<ChordResponse>(`/chords/${encodeURIComponent(root)}/${encodeURIComponent(quality)}`)
      .then((response) => {
        if (!active) return;
        setPositions(Array.isArray(response.positions) ? response.positions : []);
        setActivePosition(0);
        setError("");
      })
      .catch(() => active && setError(SERVER_ERROR))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [quality, root]);

  const activeLines = positions[activePosition] ? placementLines(positions[activePosition]) : [];
  const expectedFingerings = positions.map(expectedFingering).filter((item) => Object.keys(item).length > 0);

  return <ScrollView style={{ flex: 1, backgroundColor: "#121212" }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
    <Text style={{ color: "white", fontSize: 34, fontWeight: "bold", marginTop: 40 }}>{chord.name}</Text>
    <Text style={{ color: "#3B82F6", fontSize: 18, marginTop: 12 }}>{quality}</Text>
    <Text style={{ color: "#BBBBBB", fontSize: 18, lineHeight: 28, marginTop: 18 }}>{chord.description}</Text>

    {!!error && <Text style={{ color: "#EF4444", fontSize: 18, marginTop: 24 }}>{error}</Text>}
    {loading && <Text style={{ color: "#BBBBBB", fontSize: 18, marginTop: 24 }}>Loading chord shapes...</Text>}
    {!loading && !error && positions.length === 0 && <Text style={{ color: "#BBBBBB", fontSize: 18, marginTop: 24 }}>No chord shapes are available yet.</Text>}

    {positions.length > 0 && <>
      <Text style={{ color: "white", fontSize: 22, fontWeight: "bold", marginTop: 28 }}>Chord Shapes</Text>
      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={(event) => setActivePosition(Math.round(event.nativeEvent.contentOffset.x / pageWidth))} style={{ marginTop: 14 }}>
        {positions.map((position, index) => <View key={`${position.position_index ?? index}-${position.frets}`} style={{ width: pageWidth, backgroundColor: "#1F2937", borderRadius: 15, padding: 20 }}>
          <Text style={{ color: "white", textAlign: "center", fontSize: 18, fontWeight: "bold" }}>Position {index + 1}</Text>
          <Image source={diagramUri(position.diagram)} contentFit="contain" style={{ width: "100%", height: 280, marginTop: 12 }} accessibilityLabel={`${chord.name} chord diagram, position ${index + 1}`} />
          <Text style={{ color: "white", fontSize: 20, fontWeight: "bold", marginTop: 8 }}>Finger placement</Text>
          {placementLines(position).map((line) => <Text key={line} style={{ color: "#E5E7EB", fontSize: 16, lineHeight: 24, marginTop: 8 }}>• {line}</Text>)}
          {!!position.capo && <Text style={{ color: "#FBBF24", marginTop: 12 }}>Capo required</Text>}
        </View>)}
      </ScrollView>
      <Text style={{ color: "#BBBBBB", textAlign: "center", marginTop: 12 }}>Swipe for another shape · {activePosition + 1} of {positions.length}</Text>
    </>}

    <TouchableOpacity disabled={loading || expectedFingerings.length === 0} onPress={() => router.push({ pathname: "/practice-session", params: { source: `${chord.name} Practice`, targetChord: targetChordName(root, quality), expectedFingerings: JSON.stringify(expectedFingerings), fingerInstruction: activeLines.join(". ") } })} style={{ backgroundColor: loading || expectedFingerings.length === 0 ? "#4B5563" : "#3B82F6", padding: 18, borderRadius: 15, marginTop: 30 }}>
      <Text style={{ color: "white", textAlign: "center", fontSize: 20, fontWeight: "bold" }}>{loading ? "Loading Chord..." : "Practice Chord"}</Text>
    </TouchableOpacity>
  </ScrollView>;
}
