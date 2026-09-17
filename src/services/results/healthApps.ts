import type { TFunction } from 'i18next';
import { ActionSheetIOS, Alert, Linking, Platform } from 'react-native';

type HealthApp = { name: string; scheme?: string; store: string };

/** Popular health and fitness-band apps in India. Opens the app if installed, otherwise its App Store search. */
const apps: HealthApp[] = [
  { name: 'Apple Health', scheme: 'x-apple-health://', store: 'Apple Health' },
  { name: 'Fitbit', scheme: 'fitbit://', store: 'Fitbit' },
  { name: 'Garmin Connect', store: 'Garmin Connect' },
  { name: 'Mi Fitness', store: 'Mi Fitness Xiaomi' },
  { name: 'Zepp (Amazfit)', store: 'Zepp' },
  { name: 'NoiseFit', store: 'NoiseFit' },
  { name: 'boAt Crest', store: 'boAt Crest' },
];

async function openApp(app: HealthApp) {
  if (app.scheme) {
    try {
      await Linking.openURL(app.scheme);
      return;
    } catch {
      // Not installed: fall through to the store.
    }
  }
  const term = encodeURIComponent(app.store);
  const url = Platform.OS === 'ios'
    ? `itms-apps://search.itunes.apple.com/WebObjects/MZSearch.woa/wa/search?media=software&term=${term}`
    : `https://play.google.com/store/search?q=${term}&c=apps`;
  await Linking.openURL(url).catch(() => undefined);
}

export function showHealthAppPicker(t: TFunction) {
  const title = t('result.healthApps.pickerTitle');
  const message = t('result.healthApps.pickerBody');
  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      { title, message, options: [...apps.map((app) => app.name), t('common.cancel')], cancelButtonIndex: apps.length },
      (index) => { const app = apps[index]; if (app) void openApp(app); },
    );
    return;
  }
  Alert.alert(title, message, [
    ...apps.slice(0, 2).map((app) => ({ text: app.name, onPress: () => void openApp(app) })),
    { text: t('common.cancel'), style: 'cancel' as const },
  ]);
}
