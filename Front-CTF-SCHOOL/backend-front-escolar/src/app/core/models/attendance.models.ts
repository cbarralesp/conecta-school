export interface AttendanceCourseOption {
  id: number;
  name: string;
  schoolYear: number;
}

export interface AttendanceCatalog {
  courses: AttendanceCourseOption[];
}

export interface DailyAttendanceStudent {
  studentId: number;
  run: string;
  fullName: string;
  status: string;
  arrivalTime: string | null;
  note: string | null;
}

export interface DailyAttendanceView {
  courseId: number;
  courseName: string;
  date: string;
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
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

export interface WeeklyAttendanceView {
  courseId: number;
  courseName: string;
  weekLabel: string;
  dates: string[];
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
}

export interface MonthlyAttendanceView {
  courseId: number;
  courseName: string;
  monthLabel: string;
  schoolDays: number;
  averageAttendance: number;
  studentsAtRisk: number;
  totalLate: number;
  students: MonthlyAttendanceStudent[];
}
