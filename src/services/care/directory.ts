import { z } from 'zod';
import dehradun from '../../../configs/care/dehradun.v1.json';
import { region } from '@/config/deployment';
import type { HealthcareService } from '../contracts';
const facilitySchema = z.object({
  id: z.string(), name: z.string(), facilityType: z.enum(['hospital','clinic','government_health_centre','diagnostic_lab','mental_health_service']),
  specialties: z.array(z.string()), address: z.string(), isGovernment: z.boolean(), isVerified: z.boolean(),
  affiliation: z.string().optional(), sourceUrl: z.url().optional(), verifiedAt: z.string().optional(),
  directionsUrl: z.url().optional(), website: z.url().optional(), phone: z.string().optional(),
  department: z.string().optional(), qualifications: z.string().optional(),
  latitude: z.number().optional(), longitude: z.number().optional(), distanceKm: z.number().nonnegative().optional(),
});
const directories: Record<string, unknown> = { 'dehradun-v1': dehradun };
const schema = z.object({ facilities: z.array(facilitySchema) });
export const directoryService: HealthcareService = {
  async listFacilities() {
    const raw = directories[region.directoryId];
    // Unknown regions/providers never silently return a different city's directory.
    return schema.parse(raw).facilities;
  },
};
