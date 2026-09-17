import type { AppearanceProvider } from './appearance.types';
import { unavailableAppearance } from './appearance.types';
// Native providers can be registered by a native MediaPipe/TFLite module without changing screens.
// Never substitute web sample images, artificial landmarks, or self-labelled signs.
let nativeProvider: AppearanceProvider | undefined;
export function registerAppearanceProvider(provider: AppearanceProvider) { nativeProvider = provider; }
export const appearanceService: AppearanceProvider = {
  async analyze(uri) { return nativeProvider ? nativeProvider.analyze(uri) : unavailableAppearance(); },
};
