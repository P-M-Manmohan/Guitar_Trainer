export type GuitarString = {
  id: string;
  label: string;
  note: string;
  frequency: number;
};

export const STANDARD_GUITAR_STRINGS: GuitarString[] = [
  { id: "6", label: "6th", note: "E2", frequency: 82.41 },
  { id: "5", label: "5th", note: "A2", frequency: 110.0 },
  { id: "4", label: "4th", note: "D3", frequency: 146.83 },
  { id: "3", label: "3rd", note: "G3", frequency: 196.0 },
  { id: "2", label: "2nd", note: "B3", frequency: 246.94 },
  { id: "1", label: "1st", note: "E4", frequency: 329.63 },
];

export function centsFromTarget(frequency: number, target: number) {
  return 1200 * Math.log2(frequency / target);
}

export function detectPitch(
  samples: Float32Array,
  sampleRate: number,
  targetFrequency?: number
) {
  if (samples.length < 512) return null;

  let mean = 0;
  for (const sample of samples) mean += sample;
  mean /= samples.length;

  let energy = 0;
  const centered = new Float32Array(samples.length);
  for (let index = 0; index < samples.length; index += 1) {
    centered[index] = samples[index] - mean;
    energy += centered[index] * centered[index];
  }
  if (Math.sqrt(energy / samples.length) < 0.012) return null;

  // Restrict detection around the selected string. This prevents a strong
  // harmonic from being mistaken for the fundamental while still allowing a
  // string to start several semitones flat or sharp.
  const minFrequency = targetFrequency
    ? targetFrequency * 2 ** (-4 / 12)
    : 70;
  const maxFrequency = targetFrequency
    ? targetFrequency * 2 ** (4 / 12)
    : 360;
  const minLag = Math.max(2, Math.floor(sampleRate / maxFrequency));
  const maxLag = Math.min(
    Math.ceil(sampleRate / minFrequency),
    samples.length >> 1
  );
  const difference = new Float32Array(maxLag + 1);
  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let sum = 0;
    for (let index = 0; index < samples.length - lag; index += 1) {
      const delta = centered[index] - centered[index + lag];
      sum += delta * delta;
    }
    difference[lag] = sum;
  }

  // YIN cumulative mean normalized difference. Compute the whole curve before
  // choosing a minimum; comparing partly-normalized values biases the result.
  let runningSum = 0;
  for (let lag = minLag; lag <= maxLag; lag += 1) {
    runningSum += difference[lag];
    difference[lag] = runningSum > 0
      ? (difference[lag] * (lag - minLag + 1)) / runningSum
      : 1;
  }

  let bestLag = -1;
  let bestValue = Number.POSITIVE_INFINITY;
  for (let lag = minLag + 1; lag < maxLag; lag += 1) {
    const value = difference[lag];
    if (value < bestValue) {
      bestValue = value;
      bestLag = lag;
    }
    if (
      value < 0.16 &&
      value <= difference[lag - 1] &&
      value <= difference[lag + 1]
    ) {
      bestLag = lag;
      break;
    }
  }

  if (bestLag < minLag || difference[bestLag] > 0.28) return null;
  const left = difference[Math.max(minLag, bestLag - 1)];
  const middle = difference[bestLag];
  const right = difference[Math.min(maxLag, bestLag + 1)];
  const denominator = 2 * (2 * middle - left - right);
  const refinedLag = denominator === 0 ? bestLag : bestLag + (right - left) / denominator;
  const frequency = sampleRate / refinedLag;
  return frequency >= minFrequency && frequency <= maxFrequency
    ? frequency
    : null;
}
