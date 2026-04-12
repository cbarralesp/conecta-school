import { Subject } from './subject.models';

export interface ScheduleCourseOption {
  id: number;
  code: string;
  name: string;
  schoolYear: number;
  scheduleType: string;
}

export interface ScheduleTeacherOption {
  id: number;
  code: string;
  fullName: string;
  specialty: string;
}

export interface ScheduleBlock {
  id: number;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  order: number;
  blockType: string;
}

export interface ScheduleEntry {
  id: number;
  loadId: number;
  courseId: number;
  courseName: string;
  teacherId: number;
  teacherCode: string;
  teacherFullName: string;
  subjectId: number;
  subjectCode: string;
  subjectName: string;
  subjectColorHex: string;
  blockId: number;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  order: number;
  blockType: string;
  room: string | null;
}

export interface ScheduleCatalog {
  courses: ScheduleCourseOption[];
  teachers: ScheduleTeacherOption[];
  subjects: Subject[];
  blocks: ScheduleBlock[];
}

export interface SchedulePayload {
  courseId: number;
  subjectId: number;
  teacherId: number;
  blockId: number;
  room: string | null;
}
