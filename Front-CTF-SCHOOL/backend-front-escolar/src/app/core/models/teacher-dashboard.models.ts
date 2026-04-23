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

export interface TeacherPlanningItem {
  id: number;
  title: string;
  unit: string;
  learningObjective: string;
  status: string;
  classDate: string;
  courseName: string;
  subjectName: string;
  resources: string;
  activities: string;
  evaluation: string;
  observations: string;
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
  planningItems: TeacherPlanningItem[];
}

export interface TeacherPlanningDetail {
  id: number;
  title: string;
  unit: string;
  learningObjective: string;
  status: string;
  classDate: string;
  courseName: string;
  subjectName: string;
  teacherName: string;
  resources: string;
  activities: string;
  evaluation: string;
  observations: string;
}

export interface TeacherPlanningUpdateRequest {
  title: string;
  unit: string;
  learningObjective: string;
  status: string;
  classDate: string;
  resources: string;
  activities: string;
  evaluation: string;
  observations: string;
}
