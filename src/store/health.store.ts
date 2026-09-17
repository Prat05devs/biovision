import { create } from 'zustand';
import { updateHealthAnswer, type HealthAnswers } from '@/services/health/check';
// Health answers stay on this device in memory; never persisted or uploaded.
export const useHealthStore = create<{
  answers: HealthAnswers; completedAt?: string;
  answer: (id: string, value: string) => void;
  complete: () => void; reset: () => void;
}>((set) => ({
  answers: {},
  answer: (id, value) => set(s => ({ answers: updateHealthAnswer(s.answers, id, value), completedAt: undefined })),
  complete: () => set({ completedAt: new Date().toISOString() }),
  reset: () => set({ answers: {}, completedAt: undefined }),
}));
