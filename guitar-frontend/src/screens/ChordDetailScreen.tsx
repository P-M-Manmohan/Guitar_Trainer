import { router } from "expo-router";
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

function ChordDiagram({ position }: { position: ChordPosition }) {
  const width = 220;
  const height = 260;
  const left = 40;
  const top = 42;
  const stringGap = 28;
  const fretGap = 32;
  const frets = [...position.frets].map(fretNumber);
  const positiveFrets = frets.filter((fret) => fret > 0);
  const minimumFret = positiveFrets.length ? Math.min(...positiveFrets) : 1;
  const startFret = minimumFret <= 3 ? 1 : minimumFret;
  const barreFret = position.barres || 0;
  const barreStrings = frets.flatMap((fret, index) =>
    fret === barreFret && position.fingers[index] === "1" ? [index] : []
  );

  return (
    <View
      accessibilityLabel="Chord diagram"
      style={{ width, height, backgroundColor: "white", borderRadius: 12, marginTop: 12 }}
    >
      {Array.from({ length: 6 }, (_, index) => (
        <View key={`string-${index}`} style={{ position: "absolute", left: left + index * stringGap, top, width: 2, height: fretGap * 5, backgroundColor: "#111827" }} />
      ))}
      {Array.from({ length: 6 }, (_, index) => (
        <View key={`fret-${index}`} style={{ position: "absolute", left, top: top + index * fretGap, width: stringGap * 5, height: index === 0 && startFret === 1 ? 4 : 2, backgroundColor: "#111827" }} />
      ))}
      {startFret > 1 && <Text style={{ position: "absolute", left: 9, top: top + 5, color: "#111827", fontWeight: "bold" }}>{startFret}fr</Text>}
      {frets.map((fret, index) => {
        if (fret < 0 || fret === 0) {
          return <Text key={`marker-${index}`} style={{ position: "absolute", left: left + index * stringGap - 6, top: 12, color: "#111827", fontWeight: "bold" }}>{fret === 0 ? "○" : "×"}</Text>;
        }
        if (barreFret === fret && position.fingers[index] === "1") return null;
        const displayedFret = startFret === 1 ? fret : fret - startFret + 1;
        return <View key={`dot-${index}`} style={{ position: "absolute", left: left + index * stringGap - 11, top: top + (displayedFret - 0.5) * fretGap - 11, width: 22, height: 22, borderRadius: 11, backgroundColor: "#111827", justifyContent: "center", alignItems: "center" }}><Text style={{ color: "white", fontSize: 12, fontWeight: "bold" }}>{position.fingers[index] === "0" ? "" : position.fingers[index]}</Text></View>;
      })}
      {barreStrings.length >= 2 && <View style={{ position: "absolute", left: left + Math.min(...barreStrings) * stringGap - 11, top: top + ((startFret === 1 ? barreFret : barreFret - startFret + 1) - 0.5) * fretGap - 11, width: (Math.max(...barreStrings) - Math.min(...barreStrings)) * stringGap + 22, height: 22, borderRadius: 11, backgroundColor: "#111827", justifyContent: "center" }}><Text style={{ color: "white", marginLeft: 7, fontSize: 12, fontWeight: "bold" }}>1</Text></View>}
    </View>
  );
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
          <View style={{ alignItems: "center" }}><ChordDiagram position={position} /></View>
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
