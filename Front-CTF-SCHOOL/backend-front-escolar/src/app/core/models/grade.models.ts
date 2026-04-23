export interface GradeCourseOption {
  id: number;
  name: string;
  schoolYear: number;
}

export interface GradePeriodOption {
  id: number;
  name: string;
  schoolYear: number;
  semester: number;
}

export interface GradeCatalog {
  courses: GradeCourseOption[];
  periods: GradePeriodOption[];
}

export interface GradeSubjectTab {
  id: number;
  name: string;
  colorHex: string;
}

export interface GradeEvaluationHeader {
  id: number;
  code: string;
  name: string;
  order: number;
  weight?: number | null;
  evaluationDate?: string | null;
}

export interface GradeScoreCell {
  evaluationId: number;
  code: string;
  score: number | null;
}

export interface GradeBookStudentRow {
  studentId: number;
  run: string;
  fullName: string;
  scores: GradeScoreCell[];
  average: number | null;
  status: string;
}

export interface GradeBookSummary {
  courseAverage: number | null;
  aboveMinimumCount: number;
  belowMinimumCount: number;
  ungradedCount: number;
}

export interface GradeBookView {
  courseId: number;
  courseName: string;
  periodId: number;
  periodName: string;
  subjectId: number;
  subjectName: string;
  summary: GradeBookSummary;
  subjects: GradeSubjectTab[];
  evaluations: GradeEvaluationHeader[];
  students: GradeBookStudentRow[];
}

export interface StudentSubjectAverage {
  subjectId: number;
  subjectName: string;
  colorHex: string;
  average: number | null;
}

export interface StudentGradeCard {
  studentId: number;
  run: string;
  fullName: string;
  overallAverage: number | null;
  status: string;
  subjects: StudentSubjectAverage[];
}

export interface StudentGradeProfileView {
  courseId: number;
  courseName: string;
  periodId: number;
  periodName: string;
  students: StudentGradeCard[];
}

export interface GradeReportView {
  courseId: number;
  courseName: string;
  periodId: number;
  periodName: string;
  students: StudentGradeCard[];
}

export interface GradeSaveEntryPayload {
  studentId: number;
  evaluationId: number;
  score: number | null;
}

export interface SaveGradeBookPayload {
  courseId: number;
  periodId: number;
  subjectId: number;
  entries: GradeSaveEntryPayload[];
}

export interface GradeEvaluationPayload {
  courseId: number;
  periodId: number;
  subjectId: number;
  code: string;
  name: string;
  weight: number | null;
  evaluationDate: string | null;
}
