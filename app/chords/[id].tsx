import { useLocalSearchParams } from "expo-router";
import { chords } from "../../src/data/chords";
import ChordDetailScreen from "../../src/screens/ChordDetailScreen";

export default function ChordDetailPage() {
  const { id } = useLocalSearchParams();

  const chord = chords.find(
    (c) => c.id === id
  );

  if (!chord) return null;

  return <ChordDetailScreen chord={chord} />;
}