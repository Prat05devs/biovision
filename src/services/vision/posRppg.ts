export type RgbSample = { r: number; g: number; b: number; timestamp: number };

const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
const deviation = (values: number[]) => {
  const mean = average(values);
  return Math.sqrt(average(values.map((value) => (value - mean) ** 2)));
};

/** Classical Plane-Orthogonal-to-Skin pulse baseline with a small direct DFT. */
export function estimatePosHeartRate(samples: RgbSample[]): number | undefined {
  if (samples.length < 240) return undefined;
  const durationSeconds = (samples.at(-1)!.timestamp - samples[0]!.timestamp) / 1000;
  if (durationSeconds < 12) return undefined;
  const means = {
    r: average(samples.map(({ r }) => r)),
    g: average(samples.map(({ g }) => g)),
    b: average(samples.map(({ b }) => b)),
  };
  if (Math.min(means.r, means.g, means.b) < 8) return undefined;
  const x = samples.map(({ g, b }) => g / means.g - b / means.b);
  const y = samples.map(({ r, g, b }) => g / means.g + b / means.b - 2 * r / means.r);
  const yDeviation = deviation(y);
  if (yDeviation < 1e-5) return undefined;
  const alpha = deviation(x) / yDeviation;
  const signal = x.map((value, index) => value + alpha * y[index]!);
  const meanSignal = average(signal);
  const centered = signal.map((value) => value - meanSignal);
  let bestBpm: number | undefined;
  let bestPower = 0;
  // Search 42–180 BPM in 0.5 BPM steps using the real sample timestamps.
  for (let bpm = 42; bpm <= 180; bpm += 0.5) {
    const frequency = bpm / 60;
    let real = 0;
    let imaginary = 0;
    for (let index = 0; index < centered.length; index += 1) {
      const seconds = (samples[index]!.timestamp - samples[0]!.timestamp) / 1000;
      const phase = 2 * Math.PI * frequency * seconds;
      real += centered[index]! * Math.cos(phase);
      imaginary -= centered[index]! * Math.sin(phase);
    }
    const power = real * real + imaginary * imaginary;
    if (power > bestPower) { bestPower = power; bestBpm = bpm; }
  }
  return bestBpm;
}

/** Samples a central upper-face patch. It is used only after alignment succeeds. */
export function sampleForehead(video: HTMLVideoElement, canvas: HTMLCanvasElement): RgbSample | undefined {
  if (!video.videoWidth || !video.videoHeight) return undefined;
  const width = 48;
  const height = 24;
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return undefined;
  context.drawImage(video, video.videoWidth * 0.35, video.videoHeight * 0.15, video.videoWidth * 0.3, video.videoHeight * 0.18, 0, 0, width, height);
  const data = context.getImageData(0, 0, width, height).data;
  let r = 0, g = 0, b = 0, count = 0;
  for (let index = 0; index < data.length; index += 16) {
    const red = data[index]!, green = data[index + 1]!, blue = data[index + 2]!;
    const maximum = Math.max(red, green, blue);
    const minimum = Math.min(red, green, blue);
    if (maximum > 245 || minimum < 8) continue;
    r += red; g += green; b += blue; count += 1;
  }
  return count < 40 ? undefined : { r: r / count, g: g / count, b: b / count, timestamp: performance.now() };
}
