import { apiPost } from "./api";

export type ExpectedFingerPosition = {
  string: number;
  fret: number;
};

export type ExpectedFingering = Record<string, ExpectedFingerPosition>;

export type HandLandmark = {
  x: number;
  y: number;
  z: number;
};

export type PracticeAnalysisResponse = {
  hand_detected: boolean;
  target_chord: string;
  status: string;
  raw_status: string;
  stable_status: string;
  frames_considered: number;
  placement_correct: boolean;
  audio_correct: boolean;
  summary: string;
  instruction: string;
  predicted_chord?: string | null;
  chord_confidence?: number;
  landmarks?: HandLandmark[] | null;
};

export type PracticeAnalysisRequest = {
  mode: "selected" | "free";
  session_id: string;
  target_chord?: string;
  image: string;
  image_format: "rgb";
  image_width: number;
  image_height: number;
  expected_fingerings?: ExpectedFingering[];
  neck_bbox: {
    top_left: [number, number];
    top_right: [number, number];
    bottom_left: [number, number];
    bottom_right: [number, number];
  };
};

export function analyzePractice(request: PracticeAnalysisRequest) {
  return apiPost<PracticeAnalysisResponse>("/ml/analyze-practice", request);
}
