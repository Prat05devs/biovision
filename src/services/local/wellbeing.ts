import type { ObservationService, WellbeingService } from '@/services/contracts';
import * as signEngine from '@/services/observations/signEngine';
import * as wellbeingScreen from '@/services/wellbeing/screenEngine';

/** Published screening questionnaires scored on the device with the same engine the API uses. */
export const localWellbeingService: WellbeingService = {
  async getScreen() {
    return wellbeingScreen.screenMetadata();
  },
  async nextQuestion(answers) {
    const step = wellbeingScreen.nextQuestion(answers);
    const answered = Object.keys(answers).length;
    return {
      ...step,
      answeredCount: answered,
      unlockedCount: step.done ? answered : answered + 1,
      screenVersion: wellbeingScreen.SCREEN_VERSION,
    };
  },
  async assess(answers) {
    return wellbeingScreen.assess(answers);
  },
};

export const localObservationService: ObservationService = {
  async getSigns() {
    return signEngine.catalogue();
  },
  async getProfile({ confirmedSigns, answers }) {
    return signEngine.profile(confirmedSigns, answers);
  },
};
