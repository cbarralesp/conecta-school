export interface StudentEnrolledCourse {
  id: number;
  courseName: string;
  courseCode: string;
  status: string;
}

export interface StudentSubjectSummary {
  subjectName: string;
  courseName: string;
  weeklyBlocks: number;
}

export interface StudentPortalSubject {
  subjectId: number;
  subjectName: string;
  courseName: string;
  weeklyBlocks: number;
  teacherName: string;
  totalDocuments: number;
  newDocuments: number;
}

export interface StudentDocumentTypeFilter {
  code: 'TODOS' | 'PDF' | 'WORD' | 'PPT' | 'IMAGEN';
  label: string;
  count: number;
}

export interface StudentSubjectDocumentItem {
  documentId: number;
  fileName: string;
  fileType: 'PDF' | 'WORD' | 'PPT' | 'IMAGEN' | 'OTRO';
  fileSizeBytes: number;
  fileSizeLabel: string;
  metaLabel: string;
  publishedAt: string;
  isNew: boolean;
  reviewed: boolean;
  downloadUrl: string;
  previewUrl: string;
}

export interface StudentSubjectClassItem {
  classId: number | null;
  classTitle: string;
  classDate: string;
  hasNewDocuments: boolean;
  documents: StudentSubjectDocumentItem[];
}

export interface StudentSubjectUnitItem {
  unitId: number;
  unitNumber: string;
  unitName: string;
  totalClasses: number;
  totalDocuments: number;
  durationWeeks: number;
  progressPercent: number;
  classes: StudentSubjectClassItem[];
}

export interface StudentSubjectHeader {
  subjectId: number;
  subjectName: string;
  courseName: string;
  semesterLabel: string;
  teacherName: string;
  weeklyBlocks: number;
}

export interface StudentSubjectDocumentMetrics {
  totalDocuments: number;
  reviewedDocuments: number;
  newDocuments: number;
}

export interface StudentSubjectDocumentsResponse {
  subject: StudentSubjectHeader;
  metrics: StudentSubjectDocumentMetrics;
  filters: StudentDocumentTypeFilter[];
  units: StudentSubjectUnitItem[];
}

export interface StudentScheduleItem {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  courseName: string;
  subjectName: string;
  room: string;
}

export interface StudentLatestGrade {
  subjectName: string;
  evaluationName: string;
  score: number | null;
  periodName: string;
  recordedAt: string;
}

export interface StudentGradeEvaluation {
  evaluationName: string;
  score: number | null;
  periodName: string;
  recordedAt: string;
}

export interface StudentSubjectGradeSummary {
  subjectName: string;
  average: number | null;
  latestScore: number | null;
  evaluations: StudentGradeEvaluation[];
}

export interface StudentAttendanceSummary {
  percentage: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  totalRecords: number;
}

export interface StudentAttendanceHeader {
  studentId: number;
  studentName: string;
  courseName: string;
  periodLabel: string;
}

export interface StudentAttendanceMonthSummary {
  monthLabel: string;
  attendancePercentage: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  recordedDays: number;
}

export interface StudentAttendanceWeekDay {
  date: string;
  dayLabel: string;
  status: string;
  today: boolean;
}

export interface StudentAttendanceRecord {
  date: string;
  status: string;
  timeLabel: string;
  note: string;
}

export interface StudentAttendanceDetail {
  header: StudentAttendanceHeader;
  summary: StudentAttendanceSummary;
  currentMonth: StudentAttendanceMonthSummary;
  currentWeek: StudentAttendanceWeekDay[];
  recentRecords: StudentAttendanceRecord[];
}

export interface StudentUpcomingActivity {
  id: number;
  title: string;
  activityTypeName: string;
  date: string;
  location: string;
}

export interface StudentDashboard {
  studentId: number;
  studentName: string;
  studentRun: string;
  enrolledCoursesCount: number;
  attendancePercentage: number;
  latestGradesCount: number;
  upcomingActivitiesCount: number;
  enrolledCourses: StudentEnrolledCourse[];
  subjects: StudentSubjectSummary[];
  weeklySchedule: StudentScheduleItem[];
  latestGrades: StudentLatestGrade[];
  gradeSummary: StudentSubjectGradeSummary[];
  attendanceSummary: StudentAttendanceSummary;
  upcomingActivities: StudentUpcomingActivity[];
}
