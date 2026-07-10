import * as Linking from "expo-linking";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Switch, Text, TouchableOpacity, View } from "react-native";

import { SERVER_ERROR, apiGet, apiPost } from "../services/api";

type Lesson = { id: number; title: string; description: string; url: string; completed: boolean };

export default function LessonDetailScreen({ id }: { id: number }) {
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiGet<Lesson>(`/lessons/${id}`).then((data) => { setLesson(data); setError(""); }).catch(() => setError(SERVER_ERROR));
  }, [id]);

  const toggleCompleted = async (nextValue: boolean) => {
    if (!lesson || saving) return;
    const previous = lesson.completed;
    setLesson({ ...lesson, completed: nextValue });
    setSaving(true);
    try {
      await apiPost<void>(`/lessons/${lesson.id}/comp`, { complete: nextValue ? 1 : -1 });
    } catch {
      setLesson({ ...lesson, completed: previous });
      setError("Could not update lesson completion.");
    } finally {
      setSaving(false);
    }
  };

  if (!lesson && !error) return <View style={{ flex: 1, backgroundColor: "#121212", justifyContent: "center" }}><ActivityIndicator color="#3B82F6" /></View>;
  if (!lesson) return <View style={{ flex: 1, backgroundColor: "#121212", justifyContent: "center", padding: 24 }}><Text style={{ color: "#EF4444", textAlign: "center" }}>{error}</Text></View>;

  return <ScrollView style={{ flex: 1, backgroundColor: "#121212" }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
    <Text style={{ color: "white", fontSize: 32, fontWeight: "bold", marginTop: 40 }}>{lesson.title}</Text>
    <Text style={{ color: "#BBBBBB", marginTop: 22, fontSize: 18, lineHeight: 28 }}>{lesson.description}</Text>
    <TouchableOpacity onPress={() => Linking.openURL(lesson.url)} style={{ backgroundColor: "#1F2937", padding: 18, borderRadius: 15, marginTop: 28 }}>
      <Text style={{ color: "#60A5FA", fontSize: 17, fontWeight: "600" }}>Open lesson on YouTube ↗</Text>
      <Text style={{ color: "#9CA3AF", marginTop: 8 }} numberOfLines={1}>{lesson.url}</Text>
    </TouchableOpacity>
    <View style={{ backgroundColor: "#1F2937", padding: 18, borderRadius: 15, marginTop: 24, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <View><Text style={{ color: "white", fontSize: 18, fontWeight: "bold" }}>Lesson completed</Text><Text style={{ color: "#BBBBBB", marginTop: 5 }}>{lesson.completed ? "Marked complete" : "Mark when you finish"}</Text></View>
      <Switch value={lesson.completed} onValueChange={toggleCompleted} disabled={saving} trackColor={{ false: "#4B5563", true: "#22C55E" }} />
    </View>
    {!!error && <Text style={{ color: "#EF4444", marginTop: 16 }}>{error}</Text>}
  </ScrollView>;
}
