export interface AttendanceCourseOption {
  id: number;
  name: string;
  schoolYear: number;
}

export interface AttendanceCatalog {
  courses: AttendanceCourseOption[];
}

export interface AttendanceStudentSummary {
  studentId: number;
  percentage: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  totalRecords: number;
}

export interface DailyAttendanceStudent {
  studentId: number;
  run: string;
  fullName: string;
  status: string;
  arrivalTime: string | null;
  note: string | null;
}

export interface DailyAttendanceSummary {
  markedCount: number;
  progressPercent: number;
  presentPercentage: number;
  absentPercentage: number;
  latePercentage: number;
}

export interface DailyAttendanceView {
  courseId: number;
  courseName: string;
  date: string;
  classSuspended: boolean;
  suspensionMessage: string | null;
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  summary: DailyAttendanceSummary;
  students: DailyAttendanceStudent[];
}

export interface DailyAttendanceEntryPayload {
  studentId: number;
  status: string;
  arrivalTime: string | null;
  note: string | null;
}

export interface SaveDailyAttendancePayload {
  courseId: number;
  date: string;
  classSuspended?: boolean;
  suspensionReason?: string | null;
  entries: DailyAttendanceEntryPayload[];
}

export interface WeeklyAttendanceDay {
  date: string;
  status: string;
}

export interface WeeklyAttendanceStudent {
  studentId: number;
  run: string;
  fullName: string;
  days: WeeklyAttendanceDay[];
  attendancePercentage: number;
  statusBadge: string;
  absences: number;
  lateCount: number;
}

export interface AttendanceAlert {
  level: string;
  studentName: string;
  message: string;
}

export interface WeeklyAttendanceSummary {
  averageAttendance: number;
  totalAbsences: number;
  totalLate: number;
  activeAlerts: number;
}

export interface WeeklyAttendanceView {
  courseId: number;
  courseName: string;
  weekLabel: string;
  dates: string[];
  summary: WeeklyAttendanceSummary;
  students: WeeklyAttendanceStudent[];
  alerts: AttendanceAlert[];
}

export interface MonthlyAttendanceStudent {
  studentId: number;
  run: string;
  fullName: string;
  presentPercentage: number;
  absentPercentage: number;
  latePercentage: number;
  riskStatus: string;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  days: MonthlyAttendanceStudentDay[];
}

export interface MonthlyAttendanceStudentDay {
  date: string;
  status: string;
}

export interface MonthlyAttendanceDistribution {
  presentCount: number;
  presentPercentage: number;
  absentCount: number;
  absentPercentage: number;
  lateCount: number;
  latePercentage: number;
}

export interface MonthlyAttendanceDaySummary {
  dayLabel: string;
  attendancePercentage: number;
}

export interface MonthlyAttendanceSpecialDate {
  date: string;
  type: 'VACACIONES' | 'FERIADO' | 'INTERFERIADO' | 'SUSPENSION';
  label: string;
}

export interface MonthlyAttendanceView {
  courseId: number;
  courseName: string;
  monthLabel: string;
  schoolDays: number;
  averageAttendance: number;
  studentsAtRisk: number;
  totalLate: number;
  distribution: MonthlyAttendanceDistribution;
  dailySummary: MonthlyAttendanceDaySummary[];
  suspendedDates: string[];
  specialDates: MonthlyAttendanceSpecialDate[];
  students: MonthlyAttendanceStudent[];
}
