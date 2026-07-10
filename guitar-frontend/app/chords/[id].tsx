import { useLocalSearchParams } from "expo-router";
import { chords } from "../../src/data/chords";
import ChordDetailScreen from "../../src/screens/ChordDetailScreen";

export default function ChordDetailPage() {
  const { id, root, quality, name } = useLocalSearchParams();
  const chordId = String(id || root || "C");

  const localChord = chords.find((chord) => String(chord.id) === chordId);

  const detailChord = {
    id: chordId,
    name: String(name || localChord?.name || id || "Chord"),
    category: String(quality || localChord?.type || "major"),
    difficulty: "",
    description: "Practice this chord shape.",
    fingers: [],
  };

  return (
    <ChordDetailScreen
      chord={detailChord}
      root={String(root || localChord?.scale || chordId.replace("m", ""))}
      quality={String(
        quality || localChord?.type.toLowerCase() || (chordId.includes("m") ? "minor" : "major"),
      )}
    />
  );
}
