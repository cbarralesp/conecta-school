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
  evaluationType: 'NUMERICA' | 'CONCEPTUAL';
}

export type GradeRegistrationType = 'SUMATIVA' | 'PROCESO' | 'DIAGNOSTICA';

export interface GradeEvaluationHeader {
  id: number;
  code: string;
  name: string;
  order: number;
  weight?: number | null;
  evaluationDate?: string | null;
  registrationType: GradeRegistrationType;
}

export interface GradeScoreCell {
  evaluationId: number;
  code: string;
  score: number | null;
  conceptCode: string | null;
  percentage: number | null;
  registrationType: GradeRegistrationType;
}

export interface GradeBookStudentRow {
  studentId: number;
  run: string;
  fullName: string;
  scores: GradeScoreCell[];
  average: number | null;
  status: string;
  conceptSummaryCode: string | null;
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
  subjectEvaluationType: 'NUMERICA' | 'CONCEPTUAL';
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
  evaluationType: 'NUMERICA' | 'CONCEPTUAL';
  conceptSummaryCode: string | null;
}

export interface StudentGradeCard {
  studentId: number;
  run: string;
  fullName: string;
  overallAverage: number | null;
  attendancePercentage?: number | null;
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

export type PedagogicalAnswer = 'SI' | 'NO' | 'EP';

export interface PedagogicalReportItem {
  questionId: number | null;
  label: string;
  answer: PedagogicalAnswer;
  achieved?: boolean | null;
}

export interface PedagogicalReportArea {
  key: string;
  title: string;
  icon: string;
  accentColor: string;
  iconColor: string;
  items: PedagogicalReportItem[];
  observation: string;
}

export interface PedagogicalReportContent {
  documentTitle: string;
  educatorName: string;
  developmentAreas: PedagogicalReportArea[];
  attitudeArea: PedagogicalReportArea | null;
  familyRecommendations: string[];
  teacherSignatureName: string;
  guardianSignatureLabel: string;
}

export interface PedagogicalReportView {
  courseId: number;
  courseName: string;
  periodId: number;
  periodName: string;
  studentId: number;
  studentRun: string;
  studentName: string;
  schoolYear: number;
  levelCode: 'PREKINDER' | 'KINDER' | 'GENERAL';
  levelLabel: string;
  content: PedagogicalReportContent;
}

export interface PedagogicalQuestionBankQuestion {
  id: number;
  label: string;
  sortOrder: number;
}

export interface PedagogicalQuestionBankArea {
  key: string;
  title: string;
  questionKind: 'AREA' | 'RECOMMENDATION';
  questions: PedagogicalQuestionBankQuestion[];
}

export interface SavePedagogicalReportPayload {
  courseId: number;
  periodId: number;
  studentId: number;
  content: PedagogicalReportContent;
}

export interface GradeSaveEntryPayload {
  studentId: number;
  evaluationId: number;
  score: number | null;
  conceptCode: string | null;
  percentage: number | null;
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
  registrationType: GradeRegistrationType;
}
