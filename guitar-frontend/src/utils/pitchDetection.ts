export type GuitarStringTarget = {
  stringNumber: number;
  note: string;
  octave: number;
  frequency: number;
};

export type PitchReading = {
  frequency: number;
  clarity: number;
  rms: number;
};

export const STANDARD_TUNING: GuitarStringTarget[] = [
  { stringNumber: 6, note: "E", octave: 2, frequency: 82.41 },
  { stringNumber: 5, note: "A", octave: 2, frequency: 110.0 },
  { stringNumber: 4, note: "D", octave: 3, frequency: 146.83 },
  { stringNumber: 3, note: "G", octave: 3, frequency: 196.0 },
  { stringNumber: 2, note: "B", octave: 3, frequency: 246.94 },
  { stringNumber: 1, note: "E", octave: 4, frequency: 329.63 },
];

const MIN_FREQUENCY = 70;
const MAX_FREQUENCY = 380;
const MIN_RMS = 0.008;
const YIN_THRESHOLD = 0.16;

export function centsBetween(frequency: number, targetFrequency: number) {
  return 1200 * Math.log2(frequency / targetFrequency);
}

export function nearestGuitarString(frequency: number) {
  return STANDARD_TUNING.reduce((nearest, candidate) =>
    Math.abs(centsBetween(frequency, candidate.frequency)) <
    Math.abs(centsBetween(frequency, nearest.frequency))
      ? candidate
      : nearest,
  );
}

export function median(values: number[]) {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

export function detectPitch(
  input: Float32Array,
  sampleRate: number,
): PitchReading | null {
  if (input.length < 768 || sampleRate <= 0) {
    return null;
  }

  const sampleCount = Math.min(input.length, 4096);
  const start = input.length - sampleCount;
  let mean = 0;
  for (let index = start; index < input.length; index += 1) {
    mean += input[index];
  }
  mean /= sampleCount;

  const samples = new Float32Array(sampleCount);
  let energy = 0;
  for (let index = 0; index < sampleCount; index += 1) {
    const centered = input[start + index] - mean;
    samples[index] = centered;
    energy += centered * centered;
  }

  const rms = Math.sqrt(energy / sampleCount);
  if (rms < MIN_RMS) {
    return null;
  }

  const minimumLag = Math.max(2, Math.floor(sampleRate / MAX_FREQUENCY));
  const maximumLag = Math.min(
    Math.ceil(sampleRate / MIN_FREQUENCY),
    sampleCount - 2,
  );
  if (maximumLag <= minimumLag) {
    return null;
  }

  const difference = new Float32Array(maximumLag + 1);
  for (let lag = 1; lag <= maximumLag; lag += 1) {
    let sum = 0;
    for (let index = 0; index < sampleCount - lag; index += 1) {
      const delta = samples[index] - samples[index + lag];
      sum += delta * delta;
    }
    difference[lag] = sum;
  }

  const normalized = new Float32Array(maximumLag + 1);
  normalized[0] = 1;
  let runningTotal = 0;
  for (let lag = 1; lag <= maximumLag; lag += 1) {
    runningTotal += difference[lag];
    normalized[lag] = runningTotal > 0
      ? (difference[lag] * lag) / runningTotal
      : 1;
  }

  let selectedLag = -1;
  for (let lag = minimumLag; lag < maximumLag; lag += 1) {
    if (normalized[lag] < YIN_THRESHOLD) {
      selectedLag = lag;
      while (
        selectedLag + 1 <= maximumLag &&
        normalized[selectedLag + 1] < normalized[selectedLag]
      ) {
        selectedLag += 1;
      }
      break;
    }
  }

  if (selectedLag < 0) {
    let bestValue = 1;
    for (let lag = minimumLag; lag <= maximumLag; lag += 1) {
      if (normalized[lag] < bestValue) {
        bestValue = normalized[lag];
        selectedLag = lag;
      }
    }
    if (bestValue > 0.3) {
      return null;
    }
  }

  const previous = normalized[Math.max(1, selectedLag - 1)];
  const current = normalized[selectedLag];
  const next = normalized[Math.min(maximumLag, selectedLag + 1)];
  const denominator = previous - 2 * current + next;
  const adjustment = Math.abs(denominator) > 1e-8
    ? 0.5 * (previous - next) / denominator
    : 0;
  const refinedLag = selectedLag + Math.max(-1, Math.min(1, adjustment));
  const frequency = sampleRate / refinedLag;

  if (frequency < MIN_FREQUENCY || frequency > MAX_FREQUENCY) {
    return null;
  }

  return {
    frequency,
    clarity: Math.max(0, Math.min(1, 1 - current)),
    rms,
  };
}
