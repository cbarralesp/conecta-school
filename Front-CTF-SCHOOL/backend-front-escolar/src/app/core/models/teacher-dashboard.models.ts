export interface TeacherAssignedCourse {
  id: number;
  courseName: string;
  courseCode: string;
  subjectName: string;
  colorHex: string;
  weeklyHours: number;
  homeroomTeacher: boolean;
}

export interface TeacherScheduleItem {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  courseName: string;
  subjectName: string;
  room: string;
}

export interface TeacherDashboard {
  teacherCode: string;
  teacherName: string;
  specialty: string;
  assignedCoursesCount: number;
  plannedClassesCount: number;
  pendingPlanningCount: number;
  assignedCourses: TeacherAssignedCourse[];
  weeklySchedule: TeacherScheduleItem[];
  todaySchedulePreview: TeacherScheduleItem[];
}
