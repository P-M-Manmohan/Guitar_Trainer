import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import { useCallback, useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const BEEP_URI =
  "data:audio/wav;base64,UklGRiQKAABXQVZFZm10IBAAAAABAAEAgD4AAAB9AAACABAAZGF0YQAKAAAAAB4AcgDnAGABugHXAZ4BBwEZAOz+pP11/JD7JPtT+yv8pP2b/9oBHQQUBnUHAwiZBy8G3wPjAJH9TPqC95X10/Rn9VT3cfps/tMCIAfJClANVw6qDUkLawd2Avz8ofcP897vge417/vxj/Z2/AIDcQn2Dt8SoxT4E94QoAvPBDL9rfUq73vqQOjQ6C/sCfK8+WcCBwuPEhEY1BpxGt4WdRDoBzP+d/Tg63/lJOJJ4v/l6exF9gAB2guGFdQc1iAAITgd3BW8CwAAB/Q/6fngP9y1237fPecW8s7+5QvPFxghmCaVJ9wjyhtDEJcCYvRR5/rcpdYl1bzYEeE67dL7JAsuGT4kBSu1LB0pqCBWFJ0FO/b/55vcZdU601nWZt5s6v74ZAjNFoQiJirMLCYqhCLNFmQI/vhs6mbeWdY602XVm9z/5zv2nQVWFKggHSm1LAUrPiQuGSQLyfvt7FPgeNdn05zU89qs5YHz0ALKEaoe6idyLLgr0yV1G9cNmP6D72Div9jB0//Tcdly49TwAAAsD44cjyYBLD8sQSegHX0QaAEp8ovkLdpI1I7TFthW4TbuMP1/DFQaDSVkK5ksiCitHxMTNwTc9NLmwtv71EvT49ZY36rrY/rFCQEYZSObKsYspymaIZQVAgec9zPpfN3a1TTT2tV83TPpnPcCB5QVmiGnKcYsmyplIwEYxQlj+qrrWN/j1kvT+9TC29Lm3PQ3BBMTrR+IKJksZCsNJVQafwww/TbuVuEW2I7TSNQt2ovkLdpI1I7TFthW4TbuMP1/DFQaDSVkK5ksiCitHxMTNwTc9NLmwtv71EvT49ZY36rrY/rFCQEYZSObKsYspymaIZQVAgec9zPpfN3a1TTT2tV83TPpnPcCB5QVmiGnKcYsmyplIwEYxQlj+qrrWN/j1kvT+9TC29Lm3PQ3BBMTrR+IKJksZCsNJVQafwww/TbuVuEW2I7TSNQt2ovkLdpI1I7TFthW4TbuMP1/DFQaDSVkK5ksiCitHxMTNwTc9NLmwtv71EvT49ZY36rrY/rFCQEYZSObKsYspymaIZQVAgec9zPpfN3a1TTT2tV83TPpnPcCB5QVmiGnKcYsmyplIwEYxQlj+qrrWN/j1kvT+9TC29Lm3PQ3BBMTrR+IKJksZCsNJVQafwww/TbuVuEW2I7TFthW4TbuMP1/DFQaDSVkK5ksiCitHxMTNwTc9NLmwtv71EvT49ZY36rrY/rFCQEYZSObKsYspymaIZQVAgec9zPpfN3a1TTT2tV83TPpnPcCB5QVmiGnKcYsmyplIwEYxQlj+qrrWN/j1kvT+9TC29Lm3PQ3BBMTrR+IKJksZCsNJVQafwww/TbuVuEW2I7TFthW4TbuMP1/DFQaDSVkK5ksiCitHxMTNwTc9NLmwtv71EvT49ZY36rrY/rFCQEYZSObKsYspymaIZQVAgec9zPpfN3a1TTT2tV83TPpnPcCB5QVmiGnKcYsmyplIwEYxQlj+qrrWN/j1kvT+9TC29Lm3PQ3BBMTrR+IKJksZCsNJVQafwww/TbuVuEW2I7TFthW4TbuMP1/DFQaDSVkK5ksiCitHxMTNwTc9NLmwtv71EvT49ZY36rrY/rFCQEYZSObKsYspymaIZQVAgec9zPpfN3a1TTT2tV83TPpnPcCB5QVmiGnKcYsmyplIwEYxQlj+qrrWN/j1kvT+9TC29Lm3PQ3BBMTrR+IKJksZCsNJVQafwww/TbuVuEW2I7TFthW4TbuMP1/DFQaDSVkK5ksiCitHxMTNwTc9NLmwtv71EvT49ZY36rrY/rFCQEYZSObKsYspymaIZQVAgec9zPpfN3a1TTT2tV83TPpnPcCB5QVmiGnKcYsmyplIwEYxQlj+qrrWN/j1kvT+9TC29Lm3PQ3BBMTrR+IKJksZCsNJVQafwww/TbuVuEW2I7TFthW4TbuMP1/DFQaDSVkK5ksiCitHxMTNwTc9NLmwtv71EvT49ZY36rrY/rFCQEYZSObKsYspymaIZQVAgec9zPpfN3a1TTT2tV83TPpnPcCB5QVmiGnKcYsmyplIwEYxQlj+qrrWN/j1kvT+9TC29Lm3PQ3BBMTrR+IKJksZCsNJVQafwww/TbuVuEW2I7TFthW4TbuMP1/DFQaDSVkK5ksiCitHxMTNwTc9NLmwtv71EvT49ZY36rrY/rFCQEYZSObKsYspymaIZQVAgec9zPpfN3a1TTT2tV83TPpnPcCB5QVmiGnKcYsmyplIwEYxQlj+qrrWN/j1kvT+9TC29Lm3PQ3BBMTrR+IKJksZCsNJVQafwww/TbuVuEW2I7TFthW4TbuMP1/DFQaDSVkK5ksiCitHxMTNwTc9NLmwtv71EvT49ZY36rrY/rFCQEYZSObKsYspymaIZQVAgec9zPpfN3a1TTT2tV83TPpnPcCB5QVmiGnKcYsmyplIwEYxQlj+qrrWN/j1kvT+9TC29Lm3PQ3BBMTrR+IKJksZCsNJVQafwww/TbuVuEW2I7TFthW4TbuMP1/DFQaDSVkK5ksiCitHxMTNwTc9NLmwtv71EvT49ZY36rrY/rFCQEYZSObKsYspymaIZQVAgec9zPpfN3a1TTT2tV83TPpnPcCB5QVmiGnKcYsmyplIwEYxQlj+qrrWN/j1kvT+9TC29Lm3PQ3BBMTrR+IKK0fExM3BNz00ubC2/vUS9Pj1ljfqutj+sUJARhlI5sqxiynKZohlBUCB5z3M+l83drVNNPa1XzdM+mc9wIHlBWaIacpxiybKmUjARjFCWP6qutY3+PWS9P71MLb0ubc9DcEExOtH4gomSxkKw0lVBp/DDD9Nu5W4RbYjtNI1C3ai+Qp8mgBfRCgHUEnPywBLI8mjhwsDwAA1PBy43HZ/9PB07/YYOKD75j+1w11G9MluCtyLOonqh7KEdACgfOs5fPanNRn03jXU+Dt7Mn7JAsuGT4kBSu1LB0pqCBWFJ0FO/b/55vcZdU601nWZt5s6v74ZAjNFoQiI=";

type Props = {
  visible: boolean;
  onClose: () => void;
  keepPlayingOnClose?: boolean;
  playing?: boolean;
  onPlayingChange?: (playing: boolean) => void;
};

export default function MetronomeModal({
  visible,
  onClose,
  keepPlayingOnClose = false,
  playing,
  onPlayingChange,
}: Props) {
  const [bpm, setBpm] = useState(90);
  const [internalPlaying, setInternalPlaying] = useState(false);
  const [sliderWidth, setSliderWidth] = useState(1);
  const player = useAudioPlayer({ uri: BEEP_URI });
  const active = playing ?? internalPlaying;

  const setActive = (next: boolean) => {
    if (onPlayingChange) {
      onPlayingChange(next);
    } else {
      setInternalPlaying(next);
    }
  };

  const playBeep = useCallback(() => {
    player.seekTo(0).catch(() => {});
    player.play();
  }, [player]);

  const updateBpmFromSlider = (locationX: number) => {
    const ratio = Math.max(0, Math.min(1, locationX / sliderWidth));
    setBpm(Math.round(40 + ratio * 180));
  };

  const close = () => {
    if (!keepPlayingOnClose) {
      setActive(false);
    }
    onClose();
  };

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!active) {
      return;
    }

    playBeep();
    const intervalMs = Math.max(250, 60000 / bpm);
    const id = setInterval(playBeep, intervalMs);

    return () => clearInterval(id);
  }, [active, bpm, playBeep]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={close}
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

          <View style={{ marginTop: 20 }}>
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
                onPress={() => setBpm((value) => Math.max(40, value - 1))}
                style={{
                  backgroundColor: "#374151",
                  padding: 16,
                  borderRadius: 10,
                  minWidth: 80,
                }}
              >
                <Text style={{ color: "white", textAlign: "center" }}>
                  -1
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setBpm((value) => Math.min(220, value + 1))}
                style={{
                  backgroundColor: "#374151",
                  padding: 16,
                  borderRadius: 10,
                  minWidth: 80,
                }}
              >
                <Text style={{ color: "white", textAlign: "center" }}>
                  +1
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => setActive(!active)}
            style={{
              backgroundColor: active ? "#EF4444" : "#22C55E",
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
              {active ? "Pause" : "Play"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={close}
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
