import { CameraView, useCameraPermissions } from "expo-camera";
import { useEffect } from "react";
import { SafeAreaView, Text, TouchableOpacity } from "react-native";

export default function PracticeRecordingScreen() {
  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  if (!permission) {
    return null;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: "#121212",
          justifyContent: "center",
          alignItems: "center",
          padding: 20,
        }}
      >
        <Text
          style={{
            color: "white",
            fontSize: 22,
            marginBottom: 25,
            textAlign: "center",
          }}
        >
          Camera permission is required.
        </Text>

        <TouchableOpacity
          onPress={requestPermission}
          style={{
            backgroundColor: "#3B82F6",
            paddingVertical: 15,
            paddingHorizontal: 30,
            borderRadius: 15,
          }}
        >
          <Text
            style={{
              color: "white",
              fontSize: 18,
              fontWeight: "bold",
            }}
          >
            Allow Camera
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: "#121212",
      }}
    >
      <CameraView
        style={{
          flex: 1,
        }}
        facing="front"
        mode="video"
      />
    </SafeAreaView>
  );
}