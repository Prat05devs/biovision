/** Evidence-informed navigation, not a validated clinical score or image inference. */
export const healthVersion = 'general-health-v1';
export type HealthAnswers = Record<string, string>;
export const healthQuestions = [
  { id: 'safety', options: ['none', 'urgent'] },
  { id: 'age', options: ['adult', 'child'] },
  { id: 'concern', options: ['routine', 'energy', 'breathing', 'skin', 'pain', 'mood', 'other'] },
  { id: 'duration', options: ['days', 'weeks', 'months'], whenConcern: true },
  { id: 'impact', options: ['manageable', 'disrupting', 'worsening'], whenConcern: true },
  { id: 'sleep', options: ['rested', 'unrested', 'unknown'] },
  { id: 'movement', options: ['regular', 'little', 'limited', 'unknown'] },
  { id: 'food', options: ['varied', 'irregular', 'access', 'unknown'] },
  { id: 'stress', options: ['manageable', 'difficult', 'unknown'] },
  { id: 'exposure', options: ['none', 'smoke', 'outdoor', 'unknown'] },
  { id: 'history', options: ['none', 'condition', 'medicines', 'both', 'unknown'] },
  { id: 'priority', options: ['habits', 'doctor', 'support', 'unknown'] },
] as const;
export function visibleHealthQuestions(a: HealthAnswers) {
  return healthQuestions.filter(q => !('whenConcern' in q) || (!!a.concern && a.concern !== 'routine'));
}
export function updateHealthAnswer(a: HealthAnswers, id: string, value: string): HealthAnswers {
  const question = healthQuestions.find(q => q.id === id);
  if (!question || !(question.options as readonly string[]).includes(value)) throw new Error('Invalid health answer');
  const next = { ...a, [id]: value };
  if (id === 'concern' && value === 'routine') { delete next.duration; delete next.impact; }
  return next;
}
export function buildHealthPlan(a: HealthAnswers) {
  const urgent = a.safety === 'urgent';
  const questions = visibleHealthQuestions(a);
  const complete = questions.every(q => (q.options as readonly string[]).includes(a[q.id] ?? ''));
  const hasConcern = !!a.concern && a.concern !== 'routine';
  const prompt = hasConcern && (a.impact === 'worsening' || a.concern === 'breathing');
  const followUp = hasConcern || a.age === 'child' || ['condition', 'medicines', 'both'].includes(a.history ?? '') || a.priority === 'doctor';
  const level = urgent ? 'urgent' : !complete ? 'incomplete' : prompt ? 'prompt' : followUp ? 'appointment' : 'routine';
  const actions = [
    a.sleep === 'unrested' ? 'sleep' : undefined,
    ['little', 'limited'].includes(a.movement ?? '') ? 'movement' : undefined,
    ['irregular', 'access'].includes(a.food ?? '') ? 'food' : undefined,
    a.stress === 'difficult' || a.concern === 'mood' ? 'stress' : undefined,
    ['smoke', 'outdoor'].includes(a.exposure ?? '') ? 'exposure' : undefined,
    ['condition', 'medicines', 'both'].includes(a.history ?? '') ? 'medicines' : undefined,
  ].filter((x): x is string => !!x);
  if (!actions.length) actions.push('maintain');
  // Primary care is a useful first contact; specialty navigation is a choice, not a diagnosis.
  const specialty = a.age === 'child' ? 'paediatrics' : a.concern === 'skin' ? 'dermatology' : a.concern === 'mood' ? 'psychiatry' : a.concern === 'breathing' ? 'pulmonology' : 'generalPhysician';
  return { level, complete, urgent, actions, specialty, answered: questions.filter(q => a[q.id]).length, total: questions.length };
}
export const healthSources = [
  { name: 'WHO · heat and health', url: 'https://www.who.int/news-room/fact-sheets/detail/climate-change-heat-and-health' },
  { name: 'NHS · tiredness and fatigue', url: 'https://www.nhs.uk/symptoms/tiredness-and-fatigue/' },
  { name: 'NHS · breathing symptoms', url: 'https://www.nhs.uk/symptoms/shortness-of-breath/' },
  { name: 'WHO · healthy diet', url: 'https://www.who.int/news-room/fact-sheets/detail/healthy-diet' },
  { name: 'WHO · physical activity', url: 'https://www.who.int/news-room/fact-sheets/detail/physical-activity' },
  { name: 'India · emergency assistance 112', url: 'https://112.gov.in/' },
];
