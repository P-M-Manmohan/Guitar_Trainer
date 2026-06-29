import { Text, TouchableOpacity } from "react-native";

type Props = {
  title: string;
  onPress?: () => void;
};

export default function HomeButton({
  title,
  onPress,
}: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: "#1F2937",
        padding: 20,
        borderRadius: 15,
        marginTop: 15,
      }}
    >
      <Text
        style={{
          color: "white",
          textAlign: "center",
          fontSize: 18,
        }}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}