import { Linking, Platform } from 'react-native';

import { HealthApps } from '../../../modules/biovision-health-apps/src';

export type InstalledApp = {
  id: string;
  name: string;
  /** Launcher icon as a data URI (Android). iOS offers no way to read another app's icon. */
  icon?: string;
};

/**
 * iOS never lists installed apps. The closest it allows is asking whether a URL scheme opens,
 * and only for schemes declared under LSApplicationQueriesSchemes in Info.plist (and app.json),
 * so every entry here must be declared there too.
 */
const IOS_SCHEMES: { id: string; name: string; url: string }[] = [
  { id: 'x-apple-health', name: 'Apple Health', url: 'x-apple-health://' },
  { id: 'fitbit', name: 'Fitbit', url: 'fitbit://' },
  { id: 'strava', name: 'Strava', url: 'strava://' },
];

/** Health and fitness apps actually installed on this device, never a fixed suggestion list. */
export async function listInstalledHealthApps(): Promise<InstalledApp[]> {
  if (Platform.OS === 'android') return (await HealthApps?.listInstalled()) ?? [];
  if (Platform.OS !== 'ios') return [];
  const checks = await Promise.all(
    IOS_SCHEMES.map(async (app) => ((await Linking.canOpenURL(app.url).catch(() => false)) ? app : undefined)),
  );
  return checks.filter((app) => app !== undefined).map(({ id, name }) => ({ id, name }));
}

export async function openInstalledHealthApp(app: InstalledApp): Promise<void> {
  if (Platform.OS === 'android') {
    await HealthApps?.open(app.id);
    return;
  }
  const scheme = IOS_SCHEMES.find((item) => item.id === app.id);
  if (scheme) await Linking.openURL(scheme.url).catch(() => undefined);
}
