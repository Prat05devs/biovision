import { NitroModules } from 'react-native-nitro-modules';
import type { CameraOutput } from 'react-native-vision-camera';

import type { FacePhysFactory, FacePhysOutputOptions } from './specs/FacePhysFactory.nitro';

export type {
  FacePhysFaceBox,
  FacePhysOutputOptions,
  FacePhysSample,
  FacePhysUpdate,
} from './specs/FacePhysFactory.nitro';

let factory: FacePhysFactory | undefined;

export function createFacePhysOutput(options: FacePhysOutputOptions): CameraOutput {
  factory ??= NitroModules.createHybridObject<FacePhysFactory>('FacePhysFactory');
  return factory.createFacePhysOutput(options);
}

import type { EyeImageResult, EyeScreener } from './specs/EyeScreener.nitro';

export type { EyeImageResult } from './specs/EyeScreener.nitro';

let eyeScreener: EyeScreener | undefined;

export function analyzeEyeImage(path: string, female: boolean): Promise<EyeImageResult> {
  eyeScreener ??= NitroModules.createHybridObject<EyeScreener>('EyeScreener');
  return eyeScreener.analyze(path, female);
}

export type { FaceImageResult } from './specs/EyeScreener.nitro';

export function detectFaceInImage(path: string, maxEdge: number) {
  eyeScreener ??= NitroModules.createHybridObject<EyeScreener>('EyeScreener');
  return eyeScreener.detectFace(path, maxEdge);
}
