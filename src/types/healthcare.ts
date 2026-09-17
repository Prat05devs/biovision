export type FacilityType =
  | 'hospital'
  | 'clinic'
  | 'government_health_centre'
  | 'diagnostic_lab'
  | 'mental_health_service';

export type HealthcareFacility = {
  sourceUrl?: string;
  verifiedAt?: string;
  affiliation?: string;
  /** Hospital department and qualifications as published on the hospital's site. */
  department?: string;
  qualifications?: string;
  id: string;
  name: string;
  facilityType: FacilityType;
  specialties: string[];
  address: string;
  latitude?: number;
  longitude?: number;
  distanceKm?: number;
  phone?: string;
  website?: string;
  directionsUrl?: string;
  isGovernment: boolean;
  isVerified: boolean;
};

