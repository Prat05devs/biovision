export type VideoFrameCapture = { uri: string; width: number; height: number };

/** Captures the already-open local camera frame without asking Expo Camera to take another photo. */
export async function captureCurrentVideoFrame(): Promise<VideoFrameCapture | undefined> {
  const video = document.querySelector('video');
  if (!(video instanceof HTMLVideoElement) || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return undefined;
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height) return undefined;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return undefined;
  context.drawImage(video, 0, 0, width, height);
  return { uri: canvas.toDataURL('image/jpeg', 0.9), width, height };
}
