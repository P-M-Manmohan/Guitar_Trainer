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


export type FingerPlacement = {
    string: number;
    fret: number;
    x: number;
    y: number;
}


export type FrameResponse = {
    hand_detected: boolean;
    landmarks?: HandLandmark[];
    predicted_chord?:string;
    chord_confidence?: number;
    finger_placement?: Record<string, FingerPlacement>;
}


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

export type NeckBBox = {
    top_left: [number, number];
    top_right: [number, number]
    bottom_left: [number, number]
    bottom_right: [number, number]
}


export type FrameRequest = {
    image: string ;
    image_format: string;
    image_width: number;
    image_height:number;
    neck_bbox?: NeckBBox;
};

export function analyzePractice(request: PracticeAnalysisRequest) {
  return apiPost<PracticeAnalysisResponse>("/ml/analyze-practice", request);
}
