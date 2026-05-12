export interface Course {
  id: number;
  code: string;
  name: string;
  level: string;
  letter: string;
  schoolYear: number;
  scheduleType: string;
  teacherId?: number | null;
  teacherName?: string | null;
  assistantId?: number | null;
  assistantName?: string | null;
  active: boolean;
  studentCount: number;
}

export interface CoursePayload {
  code: string;
  name: string;
  level: string;
  letter: string;
  schoolYear: number;
  scheduleType: string;
  teacherId?: number | null;
  assistantId?: number | null;
  studentIds?: number[];
}

export interface MasterCourse {
  id: number;
  code: string;
  description: string;
  level: string;
  codeToken: string;
  sortOrder: number;
}

export interface TeacherCatalogItem {
  id: number;
  staffType: string;
  firstName: string;
  lastName: string;
  fullName: string;
  rud: string;
  address: string;
  regionId: number | null;
  communeId: number | null;
  regionName: string;
  communeName: string;
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
  regionId: number | null;
  communeId: number | null;
  regionName: string;
  communeName: string;
  birthDate: string;
  age: number;
}

export interface CreateCourseFromMasterPayload {
  masterCourseId: number;
  parallel: string;
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
