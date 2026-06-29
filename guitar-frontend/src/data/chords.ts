import AMinor from "../assets/chords/A_minor.png";
import CMajor from "../assets/chords/C_major.png";
import DMajor from "../assets/chords/D_major.png";
import EMajor from "../assets/chords/E_major.png";
import GMajor from "../assets/chords/G_major.png";
export const chords = [
  {
    id: "C",
    name: "C Major",
    category: "Major",
    difficulty: "Beginner",

    diagram: CMajor,

    description:
      "One of the first chords every guitarist learns.",

    fingers: [
      "1st fret - String 2",
      "2nd fret - String 4",
      "3rd fret - String 5",
    ],
  },

  {
    id: "G",
    name: "G Major",
    category: "Major",
    difficulty: "Beginner",

    diagram: GMajor,

    description:
      "Bright sounding chord used in thousands of songs.",

    fingers: [
      "3rd fret - String 6",
      "2nd fret - String 5",
      "3rd fret - String 1",
    ],
  },

  {
    id: "D",
    name: "D Major",
    category: "Major",
    difficulty: "Beginner",

    diagram: DMajor,

    description:
      "Excellent chord for beginners.",

    fingers: [
      "2nd fret - String 1",
      "3rd fret - String 2",
      "2nd fret - String 3",
    ],
  },

  {
    id: "E",
    name: "E Major",
    category: "Major",
    difficulty: "Beginner",

    diagram: EMajor,

    description:
      "A powerful open chord used in many songs.",

    fingers: [
      "1st fret - String 3",
      "2nd fret - Strings 4 & 5",
    ],
  },

  {
    id: "Am",
    name: "A Minor",
    category: "Minor",
    difficulty: "Beginner",

    diagram: AMinor,

    description:
      "A very common emotional sounding chord.",

    fingers: [
      "1st fret - String 2",
      "2nd fret - Strings 3 & 4",
    ],
  },
];

/*  {
id: "F",
    name: "F Major",
    category: "Barre",
    difficulty: "Intermediate",
    fingers: [
      "Barre 1st fret",
      "2nd fret - String 3",
      "3rd fret - Strings 4 & 5",
    ],
    description: "Your first barre chord.",
  },
];*/