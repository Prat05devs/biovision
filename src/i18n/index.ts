import { deployment } from '@/config/deployment';
import * as Localization from 'expo-localization';
import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './en.json';
import hi from './hi.json';

const deviceLanguage = Localization.getLocales()[0]?.languageCode === 'hi' ? 'hi' : 'en';
const i18n = createInstance();

void i18n.use(initReactI18next).init({
  compatibilityJSON: 'v4',
  resources: {
    en: { translation: { ...en, brand: { ...en.brand, name: deployment.brandName } } },
    hi: { translation: { ...hi, brand: { ...hi.brand, name: deployment.brandName } } },
  },
  lng: deviceLanguage,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;
