import { create } from 'zustand';
import type { AppearanceResult } from '@/services/vision/appearance.types';
export const useAppearanceStore = create<{
  captureUri?: string; result?: AppearanceResult;
  setResult: (uri: string, result: AppearanceResult) => void;
  reset: () => void;
}>(set => ({
  setResult: (captureUri, result) => set({ captureUri, result }),
  reset: () => set({ captureUri: undefined, result: undefined }),
}));
