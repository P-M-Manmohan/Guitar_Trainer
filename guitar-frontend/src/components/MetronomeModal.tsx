import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function MetronomeModal({
  visible,
  onClose,
}: Props) {
  const [bpm, setBpm] = useState(90);
  const [playing, setPlaying] = useState(false);
  const [sliderWidth, setSliderWidth] = useState(1);

  const updateBpmFromSlider = (locationX: number) => {
    const ratio = Math.max(0, Math.min(1, locationX / sliderWidth));
    setBpm(Math.round(40 + ratio * 180));
  };

  useEffect(() => {
    if (!visible || !playing) {
      return;
    }

    const intervalMs = Math.max(250, 60000 / bpm);
    const id = setInterval(() => {
      Vibration.vibrate(35);
    }, intervalMs);

    return () => clearInterval(id);
  }, [bpm, playing, visible]);

  useEffect(() => {
    if (!visible) {
      setPlaying(false);
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.65)",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <View
          style={{
            backgroundColor: "#1F2937",
            borderRadius: 15,
            padding: 20,
          }}
        >
          <Text
            style={{
              color: "white",
              fontSize: 24,
              fontWeight: "bold",
            }}
          >
            Metronome
          </Text>

          <Text
            style={{
              color: "#3B82F6",
              fontSize: 44,
              fontWeight: "bold",
              textAlign: "center",
              marginTop: 20,
            }}
          >
            {bpm} BPM
          </Text>

          <View
            style={{
              marginTop: 20,
            }}
          >
            <Pressable
              onLayout={(event) => setSliderWidth(event.nativeEvent.layout.width)}
              onPress={(event) => updateBpmFromSlider(event.nativeEvent.locationX)}
              style={{
                height: 34,
                justifyContent: "center",
              }}
            >
              <View
                style={{
                  height: 8,
                  borderRadius: 8,
                  backgroundColor: "#374151",
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    width: `${((bpm - 40) / 180) * 100}%`,
                    height: "100%",
                    backgroundColor: "#3B82F6",
                  }}
                />
              </View>
            </Pressable>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginTop: 14,
              }}
            >
            <TouchableOpacity
              onPress={() => setBpm((value) => Math.max(40, value - 5))}
              style={{
                backgroundColor: "#374151",
                padding: 16,
                borderRadius: 10,
                minWidth: 80,
              }}
            >
              <Text style={{ color: "white", textAlign: "center" }}>
                -5
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setBpm((value) => Math.min(220, value + 5))}
              style={{
                backgroundColor: "#374151",
                padding: 16,
                borderRadius: 10,
                minWidth: 80,
              }}
            >
              <Text style={{ color: "white", textAlign: "center" }}>
                +5
              </Text>
            </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => setPlaying((value) => !value)}
            style={{
              backgroundColor: playing ? "#EF4444" : "#22C55E",
              padding: 16,
              borderRadius: 12,
              marginTop: 24,
            }}
          >
            <Text
              style={{
                color: "white",
                textAlign: "center",
                fontSize: 18,
                fontWeight: "bold",
              }}
            >
              {playing ? "Pause" : "Play"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onClose}
            style={{
              backgroundColor: "#111827",
              padding: 14,
              borderRadius: 12,
              marginTop: 12,
            }}
          >
            <Text
              style={{
                color: "white",
                textAlign: "center",
                fontSize: 16,
              }}
            >
              Close
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
