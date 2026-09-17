export type VideoFrameCapture = { uri: string; width: number; height: number };

export async function captureCurrentVideoFrame(): Promise<VideoFrameCapture | undefined> {
  return undefined;
}
