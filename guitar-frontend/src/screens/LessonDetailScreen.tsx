import { Text, TouchableOpacity, View } from "react-native";
import { useProgressStore } from "../store/progressStore";

type Props = {
  id: number;
  title: string;
  description: string;
  duration: string;
};

export default function LessonDetailScreen({
  id,
  title,
  description,
  duration,
}: Props) {

  const completeLesson =
    useProgressStore(
      (state) => state.completeLesson
    );

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#121212",
        padding: 20,
      }}
    >
      <Text
        style={{
          color: "white",
          fontSize: 32,
          fontWeight: "bold",
          marginTop: 60,
        }}
      >
        {title}
      </Text>

      <Text
        style={{
          color: "#3B82F6",
          marginTop: 10,
          fontSize: 18,
        }}
      >
        Duration: {duration}
      </Text>

      <Text
        style={{
          color: "#BBBBBB",
          marginTop: 20,
          fontSize: 18,
          lineHeight: 28,
        }}
      >
        {description}
      </Text>

      <Text
        style={{
          color: "white",
          fontSize: 22,
          fontWeight: "bold",
          marginTop: 40,
        }}
      >
        Objectives
      </Text>

      <Text
        style={{
          color: "white",
          marginTop: 15,
          fontSize: 18,
        }}
      >
        ✓ Understand the lesson concepts
      </Text>

      <Text
        style={{
          color: "white",
          marginTop: 10,
          fontSize: 18,
        }}
      >
        ✓ Practice correctly
      </Text>

      <Text
        style={{
          color: "white",
          marginTop: 10,
          fontSize: 18,
        }}
      >
        ✓ Complete the lesson
      </Text>

      <TouchableOpacity
        onPress={() => completeLesson(id)}
        style={{
          backgroundColor: "#22C55E",
          padding: 18,
          borderRadius: 15,
          marginTop: 50,
        }}
      >
        <Text
          style={{
            color: "white",
            textAlign: "center",
            fontSize: 20,
            fontWeight: "bold",
          }}
        >
          Complete Lesson
        </Text>
      </TouchableOpacity>
    </View>
  );
}