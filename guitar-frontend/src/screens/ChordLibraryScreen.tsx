import { Picker } from "@react-native-picker/picker";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { getChord } from "../services/chordService";

const scales = [
  "A",
  "A#",
  "B",
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
];

const chordTypes = [
  "Major",
  "Minor",
];

export default function ChordLibraryScreen() {
  const router = useRouter();

  const [scale, setScale] = useState(scales[0]);
  const [type, setType] = useState(chordTypes[0]);

  const searchChord = async () => {
    try {
      const chord = await getChord(scale, type);

      console.log(chord);

      /*
       Example:

       If backend returns:
       {
         route: "/chords/c-major"
       }

       Uncomment this:

       router.push(chord.route);
      */

      Alert.alert(
        "Success",
        `Received ${JSON.stringify(chord)}`
      );

    } catch (error) {
      Alert.alert(
        "Error",
        "Unable to find the requested chord."
      );
    }
  };

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
          fontSize: 30,
          fontWeight: "bold",
          marginTop: 60,
          marginBottom: 30,
        }}
      >
        Chord Library
      </Text>

      {/* Scale */}

      <Text
        style={{
          color: "white",
          fontSize: 18,
          marginBottom: 8,
        }}
      >
        Scale
      </Text>

      <View
        style={{
          backgroundColor: "#1F2937",
          borderRadius: 12,
          marginBottom: 25,
        }}
      >
        <Picker
          selectedValue={scale}
          onValueChange={(value) => setScale(value)}
          dropdownIconColor="white"
          style={{
            color: "white",
          }}
        >
          {scales.map((scale) => (
            <Picker.Item
              key={scale}
              label={scale}
              value={scale}
            />
          ))}
        </Picker>
      </View>

      {/* Type */}

      <Text
        style={{
          color: "white",
          fontSize: 18,
          marginBottom: 8,
        }}
      >
        Type
      </Text>

      <View
        style={{
          backgroundColor: "#1F2937",
          borderRadius: 12,
          marginBottom: 40,
        }}
      >
        <Picker
          selectedValue={type}
          onValueChange={(value) => setType(value)}
          dropdownIconColor="white"
          style={{
            color: "white",
          }}
        >
          {chordTypes.map((type) => (
            <Picker.Item
              key={type}
              label={type}
              value={type}
            />
          ))}
        </Picker>
      </View>

      {/* Search Button */}

      <TouchableOpacity
        onPress={searchChord}
        style={{
          backgroundColor: "#3B82F6",
          padding: 18,
          borderRadius: 12,
        }}
      >
        <Text
          style={{
            color: "white",
            fontSize: 20,
            fontWeight: "bold",
            textAlign: "center",
          }}
        >
          Search Chord
        </Text>
      </TouchableOpacity>
    </View>
  );
}