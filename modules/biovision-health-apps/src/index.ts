import { requireOptionalNativeModule } from 'expo';

export type InstalledHealthApp = {
  /** Android package name. */
  id: string;
  /** The app's own label, as shown on the home screen. */
  name: string;
  /** PNG data URI of the launcher icon. */
  icon: string;
};

type NativeModule = {
  listInstalled(): Promise<InstalledHealthApp[]>;
  open(packageName: string): Promise<boolean>;
};

/** Android only; `null` on iOS, web, or a build that predates the module. */
export const HealthApps = requireOptionalNativeModule<NativeModule>('BioVisionHealthApps');
