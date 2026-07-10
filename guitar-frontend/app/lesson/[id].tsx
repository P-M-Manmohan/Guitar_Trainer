import { useLocalSearchParams } from "expo-router";
import LessonDetailScreen from "../../src/screens/LessonDetailScreen";

export default function LessonPage() {
  const { id } = useLocalSearchParams();
  return <LessonDetailScreen id={Number(id)} />;
}
