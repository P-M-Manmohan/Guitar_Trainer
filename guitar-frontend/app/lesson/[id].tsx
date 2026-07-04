import { useLocalSearchParams } from "expo-router";
import { lessons } from "../../src/data/lessons";
import LessonDetailScreen from "../../src/screens/LessonDetailScreen";

export default function LessonPage() {
  const { id, title, description, duration } = useLocalSearchParams();

  const lesson = lessons.find(
    (lesson) => lesson.id === Number(id)
  );

  if (!lesson && !title) {
    return null;
  }

  return (
    <LessonDetailScreen
      id={lesson?.id || Number(id)}
      title={String(title || lesson?.title || "Lesson")}
      description={String(description || lesson?.description || "")}
      duration={String(duration || lesson?.duration || "")}
    />
  );
}
