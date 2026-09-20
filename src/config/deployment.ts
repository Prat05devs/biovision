import { z } from 'zod';
import defaultDeployment from '../../configs/deployments/biovision.json';
const schema = z.object({
  id: z.string().min(1), brandName: z.string().min(1), defaultRegion: z.string(),
  regions: z.record(z.string(), z.object({
    name: z.object({ en: z.string(), hi: z.string() }), countryCode: z.string(),
    emergencyPhone: z.string().regex(/^\+?\d{3,15}$/), mapsQuery: z.string(), directoryId: z.string(),
  })),
  careProvider: z.literal('bundled'), researchCollectionAvailable: z.boolean(),
  appearance: z.object({ enabled: z.boolean(), provider: z.string() }),
});
// Register new deployment manifests here; screens never select cities or tenant details.
const manifests: Record<string, unknown> = { biovision: defaultDeployment };
const deploymentId = process.env.EXPO_PUBLIC_DEPLOYMENT_ID ?? 'biovision';
export const deployment = schema.parse(manifests[deploymentId]);
export const regionId = process.env.EXPO_PUBLIC_REGION_ID ?? deployment.defaultRegion;
const selectedRegion = deployment.regions[regionId];
if (!selectedRegion) throw new Error(`Region ${regionId} is not configured for ${deploymentId}`);
export const region = selectedRegion;
export const regionName = (language: string) => language.startsWith('hi') ? region.name.hi : region.name.en;
