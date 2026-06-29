import { router } from "expo-router";
import { ScrollView, Text, TouchableOpacity } from "react-native";
import { lessons } from "../data/lessons";

function LessonCard({
  id,
  title,
  description,
  duration,
  completed,
}: {
  id: number;
  title: string;
  description: string;
  duration: string;
  completed: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={() =>
    router.push({
      pathname: "/lesson/[id]",
      params: { id: String(id) },
    })
  }
      style={{
        backgroundColor: "#1F2937",
        padding: 18,
        borderRadius: 15,
        marginTop: 12,
      }}
    >
      <Text
        style={{
          color: "white",
          fontSize: 18,
          fontWeight: "bold",
        }}
      >
        {completed ? "✅ " : "🎸 "}
        {title}
      </Text>

      <Text
        style={{
          color: "#BBBBBB",
          marginTop: 6,
        }}
      >
        {description}
      </Text>

      <Text
        style={{
          color: "#3B82F6",
          marginTop: 8,
        }}
      >
        {duration}
      </Text>
    </TouchableOpacity>
  );
}

export default function LessonScreen() {
  const beginnerLessons = lessons.filter(
    lesson => lesson.level === "Beginner"
  );

  const intermediateLessons = lessons.filter(
    lesson => lesson.level === "Intermediate"
  );

  const advancedLessons = lessons.filter(
    lesson => lesson.level === "Advanced"
  );

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
          fontSize: 32,
          fontWeight: "bold",
          marginTop: 50,
        }}
      >
        📚 Lessons
      </Text>

      {/* Beginner */}

      <Text
        style={{
          color: "white",
          fontSize: 22,
          fontWeight: "bold",
          marginTop: 30,
        }}
      >
        Beginner
      </Text>

      {beginnerLessons.map(lesson => (
        <LessonCard
          key={lesson.id}
          id={lesson.id}
          title={lesson.title}
          description={lesson.description}
          duration={lesson.duration}
          completed={lesson.completed}
        />
      ))}

      {/* Intermediate */}

      <Text
        style={{
          color: "white",
          fontSize: 22,
          fontWeight: "bold",
          marginTop: 35,
        }}
      >
        Intermediate
      </Text>

      {intermediateLessons.map(lesson => (
        <LessonCard
          key={lesson.id}
          id={lesson.id}
          title={lesson.title}
          description={lesson.description}
          duration={lesson.duration}
          completed={lesson.completed}
        />
      ))}

      {/* Advanced */}

      <Text
        style={{
          color: "white",
          fontSize: 22,
          fontWeight: "bold",
          marginTop: 35,
        }}
      >
        Advanced
      </Text>

      {advancedLessons.map(lesson => (
        <LessonCard
          key={lesson.id}
          id={lesson.id}
          title={lesson.title}
          description={lesson.description}
          duration={lesson.duration}
          completed={lesson.completed}
        />
      ))}
    </ScrollView>
  );
}