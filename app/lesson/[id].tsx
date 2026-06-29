import { useLocalSearchParams } from "expo-router";
import { lessons } from "../../src/data/lessons";
import LessonDetailScreen from "../../src/screens/LessonDetailScreen";

export default function LessonPage() {
  const { id } = useLocalSearchParams();

  const lesson = lessons.find(
    (lesson) => lesson.id === Number(id)
  );

  if (!lesson) {
    return null;
  }

  return (
    <LessonDetailScreen
      id={lesson.id}
      title={lesson.title}
      description={lesson.description}
      duration={lesson.duration}
    />
  );
}