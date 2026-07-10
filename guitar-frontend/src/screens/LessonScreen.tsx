import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, Text, TouchableOpacity } from "react-native";

import { SERVER_ERROR, apiGet } from "../services/api";

type Lesson = {
  id: number;
  title: string;
  description?: string;
  duration?: string;
  duration_mins?: number;
  level?: string;
  difficulty?: number | string;
  completed?: boolean;
};

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

    </TouchableOpacity>
  );
}

export default function LessonScreen() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    apiGet<Lesson[]>("/lessons")
      .then((response) => {
        // The summary API is the single source for this screen. De-duplicate
        // defensively so a repeated row can never create a repeated card.
        const uniqueLessons = Array.isArray(response)
          ? [...new Map(response.map((lesson) => [lesson.id, lesson])).values()]
          : [];
        setLessons(uniqueLessons);
        setError("");
      })
      .catch(() => setError(SERVER_ERROR));
  }, []);

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

      {!error && lessons.map((lesson) => <LessonCard key={lesson.id} lesson={lesson} />)}
    </ScrollView>
  );
}
