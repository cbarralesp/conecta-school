import { Subject } from './subject.models';

export type ScheduleBlockType = 'CLASE' | 'RECREO';

export interface ScheduleCourseOption {
  id: number;
  code: string;
  name: string;
  schoolYear: number;
  scheduleType: string;
}

export interface SchedulePeriodOption {
  id: number;
  name: string;
  schoolYear: number;
  semester: number;
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
  blockType: ScheduleBlockType;
}

export interface ScheduleEntry {
  id: number;
  loadId: number;
  periodId: number;
  periodName: string;
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
  blockType: ScheduleBlockType;
  room: string | null;
}

export interface ScheduleCatalog {
  courses: ScheduleCourseOption[];
  periods: SchedulePeriodOption[];
  teachers: ScheduleTeacherOption[];
  subjects: Subject[];
  blocks: ScheduleBlock[];
}

export interface SchedulePayload {
  periodId: number;
  courseId: number;
  subjectId: number;
  teacherId: number;
  blockId: number;
  room: string | null;
}

export interface ScheduleRowTimePayload {
  startTime: string;
  endTime: string;
}

export interface ScheduleBlockCreatePayload extends ScheduleRowTimePayload {
  blockType: ScheduleBlockType;
}
