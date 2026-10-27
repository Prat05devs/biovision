import { localAssessmentService } from './assessment';
import { AppServiceError } from '@/services/errors';
import { useAssessmentStore } from '@/store/assessment.store';
import type { ScreeningProfile } from '@/types/assessment';

/**
 * The camera-free check is the same questionnaire as the scan, minus the face scan and eye
 * photos: the same profile decides which questions apply, and the same report follows. This
 * records the choice and loads the first question, as the scan's processing step does once the
 * eye photos are analysed.
 */
export async function startQuestionsWithoutCamera(profile: ScreeningProfile) {
  const store = useAssessmentStore.getState();
  store.setCameraSkipped();
  const first = await localAssessmentService.nextQuestion({
    sessionId: store.session.id,
    anemiaSignal: 'unavailable',
    answers: {},
    profile,
  });
  if (!first.question) throw new AppServiceError('INVALID_RESPONSE', 'No assessment question was returned.');
  store.setQuestions([first.question], first.configVersion);
}
