import { directoryService } from './care/directory';
import { localAssessmentService } from './local/assessment';
import { eyeScreeningService } from './local/eyeScreening';
import { localObservationService, localWellbeingService } from './local/wellbeing';

// Questionnaire, wellbeing and face-sign rules run on the device with the same versioned
// configuration as the API. Eye screening runs on the device on iOS and through the API on web.
export const screeningService = eyeScreeningService;
export const assessmentService = localAssessmentService;
export const healthcareService = directoryService;
export const wellbeingService = localWellbeingService;
export const observationService = localObservationService;
