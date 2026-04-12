export interface Course {
  id: number;
  code: string;
  name: string;
  level: string;
  letter: string;
  schoolYear: number;
  scheduleType: string;
  active: boolean;
}

export interface CoursePayload {
  code: string;
  name: string;
  level: string;
  letter: string;
  schoolYear: number;
  scheduleType: string;
}

export interface MasterCourse {
  id: number;
  code: string;
  description: string;
}

export interface TeacherCatalogItem {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  rud: string;
  address: string;
  email: string;
  subjects: string[];
}

export interface StudentCatalogItem {
  id: number;
  run: string;
  firstName: string;
  lastName: string;
  fullName: string;
  address: string;
  birthDate: string;
  age: number;
}

export interface CreateCourseFromMasterPayload {
  masterCourseId: number;
  schoolYear: number;
  scheduleType: string;
  teacherId: number;
  assistantId: number | null;
  studentIds: number[];
}

export interface CourseSchedule {
  id: number;
  courseId: number;
  courseName: string;
  teacherFullName: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
}
