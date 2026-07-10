import { useLocalSearchParams } from "expo-router";
import ChordDetailScreen from "../../src/screens/ChordDetailScreen";

export default function ChordDetailPage() {
  const { id, root, quality, name } = useLocalSearchParams();

  const chordId = String(id || root || "C");
  const selectedQuality = String(
    quality || (chordId.toLowerCase().includes("m") ? "minor" : "major")
  );
  const selectedRoot = String(root || chordId.match(/^([A-G](?:#|b)?)/)?.[1] || "C");
  const chord = {
    id: chordId,
    name: String(name || id || "Chord"),
    category: selectedQuality,
    difficulty: "",
    description: "Practice this chord shape.",
    fingers: [],
  };

  return (
    <ChordDetailScreen
      chord={chord}
      root={selectedRoot}
      quality={selectedQuality}
    />
  );
}
