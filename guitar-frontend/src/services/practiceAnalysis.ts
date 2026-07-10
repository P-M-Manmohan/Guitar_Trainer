import { apiPost } from "./api";

export type ExpectedFingerPosition = {
  string: number;
  fret: number;
};

export type ExpectedFingering = Record<string, ExpectedFingerPosition>;

export type PracticeAnalysisResponse = {
  status: string;
  raw_status: string;
  stable_status: string;
  frames_considered: number;
  placement_correct: boolean;
  audio_correct: boolean;
  summary: string;
  instruction: string;
};

export type PracticeAnalysisRequest = {
  session_id: string;
  target_chord: string;
  image: string;
  image_format: "rgb";
  image_width: number;
  image_height: number;
  audio?: string;
  audio_format: "pcm_s16le";
  audio_sample_rate: number;
  audio_channels: number;
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
