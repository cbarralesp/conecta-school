export const CHILEAN_COURSE_LEVELS = [
  'Prekinder',
  'Kinder',
  '1 Basico',
  '2 Basico',
  '3 Basico',
  '4 Basico',
  '5 Basico',
  '6 Basico',
  '7 Basico',
  '8 Basico',
  '1 Medio',
  '2 Medio',
  '3 Medio',
  '4 Medio'
] as const;

const COURSE_LEVEL_ORDER = new Map(CHILEAN_COURSE_LEVELS.map((level, index) => [level.toUpperCase(), index]));

const COURSE_LEVEL_LABELS = new Map<string, string>([
  ['INICIAL', 'Inicial'],
  ['BASICO', 'Básico'],
  ['BÁSICO', 'Básico'],
  ['MEDIO', 'Medio'],
  ['PREKINDER', 'Prekínder'],
  ['KINDER', 'Kínder'],
  ['1 BASICO', '1 Básico'],
  ['2 BASICO', '2 Básico'],
  ['3 BASICO', '3 Básico'],
  ['4 BASICO', '4 Básico'],
  ['5 BASICO', '5 Básico'],
  ['6 BASICO', '6 Básico'],
  ['7 BASICO', '7 Básico'],
  ['8 BASICO', '8 Básico'],
  ['1 MEDIO', '1 Medio'],
  ['2 MEDIO', '2 Medio'],
  ['3 MEDIO', '3 Medio'],
  ['4 MEDIO', '4 Medio']
]);

const SCHEDULE_LABELS = new Map<string, string>([
  ['MANANA', 'Mañana'],
  ['MAÑANA', 'Mañana'],
  ['TARDE', 'Tarde'],
  ['COMPLETA', 'Completa']
]);

export function courseLevelSortWeight(level: string): number {
  return COURSE_LEVEL_ORDER.get(level.trim().toUpperCase()) ?? Number.MAX_SAFE_INTEGER;
}

export function formatCourseLevelLabel(level: string): string {
  const normalized = (level || '').trim().toUpperCase();
  return COURSE_LEVEL_LABELS.get(normalized) ?? (level || '').trim();
}

export function formatScheduleLabel(schedule: string): string {
  const normalized = (schedule || '').trim().toUpperCase();
  return SCHEDULE_LABELS.get(normalized) ?? (schedule || '').trim();
}

export function normalizeCourseDisplayName(name: string, letter: string): string {
  const normalizedName = formatCourseLevelLabel((name || '').trim());
  const normalizedLetter = (letter || '').trim().toUpperCase();

  if (!normalizedLetter) {
    return normalizedName;
  }

  if (normalizedName.toUpperCase().endsWith(` ${normalizedLetter}`)) {
    return normalizedName;
  }

  return `${normalizedName} ${normalizedLetter}`.trim();
}
