/** Portable pixel analysis: no DOM, uploads, disease labels or demographic inference.
 * Thresholds are uncalibrated engineering defaults; all outputs are appearance cues. */
export type PixelFrame = { width: number; height: number; data: ArrayLike<number> };
export type Point = { x: number; y: number };
export type Region = { x: number; y: number; rx: number; ry: number };
export type AppearanceCheck = {
  id: 'underEyes' | 'forehead' | 'spots' | 'eyeRedness' | 'lipTone';
  status: 'noticed' | 'not_flagged' | 'not_assessable';
  reason: 'contrast' | 'tone_variation' | 'local_spots' | 'redness' | 'lip_contrast' | 'no_clear_signal' | 'resolution' | 'lighting' | 'coverage';
  regions?: Region[];
};
type Sample = { r: number; g: number; b: number; light: number };
export const appearanceThresholds = {
  version: 'appearance-rules-v2', minPatchPixels: 60, minBrightness: 25, maxBrightness: 235,
  maxClippedFraction: 0.12, foreheadContrast: 0.17, minSpotFaceWidth: 220,
  spotRedExcess: 0.055, minEyeWidth: 65, minScleraPixels: 80, eyeRedRatio: 1.28,
  minLipWidth: 70, lipToSkinContrast: 0.3,
} as const;
const median = (values: number[]) => {
  const sorted = values.sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? NaN;
};
export function sampleRegion(frame: PixelFrame, region: Region): Sample[] {
  const { width, height, data } = frame;
  if (width <= 0 || height <= 0 || data.length !== width * height * 4 ||
      !Object.values(region).every(Number.isFinite) || region.rx <= 0 || region.ry <= 0 ||
      region.x - region.rx < 0 || region.x + region.rx > 1 || region.y - region.ry < 0 || region.y + region.ry > 1) return [];
  const out: Sample[] = [];
  for (let y = Math.ceil((region.y - region.ry) * height); y < (region.y + region.ry) * height; y++) {
    for (let x = Math.ceil((region.x - region.rx) * width); x < (region.x + region.rx) * width; x++) {
      if (((x / width - region.x) / region.rx) ** 2 + ((y / height - region.y) / region.ry) ** 2 > 1) continue;
      const i = (y * width + x) * 4;
      const r = data[i]!, g = data[i + 1]!, b = data[i + 2]!;
      if (![r, g, b].every(v => Number.isFinite(v) && v >= 0 && v <= 255)) return [];
      out.push({ r, g, b, light: .2126 * r + .7152 * g + .0722 * b });
    }
  }
  return out;
}
function usable(samples: Sample[], minimum: number = appearanceThresholds.minPatchPixels) {
  if (samples.length < minimum) return false;
  const bad = samples.filter(p => p.light < appearanceThresholds.minBrightness || Math.max(p.r, p.g, p.b) > 250).length;
  return bad / samples.length <= appearanceThresholds.maxClippedFraction;
}
const unknown = (id: AppearanceCheck['id'], reason: AppearanceCheck['reason']): AppearanceCheck => ({ id, status: 'not_assessable', reason });
export function analyseForehead(frame: PixelFrame, regions: Region[]): AppearanceCheck {
  const samples = regions.map(r => sampleRegion(frame, r));
  if (samples.length < 3 || samples.some(s => s.length < appearanceThresholds.minPatchPixels)) return unknown('forehead', 'coverage');
  if (samples.some(s => !usable(s))) return unknown('forehead', 'lighting');
  const brightness = samples.map(s => median(s.map(p => p.light)));
  const spread = (Math.max(...brightness) - Math.min(...brightness)) / Math.max(...brightness);
  return { id: 'forehead', status: spread > appearanceThresholds.foreheadContrast ? 'noticed' : 'not_flagged', reason: spread > appearanceThresholds.foreheadContrast ? 'tone_variation' : 'no_clear_signal', regions };
}
/** Looks for localized red colour patches against their immediate surrounds.
 * Does not count acne lesions: freckles, marks, irritation and image artefacts can overlap. */
