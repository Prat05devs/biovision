import type { FaceLandmark } from '@/types/vision';

/** Rolling landmark average. Providers can reuse this with real MediaPipe frames. */
export class LandmarkSmoother {
  private readonly frames: FaceLandmark[][] = [];

  constructor(private readonly windowSize = 4) {}

  push(frame: FaceLandmark[]): FaceLandmark[] {
    this.frames.push(frame);
    if (this.frames.length > this.windowSize) this.frames.shift();

    return frame.map((point, index) => {
      let x = 0;
      let y = 0;
      let z = 0;
      let count = 0;
      for (const storedFrame of this.frames) {
        const storedPoint = storedFrame[index];
        if (!storedPoint) continue;
        x += storedPoint.x;
        y += storedPoint.y;
        z += storedPoint.z;
        count += 1;
      }
      return count ? { x: x / count, y: y / count, z: z / count } : point;
    });
  }

  reset() {
    this.frames.length = 0;
  }
}

