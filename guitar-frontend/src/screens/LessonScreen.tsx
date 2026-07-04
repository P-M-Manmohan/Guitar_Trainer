import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, Text, TouchableOpacity } from "react-native";

import { SERVER_ERROR, apiGet } from "../services/api";

type Lesson = {
  id: number;
  title: string;
  description: string;
  duration?: string;
  duration_mins?: number;
  level?: string;
  difficulty?: number | string;
  completed?: boolean;
};

function lessonLevel(lesson: Lesson) {
  if (lesson.level) {
    return lesson.level;
  }
  if (lesson.difficulty === 1 || lesson.difficulty === "Beginner") {
    return "Beginner";
  }
  if (lesson.difficulty === 2 || lesson.difficulty === "Intermediate") {
    return "Intermediate";
  }
  return "Advanced";
}

function LessonCard({
  lesson,
}: {
  lesson: Lesson;
}) {
  return (
    <TouchableOpacity
      onPress={() =>
        router.push({
          pathname: "/lesson/[id]",
          params: {
            id: String(lesson.id),
            title: lesson.title,
            description: lesson.description,
            duration: lesson.duration || `${lesson.duration_mins || 0} min`,
          },
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
        {lesson.completed ? "✓ " : ""}
        {lesson.title}
      </Text>

      <Text
        style={{
          color: "#BBBBBB",
          marginTop: 6,
        }}
      >
        {lesson.description}
      </Text>

      <Text
        style={{
          color: "#3B82F6",
          marginTop: 8,
        }}
      >
        {lesson.duration || `${lesson.duration_mins || 0} min`}
      </Text>
    </TouchableOpacity>
  );
}

export default function LessonScreen() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    apiGet<Lesson[]>("/lessons")
      .then((response) => {
        setLessons(Array.isArray(response) ? response : []);
        setError("");
      })
      .catch(() => setError(SERVER_ERROR));
  }, []);

  const grouped = {
    Beginner: lessons.filter((lesson) => lessonLevel(lesson) === "Beginner"),
    Intermediate: lessons.filter((lesson) => lessonLevel(lesson) === "Intermediate"),
    Advanced: lessons.filter((lesson) => lessonLevel(lesson) === "Advanced"),
  };

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
        Lessons
      </Text>

      {!!error && (
        <Text style={{ color: "#EF4444", marginTop: 20, fontSize: 18 }}>
          {error}
        </Text>
      )}

      {(["Beginner", "Intermediate", "Advanced"] as const).map((level) => (
        <ScrollView key={level} scrollEnabled={false}>
          <Text
            style={{
              color: "white",
              fontSize: 22,
              fontWeight: "bold",
              marginTop: 30,
            }}
          >
            {level}
          </Text>

          {!error &&
            grouped[level].map((lesson) => (
              <LessonCard key={lesson.id} lesson={lesson} />
            ))}
        </ScrollView>
      ))}
    </ScrollView>
  );
}
