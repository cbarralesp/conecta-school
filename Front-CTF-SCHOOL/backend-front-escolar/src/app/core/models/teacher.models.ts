import { Subject } from './subject.models';

export interface TeacherSummary {
  totalTeachers: number;
  activeTeachers: number;
  subjectCount: number;
  fullTimeTeachers: number;
}

export interface TeacherListItem {
  id: number;
  teacherCode: string;
  fullName: string;
  run: string;
  professionalTitle: string;
  contractType: string;
  weeklyHours: number;
  employmentStatus: string;
  active: boolean;
  subjects: Subject[];
  assignedCourses: string[];
}

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

export interface TeacherEmergencyContact {
  id: number | null;
  fullName: string;
  relation: string;
  phone: string;
}

export interface TeacherDetail {
  id: number;
  teacherCode: string;
  firstNames: string;
  paternalLastName: string;
  maternalLastName: string;
  fullName: string;
  run: string;
  birthDate: string;
  gender: string;
  phone: string;
  institutionalEmail: string;
  regionId: number | null;
  communeId: number | null;
  address: string;
  professionalTitle: string;
  contractType: string;
  weeklyHours: number;
  startDate: string;
  employmentStatus: string;
  active: boolean;
  subjects: Subject[];
  assignedCourses: TeacherAssignedCourse[];
  weeklySchedule: TeacherScheduleItem[];
  emergencyContact: TeacherEmergencyContact;
}

export interface TeacherOverview {
  summary: TeacherSummary;
  subjects: Subject[];
  teachers: TeacherListItem[];
}

export interface TeacherPayload {
  firstNames: string;
  paternalLastName: string;
  maternalLastName: string;
  run: string;
  birthDate: string;
  gender: string;
  phone: string;
  institutionalEmail: string;
  regionId: number | null;
  communeId: number | null;
  address: string;
  professionalTitle: string;
  contractType: string;
  weeklyHours: number;
  startDate: string;
  employmentStatus: string;
  subjectIds: number[];
  courseIds: number[];
  emergencyContactName: string;
  emergencyContactRelation: string;
  emergencyContactPhone: string;
}
