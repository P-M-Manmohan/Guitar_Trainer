import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const CLICK_ASSET = require("../../assets/audio/metronome-click.wav");

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
  const firstPlayer = useAudioPlayer(CLICK_ASSET, {
    downloadFirst: true,
    keepAudioSessionActive: true,
  });
  const secondPlayer = useAudioPlayer(CLICK_ASSET, {
    downloadFirst: true,
    keepAudioSessionActive: true,
  });
  const thirdPlayer = useAudioPlayer(CLICK_ASSET, {
    downloadFirst: true,
    keepAudioSessionActive: true,
  });
  const nextPlayerRef = useRef(0);
  const active = playing ?? internalPlaying;

  const setActive = useCallback(
    (next: boolean) => {
      if (onPlayingChange) {
        onPlayingChange(next);
      } else {
        setInternalPlaying(next);
      }
    },
    [onPlayingChange],
  );

  const playBeep = useCallback(() => {
    const players = [firstPlayer, secondPlayer, thirdPlayer];
    const player = players[nextPlayerRef.current % players.length];
    nextPlayerRef.current += 1;
    player.volume = 1;
    void player
      .seekTo(0)
      .then(() => player.play())
      .catch(() => {});
  }, [firstPlayer, secondPlayer, thirdPlayer]);

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
      allowsRecording: keepPlayingOnClose,
      shouldPlayInBackground: false,
      shouldRouteThroughEarpiece: false,
    }).catch(() => {});
  }, [keepPlayingOnClose]);

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
            borderRadius: 8,
            padding: 20,
          }}
        >
          <Text style={{ color: "white", fontSize: 24, fontWeight: "bold" }}>
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
              style={{ height: 34, justifyContent: "center" }}
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
                  borderRadius: 8,
                  minWidth: 80,
                }}
              >
                <Text style={{ color: "white", textAlign: "center" }}>-1</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setBpm((value) => Math.min(220, value + 1))}
                style={{
                  backgroundColor: "#374151",
                  padding: 16,
                  borderRadius: 8,
                  minWidth: 80,
                }}
              >
                <Text style={{ color: "white", textAlign: "center" }}>+1</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => setActive(!active)}
            style={{
              backgroundColor: active ? "#EF4444" : "#22C55E",
              padding: 16,
              borderRadius: 8,
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
              borderRadius: 8,
              marginTop: 12,
            }}
          >
            <Text style={{ color: "white", textAlign: "center", fontSize: 16 }}>
              Close
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