export function analyseSpots(frame: PixelFrame, regions: Region[], faceWidth: number): AppearanceCheck {
  if (faceWidth * frame.width < appearanceThresholds.minSpotFaceWidth) return unknown('spots', 'resolution');
  let evaluated = 0, candidates = 0;
  for (const region of regions) {
    const background = sampleRegion(frame, region);
    if (!usable(background)) continue;
    const baseRed = median(background.map(p => p.r / Math.max(1, p.r + p.g + p.b)));
    for (const dx of [-.45, 0, .45]) for (const dy of [-.45, 0, .45]) {
      const patch = sampleRegion(frame, { x: region.x + dx * region.rx, y: region.y + dy * region.ry, rx: region.rx * .20, ry: region.ry * .20 });
      if (patch.length < 9 || !usable(patch, 9)) continue;
      evaluated++;
      const red = median(patch.map(p => p.r / Math.max(1, p.r + p.g + p.b)));
      if (red - baseRed > appearanceThresholds.spotRedExcess) candidates++;
    }
  }
  if (evaluated < 12) return unknown('spots', 'coverage');
  return { id: 'spots', status: candidates ? 'noticed' : 'not_flagged', reason: candidates ? 'local_spots' : 'no_clear_signal', regions };
}
/** Eye-white candidates only; iris, pupil, eyelid borders and specular pixels excluded.
 * A face photo often has insufficient sclera detail, in which case this abstains. */
export function analyseEyeRedness(frame: PixelFrame, eyes: Region[]): AppearanceCheck {
  if (eyes.length !== 2 || eyes.some(r => r.rx * 2 * frame.width < appearanceThresholds.minEyeWidth)) return unknown('eyeRedness', 'resolution');
  const ratios: number[] = [];
  for (const eye of eyes) {
    // Sample only inner corners of an inset eye aperture, away from the central iris.
    const sides = [-.62, .62].flatMap(dx => sampleRegion(frame, { x: eye.x + dx * eye.rx, y: eye.y, rx: eye.rx * .19, ry: eye.ry * .45 }));
    const sclera = sides.filter(p => p.light > 100 && p.light < 235 && p.g > 80 && p.b > 75 && Math.max(p.r, p.g, p.b) < 250 && Math.abs(p.g - p.b) / Math.max(p.g, p.b) < .12);
    if (sclera.length < appearanceThresholds.minScleraPixels) return unknown('eyeRedness', 'coverage');
    ratios.push(median(sclera.map(p => p.r / Math.max(1, (p.g + p.b) / 2))));
  }
  const noticed = ratios.some(r => r > appearanceThresholds.eyeRedRatio);
  return { id: 'eyeRedness', status: noticed ? 'noticed' : 'not_flagged', reason: noticed ? 'redness' : 'no_clear_signal', regions: eyes.flatMap(eye => [-.62, .62].map(dx => ({ x: eye.x + dx * eye.rx, y: eye.y, rx: eye.rx * .19, ry: eye.ry * .45 }))) };
}

/** Compares visible outer-lip samples with nearby facial reference patches.
 * This describes relative colour in one photo and cannot infer tobacco use. */
export function analyseLipTone(
  frame: PixelFrame,
  lips: Region[],
  references: Region[],
  lipWidth: number,
): AppearanceCheck {
  if (lips.length !== 2 || references.length < 2 || lipWidth * frame.width < appearanceThresholds.minLipWidth) {
    return unknown('lipTone', 'resolution');
  }
  const lipSamples = lips.map(region => sampleRegion(frame, region));
  const referenceSamples = references.map(region => sampleRegion(frame, region));
  if (lipSamples.some(samples => samples.length < appearanceThresholds.minPatchPixels) ||
      referenceSamples.some(samples => samples.length < appearanceThresholds.minPatchPixels)) {
    return unknown('lipTone', 'coverage');
  }
  if ([...lipSamples, ...referenceSamples].some(samples => !usable(samples))) {
    return unknown('lipTone', 'lighting');
  }
  const lipLight = median(lipSamples.flat().map(pixel => pixel.light));
  const referenceLight = median(referenceSamples.flat().map(pixel => pixel.light));
  const contrast = (referenceLight - lipLight) / Math.max(1, referenceLight);
  const noticed = contrast > appearanceThresholds.lipToSkinContrast;
  return {
    id: 'lipTone',
    status: noticed ? 'noticed' : 'not_flagged',
    reason: noticed ? 'lip_contrast' : 'no_clear_signal',
    regions: lips,
  };
}
