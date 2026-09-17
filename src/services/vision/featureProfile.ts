export type FeatureProfileItem = {
  id: string;
  label: string;
  valueText: string;
  /** A normalized geometry index, not an attractiveness or health rating. */
  score: number;
};

export type LandmarkPoint = { x: number; y: number; z?: number };

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const index10 = (value: number, low: number, high: number) =>
  Math.round(1 + clamp((value - low) / (high - low), 0, 1) * 9);

/**
 * Produces descriptive face-geometry indices from one MediaPipe landmark set.
 * It does not infer beauty, personality, ethnicity, age, health, or identity.
 */
export function calculateRealFeatureProfile(
  landmarks: LandmarkPoint[],
  imageAspectRatio = 1,
): FeatureProfileItem[] {
  if (landmarks.length < 478 || !Number.isFinite(imageAspectRatio) || imageAspectRatio <= 0) return [];
  const point = (id: number) => landmarks[id];
  const required = [0, 1, 10, 13, 14, 17, 33, 61, 129, 132, 133, 145, 151, 152, 159, 164, 234, 263, 291, 358, 361, 362, 374, 386, 454];
  if (required.some((id) => {
    const item = point(id);
    return !item || !Number.isFinite(item.x) || !Number.isFinite(item.y);
  })) return [];

  // x and y are independently normalized by image width and height. Convert y
  // to width-relative units before comparing horizontal and vertical lengths.
  const dist = (leftId: number, rightId: number) => {
    const left = point(leftId)!;
    const right = point(rightId)!;
    return Math.hypot(left.x - right.x, (left.y - right.y) / imageAspectRatio);
  };
  const ratio = (numerator: number, denominator: number) => denominator > 1e-6 ? numerator / denominator : NaN;

  const faceWidth = dist(234, 454);
  const faceHeight = dist(10, 152);
  const jawWidth = dist(132, 361);
  const eyeSpan = dist(33, 263);
  const mouthWidth = dist(61, 291);
  if ([faceWidth, faceHeight, jawWidth, eyeSpan, mouthWidth].some((value) => !Number.isFinite(value) || value <= 1e-6)) return [];

  const center = point(1)!;
  const symPairs: [number, number][] = [[33, 263], [234, 454], [61, 291], [132, 361]];
  const symmetry = symPairs.reduce((sum, [leftId, rightId]) => {
    const left = point(leftId)!;
    const right = point(rightId)!;
    const leftDistance = Math.hypot(left.x - center.x, (left.y - center.y) / imageAspectRatio);
    const rightDistance = Math.hypot(right.x - center.x, (right.y - center.y) / imageAspectRatio);
    return sum + Math.min(leftDistance, rightDistance) / Math.max(leftDistance, rightDistance);
  }, 0) / symPairs.length;
  const symmetryScore = index10(symmetry, 0.82, 0.99);

  const jawTaper = ratio(jawWidth, faceWidth);
  const jawScore = index10(jawTaper, 0.62, 0.92);

  const cheekToJaw = ratio(faceWidth, jawWidth);
  const cheekScore = index10(cheekToJaw, 1.02, 1.42);

  const leftEyeRatio = ratio(dist(33, 133), dist(159, 145));
  const rightEyeRatio = ratio(dist(362, 263), dist(386, 374));
  const eyeRatio = (leftEyeRatio + rightEyeRatio) / 2;
  const eyeScore = index10(eyeRatio, 1.8, 4.2);

  // Outer-lip height avoids treating an open mouth as lip fullness.
  const lipRatio = ratio(dist(0, 17), mouthWidth);
  const lipScore = index10(lipRatio, 0.16, 0.42);

  const noseRatio = ratio(dist(129, 358), eyeSpan);
  const noseScore = 11 - index10(noseRatio, 0.32, 0.58);

  // Compare visible face thirds. Landmark 10 is the top of the tracked face,
  // not the hairline, so this is intentionally not called the golden ratio.
  const thirds = [dist(10, 151), dist(151, 164), dist(164, 152)];
  const averageThird = (thirds[0]! + thirds[1]! + thirds[2]!) / 3;
  const thirdDeviation = thirds.reduce((sum, value) => sum + Math.abs(value - averageThird), 0) / (3 * averageThird);
  const proportionScore = 11 - index10(thirdDeviation, 0.04, 0.35);

  return [
    { id: 'symmetry', label: 'FACIAL SYMMETRY', valueText: symmetry >= 0.96 ? 'highly symmetric' : symmetry >= 0.90 ? 'balanced' : 'visible asymmetry', score: symmetryScore },
    { id: 'jawline', label: 'JAW TAPER', valueText: jawTaper >= 0.82 ? 'broad' : jawTaper >= 0.72 ? 'moderate' : 'tapered', score: jawScore },
    { id: 'cheekbone', label: 'CHEEK–JAW RATIO', valueText: cheekToJaw >= 1.24 ? 'cheeks wider' : cheekToJaw >= 1.10 ? 'moderate taper' : 'similar width', score: cheekScore },
    { id: 'eye', label: 'EYE ASPECT', valueText: eyeRatio >= 3.2 ? 'elongated' : eyeRatio >= 2.4 ? 'balanced' : 'rounded', score: eyeScore },
    { id: 'lip', label: 'LIP HEIGHT RATIO', valueText: lipRatio >= 0.32 ? 'fuller' : lipRatio >= 0.23 ? 'medium' : 'slender', score: lipScore },
    { id: 'nose', label: 'NOSE–EYE RATIO', valueText: noseRatio <= 0.40 ? 'narrower' : noseRatio <= 0.50 ? 'medium' : 'wider', score: noseScore },
    { id: 'proportion', label: 'VISIBLE FACE THIRDS', valueText: thirdDeviation <= 0.10 ? 'even' : thirdDeviation <= 0.20 ? 'moderately even' : 'varied', score: proportionScore },
  ];
}
