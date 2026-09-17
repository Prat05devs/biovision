import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type AppLanguage = 'en' | 'hi';

/** Bump when the terms or privacy policy change so people see and accept them again. */
export const TERMS_VERSION = '2026-09-17';

type PreferencesState = {
  language: AppLanguage;
  acceptedTermsVersion?: string;
  hydrated: boolean;
  setLanguage: (language: AppLanguage) => void;
  acceptTerms: () => void;
};

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      language: 'en',
      acceptedTermsVersion: undefined,
      hydrated: false,
      setLanguage: (language) => set({ language }),
      acceptTerms: () => set({ acceptedTermsVersion: TERMS_VERSION }),
    }),
    {
      name: 'biovision-preferences',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ language, acceptedTermsVersion }) => ({ language, acceptedTermsVersion }),
      onRehydrateStorage: () => () => usePreferencesStore.setState({ hydrated: true }),
    },
  ),
);
