import { useLocalSearchParams } from "expo-router";
import { chords } from "../../src/data/chords";
import ChordDetailScreen from "../../src/screens/ChordDetailScreen";

export default function ChordDetailPage() {
  const { id, root, quality, name } = useLocalSearchParams();

  const chord = chords.find(
    (c) => c.id === id
  );

  const fallbackChord =
    chord || {
      id: String(id || root || "C"),
      name: String(name || id || "Chord"),
      category: String(quality || "major"),
      difficulty: "",
      description: "Practice this chord shape.",
      fingers: [],
    };

  return (
    <ChordDetailScreen
      chord={fallbackChord}
      root={String(root || fallbackChord.id.replace("m", ""))}
      quality={String(quality || (fallbackChord.id.includes("m") ? "minor" : "major"))}
    />
  );
}
