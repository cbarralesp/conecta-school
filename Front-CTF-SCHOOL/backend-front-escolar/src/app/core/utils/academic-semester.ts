export function resolveCurrentAcademicSemester(date: Date = new Date()): 1 | 2 {
  return date.getMonth() + 1 >= 7 ? 2 : 1;
}
